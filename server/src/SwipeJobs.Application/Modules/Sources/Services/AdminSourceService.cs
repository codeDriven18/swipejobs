using System.Text.RegularExpressions;
using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Sources.Interfaces;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Sources.Services;

public class AdminSourceService : IAdminSourceService
{
    private static readonly Regex TelegramChannelRegex = new(
        @"(?:https?://)?(?:t\.me|telegram\.me)/(?:\+|joinchat/)?([a-zA-Z0-9_+-]+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly ISourceRepository _sourceRepository;
    private readonly IIngestionMessageRepository _messageRepository;
    private readonly IJobCandidateRepository _candidateRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AdminSourceService(
        ISourceRepository sourceRepository,
        IIngestionMessageRepository messageRepository,
        IJobCandidateRepository candidateRepository,
        IUnitOfWork unitOfWork)
    {
        _sourceRepository = sourceRepository;
        _messageRepository = messageRepository;
        _candidateRepository = candidateRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<AdminSourceDto>> GetAllWithMetricsAsync(CancellationToken cancellationToken = default)
    {
        var sources = await _sourceRepository.GetAllOrderedAsync(cancellationToken);
        var results = new List<AdminSourceDto>(sources.Count);

        foreach (var source in sources)
        {
            results.Add(await MapWithMetricsAsync(source, cancellationToken));
        }

        return results;
    }

    public async Task<AdminSourceDto?> GetWithMetricsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var source = await _sourceRepository.GetByIdAsync(id, cancellationToken);
        return source is null ? null : await MapWithMetricsAsync(source, cancellationToken);
    }

    public async Task<AdminSourceDto> CreateAsync(CreateAdminSourceDto dto, CancellationToken cancellationToken = default)
    {
        var (channelName, channelUrl, externalId) = NormalizeTelegramFields(dto.Type, dto.ChannelUrl, dto.ChannelName, dto.ExternalIdentifier);

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
        };

        await _sourceRepository.AddAsync(source, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await MapWithMetricsAsync(source, cancellationToken);
    }

    public async Task<AdminSourceDto?> UpdateAsync(Guid id, UpdateAdminSourceDto dto, CancellationToken cancellationToken = default)
    {
        var source = await _sourceRepository.GetByIdAsync(id, cancellationToken);
        if (source is null) return null;

        var (channelName, channelUrl, externalId) = NormalizeTelegramFields(dto.Type, dto.ChannelUrl, dto.ChannelName, dto.ExternalIdentifier);

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
        return await MapWithMetricsAsync(source, cancellationToken);
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
                : "Channel URL parsed. Full Telegram sync requires the ingestion worker.");
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

    private async Task<AdminSourceDto> MapWithMetricsAsync(Source source, CancellationToken cancellationToken)
    {
        var messages = await _messageRepository.CountBySourceAsync(source.Id, cancellationToken);
        var jobs = await _candidateRepository.CountBySourceAsync(source.Id, cancellationToken);
        var pending = await _candidateRepository.CountPendingBySourceAsync(source.Id, cancellationToken);

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
            new AdminSourceMetricsDto(
                messages,
                jobs,
                pending,
                ResolveConnectionStatus(source)),
            source.CreatedAt);
    }

    private static string ResolveConnectionStatus(Source source)
    {
        if (!source.IsActive || !source.IngestionEnabled)
            return "Disabled";
        if (source.Type == SourceType.Telegram && string.IsNullOrWhiteSpace(source.ChannelUrl))
            return "Missing URL";
        return source.MonitorStatus switch
        {
            SourceMonitorStatus.Active => "Connected",
            SourceMonitorStatus.Unreachable => "Unreachable",
            SourceMonitorStatus.MessageDeleted => "Message deleted",
            SourceMonitorStatus.MessageChanged => "Needs review",
            SourceMonitorStatus.Disabled => "Disabled",
            _ => "Unknown",
        };
    }

    private static (string? ChannelName, string? ChannelUrl, string? ExternalId) NormalizeTelegramFields(
        SourceType type,
        string? channelUrl,
        string? channelName,
        string? externalIdentifier)
    {
        if (type != SourceType.Telegram)
            return (channelName?.Trim(), channelUrl?.Trim(), externalIdentifier?.Trim());

        var url = channelUrl?.Trim();
        var handle = string.IsNullOrWhiteSpace(url) ? null : ExtractTelegramHandle(url);
        var name = string.IsNullOrWhiteSpace(channelName) ? handle : channelName.Trim();
        var externalId = string.IsNullOrWhiteSpace(externalIdentifier) ? handle : externalIdentifier.Trim();
        return (name, url, externalId);
    }

    private static string? ExtractTelegramHandle(string channelUrl)
    {
        var match = TelegramChannelRegex.Match(channelUrl);
        return match.Success ? match.Groups[1].Value : null;
    }
}
