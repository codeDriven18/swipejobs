using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Ingestion;
using SwipeJobs.Application.Modules.Ingestion.Interfaces;
using SwipeJobs.Application.Modules.Ingestion.Models;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

public class IngestionPipelineService
{
    private readonly IIngestionMessageRepository _messageRepository;
    private readonly IJobCandidateRepository _candidateRepository;
    private readonly ISourceRepository _sourceRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAiExtractionService _aiExtractionService;
    private readonly IJobPreviewService _jobPreviewService;
    private readonly JobNormalizer _normalizer;
    private readonly JobQualityScoringService _qualityScoring;
    private readonly ISourceIngestionLogger _ingestionLogger;
    private readonly ILogger<IngestionPipelineService> _logger;

    public IngestionPipelineService(
        IIngestionMessageRepository messageRepository,
        IJobCandidateRepository candidateRepository,
        ISourceRepository sourceRepository,
        IUnitOfWork unitOfWork,
        IAiExtractionService aiExtractionService,
        IJobPreviewService jobPreviewService,
        JobNormalizer normalizer,
        JobQualityScoringService qualityScoring,
        ISourceIngestionLogger ingestionLogger,
        ILogger<IngestionPipelineService> logger)
    {
        _messageRepository = messageRepository;
        _candidateRepository = candidateRepository;
        _sourceRepository = sourceRepository;
        _unitOfWork = unitOfWork;
        _aiExtractionService = aiExtractionService;
        _jobPreviewService = jobPreviewService;
        _normalizer = normalizer;
        _qualityScoring = qualityScoring;
        _ingestionLogger = ingestionLogger;
        _logger = logger;
    }

