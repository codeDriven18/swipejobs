using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Ingestion;
using SwipeJobs.Application.Modules.Ingestion.Services;
using SwipeJobs.Application.Modules.Sources.Interfaces;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Sources.Services;

public class AdminSourceService : IAdminSourceService
{
    private readonly ISourceRepository _sourceRepository;
    private readonly IIngestionMessageRepository _messageRepository;
    private readonly IJobCandidateRepository _candidateRepository;
    private readonly ISourceIngestionLogger _ingestionLogger;
    private readonly AiExtractionQueueMetrics _queueMetrics;
    private readonly IUnitOfWork _unitOfWork;

    public AdminSourceService(
        ISourceRepository sourceRepository,
        IIngestionMessageRepository messageRepository,
        IJobCandidateRepository candidateRepository,
        ISourceIngestionLogger ingestionLogger,
        AiExtractionQueueMetrics queueMetrics,
        IUnitOfWork unitOfWork)
    {
        _sourceRepository = sourceRepository;
        _messageRepository = messageRepository;
        _candidateRepository = candidateRepository;
        _ingestionLogger = ingestionLogger;
        _queueMetrics = queueMetrics;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<AdminSourceDto>> GetAllWithMetricsAsync(CancellationToken cancellationToken = default)
    {
        var sources = await _sourceRepository.GetAllOrderedAsync(cancellationToken);
        var metrics = (await _sourceRepository.GetMetricsSnapshotAsync(cancellationToken))
            .ToDictionary(m => m.SourceId);

        return sources
            .Select(source => MapWithMetrics(source, metrics.GetValueOrDefault(source.Id)))
            .ToList();
    }

    public async Task<AdminSourceDto?> GetWithMetricsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var source = await _sourceRepository.GetByIdAsync(id, cancellationToken);
        if (source is null) return null;

        var metrics = (await _sourceRepository.GetMetricsSnapshotAsync(cancellationToken))
            .FirstOrDefault(m => m.SourceId == id);

        return MapWithMetrics(source, metrics);
    }

