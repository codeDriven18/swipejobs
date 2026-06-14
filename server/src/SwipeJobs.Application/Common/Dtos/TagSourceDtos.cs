using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common.Dtos;

public record TagDto(Guid Id, string Name, string? Slug);

public record CreateTagDto(string Name, string? Slug);

public record UpdateTagDto(string Name, string? Slug);

public record SourceDto(
    Guid Id,
    string Name,
    SourceType Type,
    string? ExternalIdentifier,
    string? LogoUrl,
    int TrustScore,
    SourceTrustLevel TrustLevel,
    bool IsActive);

public record CreateSourceDto(
    string Name,
    SourceType Type,
    string? ExternalIdentifier,
    string? LogoUrl,
    int TrustScore = 50);

public record UpdateSourceDto(
    string Name,
    SourceType Type,
    string? ExternalIdentifier,
    string? LogoUrl,
    int TrustScore,
    bool IsActive);

public record AdminSourceMetricsDto(
    int MessagesScanned,
    int JobsExtracted,
    int PendingModeration);

public record AdminSourceDto(
    Guid Id,
    string Name,
    SourceType Type,
    string? ExternalIdentifier,
    string? ChannelName,
    string? ChannelUrl,
    string? LogoUrl,
    int TrustScore,
    SourceTrustLevel TrustLevel,
    bool IsActive,
    bool IngestionEnabled,
    SourceMonitorStatus MonitorStatus,
    DateTime? SourceLastCheckedAt,
    int DefaultExpirationDays,
    string? LastSyncStatus,
    string? LastIngestionError,
    DateTime? LastSuccessfulIngestionAt,
    string? LastScannedTelegramMessageId,
    string HealthStatus,
    AdminSourceMetricsDto Metrics,
    DateTime CreatedAt);

public record AiExtractionQueueMetricsDto(
    int Queued,
    int Processing,
    long Completed,
    long Failed,
    long RateLimited,
    bool IsInCooldown,
    DateTime? CooldownUntilUtc);

public record SourceIngestionLogDto(
    Guid Id,
    string Stage,
    string Level,
    string Message,
    string? Details,
    DateTime CreatedAt);

public record CreateAdminSourceDto(
    string Name,
    SourceType Type,
    string? ChannelUrl,
    string? ChannelName,
    string? ExternalIdentifier,
    string? LogoUrl,
    int TrustScore = 50,
    int DefaultExpirationDays = 30,
    bool IngestionEnabled = true);

public record UpdateAdminSourceDto(
    string Name,
    SourceType Type,
    string? ChannelUrl,
    string? ChannelName,
    string? ExternalIdentifier,
    string? LogoUrl,
    int TrustScore,
    int DefaultExpirationDays,
    bool IsActive,
    bool IngestionEnabled);

public record SourceConnectionTestResultDto(
    bool Success,
    string ConnectionStatus,
    string? ChannelName,
    string? ChannelId,
    int RecentMessagesCount,
    string? Message);

public record AdminDashboardIngestionDto(
    int PendingModeration,
    int SourcesActive,
    int MessagesScannedToday,
    int JobsExtractedToday,
    int DuplicatesRemoved,
    double AverageAiConfidence);

public record AdminSearchResultItemDto(
    string Id,
    string Type,
    string Title,
    string? Subtitle,
    string Url);

public record AdminSearchResultDto(
    IReadOnlyList<AdminSearchResultItemDto> Results,
    int TotalCount);

/// <summary>Normalized job payload for external ingestion pipelines (Telegram, APIs).</summary>
public record IngestionJobDto(
    string Title,
    string Description,
    string CompanyName,
    string? CompanySlug,
    string? Location,
    string? City,
    JobCategory Category,
    JobLevel Level,
    bool IsRemote,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string? ExternalUrl,
    string? JobImageUrl,
    string? ExternalSourceKey,
    Guid SourceId,
    IReadOnlyList<string>? TagNames);
