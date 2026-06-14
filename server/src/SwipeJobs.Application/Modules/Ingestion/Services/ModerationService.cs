using System.Text.Json;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Common.Mapping;
using SwipeJobs.Application.Modules.Ingestion;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

public interface IModerationService
{
    Task<ModerationQueueDto> GetQueueAsync(CandidateJobStatus? status, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<JobCandidateDto?> GetCandidateAsync(Guid id, CancellationToken cancellationToken = default);
    Task<JobDto?> ApproveAndPublishAsync(Guid candidateId, Guid moderatorUserId, CancellationToken cancellationToken = default);
    Task<bool> RejectAsync(Guid candidateId, Guid moderatorUserId, RejectJobCandidateDto dto, CancellationToken cancellationToken = default);
    Task<JobCandidateDto?> EditAsync(Guid candidateId, EditJobCandidateDto dto, CancellationToken cancellationToken = default);
    Task<int> BulkApproveHighConfidenceAsync(Guid moderatorUserId, CancellationToken cancellationToken = default);
    Task<int> BulkRejectAsync(IReadOnlyList<Guid> ids, Guid moderatorUserId, string reason, CancellationToken cancellationToken = default);
    Task<IngestionAnalyticsDto> GetAnalyticsAsync(CancellationToken cancellationToken = default);
}

public class ModerationService : IModerationService
{
    private const int HighConfidenceThreshold = 90;
    private const int HighCompletenessThreshold = 70;
    private const int MaxSpamThreshold = 20;

    private readonly IJobCandidateRepository _candidateRepository;
    private readonly IIngestionMessageRepository _messageRepository;
    private readonly IJobRepository _jobRepository;
    private readonly IJobPublishService _publishService;
    private readonly IUnitOfWork _unitOfWork;

    public ModerationService(
        IJobCandidateRepository candidateRepository,
        IIngestionMessageRepository messageRepository,
        IJobRepository jobRepository,
        IJobPublishService publishService,
        IUnitOfWork unitOfWork)
    {
        _candidateRepository = candidateRepository;
        _messageRepository = messageRepository;
        _jobRepository = jobRepository;
        _publishService = publishService;
        _unitOfWork = unitOfWork;
    }

    public async Task<ModerationQueueDto> GetQueueAsync(
        CandidateJobStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var filter = status ?? CandidateJobStatus.PendingReview;
        var items = await _candidateRepository.GetModerationQueueAsync(filter, page, pageSize, cancellationToken);
        var pending = await _candidateRepository.CountByStatusAsync(CandidateJobStatus.PendingReview, cancellationToken);
        var total = await _candidateRepository.CountByStatusAsync(filter, cancellationToken);
        return new ModerationQueueDto(
            items.Select(IngestionMapper.ToCandidateDto).ToList(),
            total,
            pending);
    }

    public async Task<JobCandidateDto?> GetCandidateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var candidate = await _candidateRepository.GetByIdWithDetailsAsync(id, cancellationToken);
        return candidate is null ? null : IngestionMapper.ToCandidateDto(candidate);
    }