    public async Task<AdminSourceDto> CreateAsync(CreateAdminSourceDto dto, CancellationToken cancellationToken = default)
    {
        var (channelName, channelUrl, externalId) = NormalizeTelegramFields(
            dto.Type, dto.ChannelUrl, dto.ChannelName, dto.ExternalIdentifier);

        if (!string.IsNullOrWhiteSpace(channelUrl))
        {
            var normalizedUrl = NormalizeChannelUrl(channelUrl);
            if (normalizedUrl is not null)
            {
                var duplicate = await _sourceRepository.GetByChannelUrlAsync(normalizedUrl, cancellationToken);
                if (duplicate is not null)
                {
                    throw new IngestionPipelineException(
                        IngestionErrorCodes.DuplicateChannelUrl,
                        $"A source already exists for channel URL {channelUrl}.");
                }
                channelUrl = normalizedUrl;
            }
        }

        var source = new Source
        {
            Name = dto.Name.Trim(),
            Type = dto.Type,
            ChannelName = channelName,
            ChannelUrl = channelUrl,
            ExternalIdentifier = externalId,
            LogoUrl = dto.LogoUrl,
            TrustScore = Math.Clamp(dto.TrustScore, 0, 100),
            DefaultExpirationDays = dto.DefaultExpirationDays is > 0 and <= 365 ? dto.DefaultExpirationDays : 30,
            IngestionEnabled = dto.IngestionEnabled,
            IsActive = true,
            MonitorStatus = SourceMonitorStatus.Active,
            LastSyncStatus = "Created",
        };

        await _sourceRepository.AddAsync(source, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapWithMetrics(source, null);
    }

    public async Task<AdminSourceDto?> UpdateAsync(Guid id, UpdateAdminSourceDto dto, CancellationToken cancellationToken = default)
    {
        var source = await _sourceRepository.GetByIdAsync(id, cancellationToken);
        if (source is null) return null;

        var (channelName, channelUrl, externalId) = NormalizeTelegramFields(
            dto.Type, dto.ChannelUrl, dto.ChannelName, dto.ExternalIdentifier);

        if (!string.IsNullOrWhiteSpace(channelUrl))
        {
            var normalizedUrl = NormalizeChannelUrl(channelUrl);
            if (normalizedUrl is not null)
            {
                var duplicate = await _sourceRepository.GetByChannelUrlAsync(normalizedUrl, cancellationToken);
                if (duplicate is not null && duplicate.Id != id)
                {
                    throw new IngestionPipelineException(
                        IngestionErrorCodes.DuplicateChannelUrl,
                        $"Another source already uses channel URL {channelUrl}.");
                }
                channelUrl = normalizedUrl;
            }
        }

        source.Name = dto.Name.Trim();
        source.Type = dto.Type;
        source.ChannelName = channelName;
        source.ChannelUrl = channelUrl;
        source.ExternalIdentifier = externalId;
        source.LogoUrl = dto.LogoUrl;
        source.TrustScore = Math.Clamp(dto.TrustScore, 0, 100);
        source.DefaultExpirationDays = dto.DefaultExpirationDays is > 0 and <= 365 ? dto.DefaultExpirationDays : 30;
        source.IsActive = dto.IsActive;
        source.IngestionEnabled = dto.IngestionEnabled;

        await _sourceRepository.UpdateAsync(source, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetWithMetricsAsync(id, cancellationToken);
    }

    public async Task<bool> SetEnabledAsync(Guid id, bool enabled, CancellationToken cancellationToken = default)
    {
        var source = await _sourceRepository.GetByIdAsync(id, cancellationToken);
        if (source is null) return false;

        source.IngestionEnabled = enabled;
        source.IsActive = enabled || source.IsActive;
        await _sourceRepository.UpdateAsync(source, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var source = await _sourceRepository.GetByIdAsync(id, cancellationToken);
        if (source is null) return false;

        source.IsActive = false;
        source.IngestionEnabled = false;
        await _sourceRepository.UpdateAsync(source, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<SourceConnectionTestResultDto> TestConnectionAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var source = await _sourceRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new KeyNotFoundException("Source not found.");

        if (source.Type != SourceType.Telegram)
        {
            return new SourceConnectionTestResultDto(
                true,
                "Ready",
                source.Name,
                source.ExternalIdentifier,
                await _messageRepository.CountBySourceAsync(source.Id, cancellationToken),
                "Non-Telegram source is configured.");
        }

        if (string.IsNullOrWhiteSpace(source.ChannelUrl))
        {
            return new SourceConnectionTestResultDto(
                false,
                "Missing URL",
                source.ChannelName,
                null,
                0,
                "Add a Telegram channel URL before testing.");
        }

        var handle = ExtractTelegramHandle(source.ChannelUrl);
        var messageCount = await _messageRepository.CountBySourceAsync(source.Id, cancellationToken);

        source.SourceLastCheckedAt = DateTime.UtcNow;
        source.LastSyncStatus = string.IsNullOrWhiteSpace(handle) ? "Invalid URL" : "Configured";
        source.MonitorStatus = string.IsNullOrWhiteSpace(handle)
            ? SourceMonitorStatus.Unreachable
            : SourceMonitorStatus.Active;
        if (!string.IsNullOrWhiteSpace(handle) && string.IsNullOrWhiteSpace(source.ChannelName))
            source.ChannelName = handle;

        await _sourceRepository.UpdateAsync(source, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new SourceConnectionTestResultDto(
            !string.IsNullOrWhiteSpace(handle),
            string.IsNullOrWhiteSpace(handle) ? "Invalid URL" : "Configured",
            source.ChannelName ?? handle,
            handle,
            messageCount,
            string.IsNullOrWhiteSpace(handle)
                ? "Could not parse a Telegram channel from the URL."
                : "Channel URL parsed. Automatic polling checks t.me/s preview every minute for new posts.");
    }

    public async Task<AdminDashboardIngestionDto> GetDashboardIngestionAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        return new AdminDashboardIngestionDto(
            await _candidateRepository.CountByStatusAsync(CandidateJobStatus.PendingReview, cancellationToken),
            await _sourceRepository.CountActiveIngestionEnabledAsync(cancellationToken),
            await _messageRepository.CountSinceAsync(today, cancellationToken),
            await _candidateRepository.CountSinceAsync(today, cancellationToken),
            await _candidateRepository.CountDuplicatesMergedAsync(cancellationToken),
            await _candidateRepository.GetAverageConfidenceAsync(cancellationToken));
    }

    public async Task<IReadOnlyList<SourceIngestionLogDto>> GetLogsAsync(
        Guid sourceId,
        int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var logs = await _ingestionLogger.GetRecentAsync(sourceId, limit, cancellationToken);
        return logs.Select(l => new SourceIngestionLogDto(
            l.Id,
            l.Stage,
            l.Level,
            l.Message,
            l.Details,
            l.CreatedAt)).ToList();
    }

    private AdminSourceDto MapWithMetrics(Source source, SourceMetricsSnapshot? metrics)
    {
        return new AdminSourceDto(
            source.Id,
            source.Name,
            source.Type,
            source.ExternalIdentifier,
            source.ChannelName,
            source.ChannelUrl,
            source.LogoUrl,
            source.TrustScore,
            SourceTrustHelper.ToLevel(source.TrustScore),
            source.IsActive,
            source.IngestionEnabled,
            source.MonitorStatus,
            source.SourceLastCheckedAt,
            source.DefaultExpirationDays,
            source.LastSyncStatus,
            source.LastIngestionError,
            source.LastSuccessfulIngestionAt,
            source.LastScannedTelegramMessageId,
            SourceHealthResolver.Resolve(source, _queueMetrics),
            new AdminSourceMetricsDto(
                metrics?.MessagesScanned ?? 0,
                metrics?.JobsExtracted ?? 0,
                metrics?.PendingModeration ?? 0),
            source.CreatedAt);
    }

    public AiExtractionQueueMetricsSnapshot GetExtractionQueueMetrics()
        => _queueMetrics.Snapshot();

    private static string? NormalizeChannelUrl(string? channelUrl)
        => TelegramChannelUrlNormalizer.Normalize(channelUrl);

    private static (string? ChannelName, string? ChannelUrl, string? ExternalId) NormalizeTelegramFields(
        SourceType type,
        string? channelUrl,
        string? channelName,
        string? externalIdentifier)
    {
        if (type != SourceType.Telegram)
            return (channelName?.Trim(), channelUrl?.Trim(), externalIdentifier?.Trim());

        var url = NormalizeChannelUrl(channelUrl);
        var handle = TelegramChannelUrlNormalizer.ExtractHandle(url ?? channelUrl);
        var name = string.IsNullOrWhiteSpace(channelName) ? handle : channelName.Trim();
        var externalId = string.IsNullOrWhiteSpace(externalIdentifier) ? handle : externalIdentifier.Trim();
        return (name, url, externalId);
    }

    private static string? ExtractTelegramHandle(string channelUrl)
        => TelegramChannelUrlNormalizer.ExtractHandle(channelUrl);
}