    public async Task<(JobCandidate Candidate, bool IsDuplicate)> ProcessTelegramMessageAsync(
        TelegramIngestMessageDto dto,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var source = await _sourceRepository.GetByIdAsync(dto.SourceId, cancellationToken)
            ?? throw new IngestionPipelineException(
                IngestionErrorCodes.SourceNotFound,
                "Source not found.");

        await Log(source.Id, "start", "Info",
            $"Ingestion started for message {dto.TelegramMessageId}",
            $"sourceUrl={source.ChannelUrl}; channel={source.ChannelName ?? dto.ChannelName}",
            cancellationToken);

        if (!source.IngestionEnabled)
        {
            await MarkSourceFailure(source, "Disabled", "Ingestion is disabled for this source.", cancellationToken);
            throw new IngestionPipelineException(
                IngestionErrorCodes.IngestionDisabled,
                "Ingestion is disabled for this source.");
        }

        if (string.IsNullOrWhiteSpace(dto.TelegramMessageId))
        {
            throw new IngestionPipelineException(
                IngestionErrorCodes.InvalidTelegramMessageId,
                "Telegram message ID is required.");
        }

        if (source.Type == SourceType.Telegram && string.IsNullOrWhiteSpace(source.ChannelUrl) && string.IsNullOrWhiteSpace(dto.ChannelUrl))
        {
            await MarkSourceFailure(source, "Missing URL", "Telegram channel URL is not configured.", cancellationToken);
            throw new IngestionPipelineException(
                IngestionErrorCodes.ChannelNotFound,
                "Telegram channel URL is not configured for this source.");
        }

        var externalKey = $"telegram:{dto.TelegramMessageId}";
        var existingMessage = await _messageRepository.GetByExternalKeyAsync(dto.SourceId, externalKey, cancellationToken);
        if (existingMessage?.CandidateLinks.FirstOrDefault()?.JobCandidate is { } linkedCandidate)
        {
            await Log(source.Id, "dedupe", "Info", "Message already ingested.", externalKey, cancellationToken);
            return (linkedCandidate, true);
        }

        IngestionMessage message;
        if (existingMessage is not null)
        {
            message = existingMessage;
            message.Status = IngestionMessageStatus.Processing;
            message.ProcessingError = null;
            message.RawMessageText = dto.RawMessageText;
            message.TelegramMessageUrl = dto.TelegramMessageUrl ?? message.TelegramMessageUrl;
            message.ChannelName = dto.ChannelName ?? source.ChannelName ?? message.ChannelName;
            message.ChannelUrl = dto.ChannelUrl ?? source.ChannelUrl ?? message.ChannelUrl;
            message.PostedAt = dto.PostedAt ?? message.PostedAt;
            message.RawMediaUrlsJson = dto.RawMediaUrls is { Count: > 0 }
                ? JsonSerializer.Serialize(dto.RawMediaUrls)
                : message.RawMediaUrlsJson;
            await _messageRepository.UpdateAsync(message, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await Log(source.Id, "retry", "Info", "Retrying failed message ingestion.", externalKey, cancellationToken);
        }
        else
        {
            message = new IngestionMessage
            {
                SourceId = dto.SourceId,
                ExternalSourceKey = externalKey,
                TelegramMessageId = dto.TelegramMessageId,
                TelegramMessageUrl = dto.TelegramMessageUrl,
                ChannelName = dto.ChannelName ?? source.ChannelName,
                ChannelUrl = dto.ChannelUrl ?? source.ChannelUrl,
                PostedAt = dto.PostedAt ?? DateTime.UtcNow,
                RawMessageText = dto.RawMessageText,
                RawMediaUrlsJson = dto.RawMediaUrls is { Count: > 0 }
                    ? JsonSerializer.Serialize(dto.RawMediaUrls)
                    : null,
                Status = IngestionMessageStatus.Processing,
            };

            await _messageRepository.AddAsync(message, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await Log(source.Id, "raw-storage", "Info", "Raw message stored.", message.Id.ToString(), cancellationToken);
        }

        try
        {
            await Log(source.Id, "extraction", "Info", "Gemini extraction started.", null, cancellationToken);
            source.LastSyncStatus = "Syncing";
            source.SourceLastCheckedAt = DateTime.UtcNow;
            await _sourceRepository.UpdateAsync(source, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var extractionStarted = stopwatch.ElapsedMilliseconds;
            var aiResponse = await _aiExtractionService.ExtractJobAsync(dto.RawMessageText, cancellationToken);
            var extractionMs = stopwatch.ElapsedMilliseconds - extractionStarted;

            if (!aiResponse.Success || aiResponse.Result is null)
            {
                var error = aiResponse.ErrorMessage ?? "Gemini extraction failed.";
                await Log(source.Id, "extraction", "Error", IngestionErrorSummarizer.ForLog(error), aiResponse.Model, cancellationToken);

                if (aiResponse.IsRateLimited)
                {
                    await Log(source.Id, "extraction", "Warning", "Waiting for AI quota.", aiResponse.Model, cancellationToken);
                    await MarkMessageWaitingForQuota(message, cancellationToken);
                    await MarkSourceWaitingForQuota(source, cancellationToken);
                    throw new IngestionPipelineException(
                        IngestionErrorCodes.GeminiRateLimited,
                        "Waiting for AI quota. Extraction will retry automatically.");
                }

                await MarkMessageFailed(message, IngestionErrorSummarizer.ForDisplay(error), cancellationToken);
                await MarkSourceFailure(source, "Extraction failed", error, cancellationToken);

                throw new IngestionPipelineException(
                    ResolveGeminiErrorCode(error),
                    IngestionErrorSummarizer.ForDisplay(error));
            }

            await Log(
                source.Id,
                "extraction",
                "Info",
                $"Gemini extraction completed in {extractionMs}ms with confidence {aiResponse.Result.Confidence}. Model={aiResponse.Model}",
                aiResponse.ExtractionSource,
                cancellationToken);

            var extracted = AiExtractionMapper.ToJobExtractionResult(aiResponse.Result);
            if (string.IsNullOrWhiteSpace(extracted.Title) && string.IsNullOrWhiteSpace(extracted.Description))
            {
                await MarkMessageFailed(message, "Invalid AI response.", cancellationToken);
                await MarkSourceFailure(source, "Invalid AI response", "AI returned no usable job fields.", cancellationToken);
                throw new IngestionPipelineException(
                    IngestionErrorCodes.InvalidAiResponse,
                    "Gemini returned an invalid or empty job extraction.");
            }

            var normalized = _normalizer.Normalize(extracted);
            var channelHint = dto.ChannelName ?? source.ChannelName ?? source.Name;

            await Log(source.Id, "preview", "Info", "Job preview generation started.", null, cancellationToken);
            var previewStarted = stopwatch.ElapsedMilliseconds;
            var preview = await _jobPreviewService.GenerateAsync(
                normalized,
                channelHint,
                normalized.Confidence,
                cancellationToken);
            var previewMs = stopwatch.ElapsedMilliseconds - previewStarted;
            await Log(
                source.Id,
                "preview",
                "Info",
                $"Job preview completed in {previewMs}ms.",
                preview.DisplayTitle,
                cancellationToken);

            var normalizedForScoring = normalized;
            if (string.IsNullOrWhiteSpace(normalizedForScoring.CompanyName))
                normalizedForScoring = normalizedForScoring with { CompanyName = channelHint };

            var (completeness, trust, spam) = _qualityScoring.Score(normalizedForScoring, source.TrustScore, dto.RawMessageText);

            var fingerprint = JobContentFingerprint.ComputeForCandidate(
                normalizedForScoring.Title,
                normalizedForScoring.CompanyName,
                normalizedForScoring.City ?? normalizedForScoring.Location,
                normalizedForScoring.ApplyUrl);

            var existingCandidate = await _candidateRepository.FindByContentFingerprintAsync(fingerprint, cancellationToken);
            var isDuplicate = existingCandidate is not null &&
                existingCandidate.Status is CandidateJobStatus.PendingReview or CandidateJobStatus.Approved;

            JobCandidate candidate;
            if (isDuplicate && existingCandidate is not null)
            {
                candidate = existingCandidate;
                candidate.MessageLinks.Add(new JobCandidateMessage
                {
                    JobCandidateId = candidate.Id,
                    IngestionMessageId = message.Id,
                    IsPrimary = false,
                });
                await _candidateRepository.UpdateAsync(candidate, cancellationToken);
                await Log(source.Id, "dedupe", "Info", "Linked message to existing candidate.", candidate.Id.ToString(), cancellationToken);
            }
            else
            {
                candidate = new JobCandidate
                {
                    SourceId = dto.SourceId,
                    Status = CandidateJobStatus.PendingReview,
                    DuplicateGroupId = Guid.NewGuid(),
                    ContentFingerprint = fingerprint,
                };
                ApplyExtraction(candidate, normalizedForScoring, completeness, trust, spam);
                ApplyPreview(candidate, preview);
                candidate.MessageLinks.Add(new JobCandidateMessage
                {
                    IngestionMessageId = message.Id,
                    IsPrimary = true,
                });
                await _candidateRepository.AddAsync(candidate, cancellationToken);
                await Log(source.Id, "candidate", "Info", "Candidate job created.", null, cancellationToken);
            }

            message.Status = IngestionMessageStatus.Processed;
            source.SourceLastCheckedAt = DateTime.UtcNow;
            source.LastSyncStatus = "Success";
            source.LastIngestionError = null;
            source.LastSuccessfulIngestionAt = DateTime.UtcNow;
            source.LastScannedTelegramMessageId = dto.TelegramMessageId;
            source.MonitorStatus = SourceMonitorStatus.Active;

            await _sourceRepository.UpdateAsync(source, cancellationToken);
            await _messageRepository.UpdateAsync(message, cancellationToken);

            try
            {
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                await Log(source.Id, "persist", "Error", "Candidate persistence failed.", ex.Message, cancellationToken);
                await MarkSourceFailure(source, "Persistence failed", ex.Message, cancellationToken);
                throw new IngestionPipelineException(
                    IngestionErrorCodes.CandidatePersistenceFailed,
                    "Candidate persistence failed.",
                    ex);
            }

            var loaded = await _candidateRepository.GetByIdWithDetailsAsync(candidate.Id, cancellationToken)
                ?? candidate;

            await Log(
                source.Id,
                "complete",
                "Info",
                $"Ingestion completed in {stopwatch.ElapsedMilliseconds}ms.",
                $"candidateId={loaded.Id}; duplicate={isDuplicate}",
                cancellationToken);

            return (loaded, isDuplicate);
        }
        catch (IngestionPipelineException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected ingestion failure sourceId={SourceId}", dto.SourceId);
            await MarkMessageFailed(message, ex.Message, cancellationToken);
            await MarkSourceFailure(source, "Failed", ex.Message, cancellationToken);
            throw new IngestionPipelineException(
                IngestionErrorCodes.CandidatePersistenceFailed,
                "Ingestion failed unexpectedly.",
                ex);
        }
    }

    private static string ResolveGeminiErrorCode(string error)
    {
        var lower = error.ToLowerInvariant();
        if (lower.Contains("429") || lower.Contains("quota") || lower.Contains("rate limit"))
            return IngestionErrorCodes.GeminiRateLimited;
        if (error.Contains("ApiKey", StringComparison.OrdinalIgnoreCase))
            return IngestionErrorCodes.GeminiApiKeyMissing;
        if (error.Contains("API key", StringComparison.OrdinalIgnoreCase))
            return IngestionErrorCodes.GeminiApiKeyMissing;
        return IngestionErrorCodes.GeminiExtractionFailed;
    }

    private async Task MarkSourceWaitingForQuota(Source source, CancellationToken cancellationToken)
    {
        source.LastSyncStatus = "Waiting for AI quota";
        source.LastIngestionError = "Waiting for AI quota.";
        source.SourceLastCheckedAt = DateTime.UtcNow;
        await _sourceRepository.UpdateAsync(source, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await Log(source.Id, "quota-wait", "Warning", "Waiting for AI quota.", null, cancellationToken);
    }

    private async Task MarkMessageWaitingForQuota(IngestionMessage message, CancellationToken cancellationToken)
    {
        message.Status = IngestionMessageStatus.Processing;
        message.ProcessingError = "Waiting for AI quota";
        await _messageRepository.UpdateAsync(message, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task MarkMessageFailed(IngestionMessage message, string error, CancellationToken cancellationToken)
    {
        message.Status = IngestionMessageStatus.Failed;
        message.ProcessingError = error;
        await _messageRepository.UpdateAsync(message, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task MarkSourceFailure(Source source, string status, string error, CancellationToken cancellationToken)
    {
        source.LastSyncStatus = status;
        source.LastIngestionError = IngestionErrorSummarizer.ForDisplay(error);
        source.SourceLastCheckedAt = DateTime.UtcNow;
        await _sourceRepository.UpdateAsync(source, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await Log(source.Id, "failure", "Error", IngestionErrorSummarizer.ForLog(error), status, cancellationToken);
    }

    private Task Log(
        Guid sourceId,
        string stage,
        string level,
        string message,
        string? details,
        CancellationToken cancellationToken)
        => _ingestionLogger.LogAsync(sourceId, stage, level, message, details, cancellationToken);

    internal static void ApplyExtraction(
        JobCandidate candidate,
        JobExtractionResult normalized,
        int completeness,
        int trust,
        int spam)
    {
        candidate.Title = normalized.Title;
        candidate.CompanyName = normalized.CompanyName;
        candidate.Description = normalized.Description;
        candidate.Location = normalized.Location;
        candidate.City = normalized.City;
        candidate.IsRemote = normalized.IsRemote ?? false;
        candidate.SalaryMin = normalized.SalaryMin;
        candidate.SalaryMax = normalized.SalaryMax;
        candidate.Category = normalized.Category;
        candidate.Level = normalized.Level;
        candidate.EmploymentType = normalized.EmploymentType;
        candidate.SkillsJson = normalized.Skills.Count > 0 ? JsonSerializer.Serialize(normalized.Skills) : null;
        candidate.ApplyMethod = normalized.ApplyMethod;
        candidate.ApplyUrl = normalized.ApplyUrl;
        candidate.ApplyEmail = normalized.ApplyEmail;
        candidate.ApplyTelegram = normalized.ApplyTelegram;
        candidate.ApplyPhone = normalized.ApplyPhone;
        candidate.ExtractionConfidence = normalized.Confidence;
        candidate.CompletenessScore = completeness;
        candidate.TrustScore = trust;
        candidate.SpamScore = spam;
    }

    internal static void ApplyPreview(JobCandidate candidate, JobPreviewResult preview)
    {
        candidate.DisplayTitle = preview.DisplayTitle;
        candidate.DisplayCompany = preview.DisplayCompany;
        candidate.DisplaySalary = preview.DisplaySalary;
        candidate.DisplayLocation = preview.DisplayLocation;
        candidate.DisplaySkillsJson = preview.DisplaySkills.Count > 0
            ? JsonSerializer.Serialize(preview.DisplaySkills)
            : null;
        candidate.DisplaySummary = preview.DisplaySummary;
    }
}