    public async Task<JobDto?> ApproveAndPublishAsync(
        Guid candidateId,
        Guid moderatorUserId,
        CancellationToken cancellationToken = default)
    {
        var candidate = await _candidateRepository.GetByIdWithDetailsAsync(candidateId, cancellationToken)
            ?? throw new ModerationException(ModerationErrorCodes.CandidateNotFound, "Candidate not found.");

        if (candidate.Status is CandidateJobStatus.Rejected or CandidateJobStatus.Published)
            throw new ModerationException(
                ModerationErrorCodes.CandidateNotApprovable,
                $"Candidate cannot be approved while status is {candidate.Status}.");

        if (string.IsNullOrWhiteSpace(candidate.Title))
            throw new ModerationException(
                ModerationErrorCodes.ApproveMissingTitle,
                "Job title is required before approval. Edit the candidate or re-ingest with clearer text.");

        if (string.IsNullOrWhiteSpace(candidate.CompanyName))
        {
            candidate.CompanyName = candidate.Source.ChannelName ?? candidate.Source.Name;
            if (string.IsNullOrWhiteSpace(candidate.CompanyName))
            {
                throw new ModerationException(
                    ModerationErrorCodes.ApproveMissingCompany,
                    "Company name is required before approval. Edit the candidate or ensure the source has a channel name.");
            }

            await _candidateRepository.UpdateAsync(candidate, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        candidate.Status = CandidateJobStatus.Approved;
        candidate.ApprovedByUserId = moderatorUserId;
        candidate.ApprovedAt = DateTime.UtcNow;
        await _candidateRepository.UpdateAsync(candidate, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            return await _publishService.PublishCandidateAsync(candidateId, moderatorUserId, cancellationToken);
        }
        catch (Exception ex)
        {
            candidate.Status = CandidateJobStatus.PendingReview;
            candidate.ApprovedByUserId = null;
            candidate.ApprovedAt = null;
            await _candidateRepository.UpdateAsync(candidate, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            throw new ModerationException(
                ModerationErrorCodes.PublishFailed,
                ex.Message,
                ex);
        }
    }

    public async Task<bool> RejectAsync(
        Guid candidateId,
        Guid moderatorUserId,
        RejectJobCandidateDto dto,
        CancellationToken cancellationToken = default)
    {
        var candidate = await _candidateRepository.GetByIdWithDetailsAsync(candidateId, cancellationToken);
        if (candidate is null) return false;

        candidate.Status = CandidateJobStatus.Rejected;
        candidate.RejectedByUserId = moderatorUserId;
        candidate.RejectedAt = DateTime.UtcNow;
        candidate.RejectedReason = dto.Reason;
        await _candidateRepository.UpdateAsync(candidate, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<JobCandidateDto?> EditAsync(
        Guid candidateId,
        EditJobCandidateDto dto,
        CancellationToken cancellationToken = default)
    {
        var candidate = await _candidateRepository.GetByIdWithDetailsAsync(candidateId, cancellationToken);
        if (candidate is null) return null;

        if (dto.Title is not null) candidate.Title = dto.Title;
        if (dto.CompanyName is not null) candidate.CompanyName = dto.CompanyName;
        if (dto.Description is not null) candidate.Description = dto.Description;
        if (dto.Location is not null) candidate.Location = dto.Location;
        if (dto.City is not null) candidate.City = dto.City;
        if (dto.IsRemote.HasValue) candidate.IsRemote = dto.IsRemote.Value;
        if (dto.SalaryMin.HasValue) candidate.SalaryMin = dto.SalaryMin;
        if (dto.SalaryMax.HasValue) candidate.SalaryMax = dto.SalaryMax;
        if (dto.Category.HasValue) candidate.Category = dto.Category.Value;
        if (dto.Level.HasValue) candidate.Level = dto.Level.Value;
        if (dto.EmploymentType is not null) candidate.EmploymentType = dto.EmploymentType;
        if (dto.Skills is not null) candidate.SkillsJson = JsonSerializer.Serialize(dto.Skills);
        if (dto.ApplyMethod.HasValue) candidate.ApplyMethod = dto.ApplyMethod.Value;
        if (dto.ApplyUrl is not null) candidate.ApplyUrl = dto.ApplyUrl;
        if (dto.ApplyEmail is not null) candidate.ApplyEmail = dto.ApplyEmail;
        if (dto.ApplyTelegram is not null) candidate.ApplyTelegram = dto.ApplyTelegram;
        if (dto.ApplyPhone is not null) candidate.ApplyPhone = dto.ApplyPhone;

        await _candidateRepository.UpdateAsync(candidate, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var updated = await _candidateRepository.GetByIdWithDetailsAsync(candidateId, cancellationToken);
        return updated is null ? null : IngestionMapper.ToCandidateDto(updated);
    }

    public async Task<int> BulkApproveHighConfidenceAsync(Guid moderatorUserId, CancellationToken cancellationToken = default)
    {
        var queue = await _candidateRepository.GetModerationQueueAsync(
            CandidateJobStatus.PendingReview, 1, 500, cancellationToken);

        var count = 0;
        foreach (var candidate in queue.Where(c =>
            c.ExtractionConfidence >= HighConfidenceThreshold &&
            c.CompletenessScore >= HighCompletenessThreshold &&
            c.SpamScore <= MaxSpamThreshold))
        {
            await ApproveAndPublishAsync(candidate.Id, moderatorUserId, cancellationToken);
            count++;
        }
        return count;
    }

    public async Task<int> BulkRejectAsync(
        IReadOnlyList<Guid> ids,
        Guid moderatorUserId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var count = 0;
        foreach (var id in ids)
        {
            if (await RejectAsync(id, moderatorUserId, new RejectJobCandidateDto(reason), cancellationToken))
                count++;
        }
        return count;
    }

    public async Task<IngestionAnalyticsDto> GetAnalyticsAsync(CancellationToken cancellationToken = default)
    {
        var messages = await _messageRepository.CountAsync(cancellationToken);
        var candidates = await _candidateRepository.CountAsync(cancellationToken);
        var pending = await _candidateRepository.CountByStatusAsync(CandidateJobStatus.PendingReview, cancellationToken);
        var approved = await _candidateRepository.CountByStatusAsync(CandidateJobStatus.Approved, cancellationToken);
        var rejected = await _candidateRepository.CountByStatusAsync(CandidateJobStatus.Rejected, cancellationToken);
        var published = await _candidateRepository.CountByStatusAsync(CandidateJobStatus.Published, cancellationToken);

        var queue = await _candidateRepository.GetModerationQueueAsync(null, 1, 1000, cancellationToken);
        var avgConfidence = queue.Count > 0 ? queue.Average(c => c.ExtractionConfidence) : 0;
        var avgTrust = queue.Count > 0 ? queue.Average(c => c.TrustScore) : 0;

        var leaderboard = queue
            .GroupBy(c => new { c.SourceId, c.Source.Name, c.Source.TrustScore })
            .Select(g => new SourceLeaderboardEntryDto(
                g.Key.SourceId,
                g.Key.Name,
                g.Sum(c => c.MessageLinks.Count),
                g.Count(c => c.Status == CandidateJobStatus.Published),
                g.Count(c => c.Status == CandidateJobStatus.Approved),
                g.Count(c => c.Status == CandidateJobStatus.Rejected),
                g.Average(c => c.ExtractionConfidence),
                g.Key.TrustScore))
            .OrderByDescending(x => x.Published)
            .Take(10)
            .ToList();

        return new IngestionAnalyticsDto(
            messages,
            candidates,
            Math.Max(0, candidates - pending),
            approved,
            rejected,
            published,
            0,
            0,
            avgConfidence,
            avgTrust,
            leaderboard);
    }
}
