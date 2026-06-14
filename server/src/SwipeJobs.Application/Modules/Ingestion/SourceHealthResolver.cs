using SwipeJobs.Application.Modules.Ingestion.Services;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Ingestion;

public static class SourceHealthResolver
{
    public static string Resolve(Source source, AiExtractionQueueMetrics? queueMetrics = null)
    {
        if (!source.IsActive || !source.IngestionEnabled)
            return "Disabled";

        if (IsWaitingForAiQuota(source, queueMetrics))
            return "Waiting for AI quota";

        if (IsExtractionFailed(source))
            return "Extraction Failed";

        if (IsSyncing(source, queueMetrics))
            return "Syncing";

        if (source.Type == SourceType.Telegram && string.IsNullOrWhiteSpace(source.ChannelUrl))
            return "Missing URL";

        if (string.Equals(source.LastSyncStatus, "Success", StringComparison.OrdinalIgnoreCase))
            return "Healthy";

        if (source.MonitorStatus == SourceMonitorStatus.Active)
            return "Connected";

        return source.MonitorStatus switch
        {
            SourceMonitorStatus.Unreachable => "Unreachable",
            SourceMonitorStatus.MessageDeleted => "Message deleted",
            SourceMonitorStatus.MessageChanged => "Needs review",
            _ => "Connected",
        };
    }

    private static bool IsWaitingForAiQuota(Source source, AiExtractionQueueMetrics? queueMetrics)
    {
        if (string.Equals(source.LastSyncStatus, "Waiting for AI quota", StringComparison.OrdinalIgnoreCase))
            return true;

        if (string.Equals(source.LastSyncStatus, "Rate Limited", StringComparison.OrdinalIgnoreCase))
            return true;

        var error = source.LastIngestionError?.ToLowerInvariant() ?? string.Empty;
        if (error.Contains("waiting for ai quota"))
            return true;

        if (error.Contains("rate limit") || error.Contains("quota") || error.Contains("429"))
            return true;

        return queueMetrics?.IsInCooldown == true;
    }

    private static bool IsExtractionFailed(Source source)
    {
        if (string.Equals(source.LastSyncStatus, "Extraction failed", StringComparison.OrdinalIgnoreCase))
            return true;

        var error = source.LastIngestionError?.ToLowerInvariant() ?? string.Empty;
        if (error.Contains("waiting for ai quota") ||
            error.Contains("rate limit") ||
            error.Contains("quota") ||
            error.Contains("429"))
        {
            return false;
        }

        return error.Contains("extraction failed") ||
               error.Contains("invalid ai") ||
               (error.Contains("openrouter") && error.Contains("failed")) ||
               (error.Contains("gemini") && error.Contains("failed"));
    }

    private static bool IsSyncing(Source source, AiExtractionQueueMetrics? queueMetrics)
    {
        if (string.Equals(source.LastSyncStatus, "Syncing", StringComparison.OrdinalIgnoreCase))
            return true;

        if (queueMetrics is { Processing: > 0 } &&
            source.SourceLastCheckedAt.HasValue &&
            source.SourceLastCheckedAt.Value > DateTime.UtcNow.AddMinutes(-2))
        {
            return true;
        }

        return false;
    }
}
