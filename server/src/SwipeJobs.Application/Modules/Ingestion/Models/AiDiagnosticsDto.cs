using SwipeJobs.Application.Modules.Ingestion.Services;

namespace SwipeJobs.Application.Modules.Ingestion.Models;

public record AiDiagnosticsDto(
    string Provider,
    string ProviderSource,
    string Model,
    string ModelSource,
    bool ApiKeyConfigured,
    DateTime? LastSuccessfulExtractionAt,
    DateTime? LastExtractionFailureAt,
    string? LastExtractionFailure,
    long MessagesProcessed,
    double SuccessRate,
    AiExtractionQueueMetricsSnapshot QueueMetrics);

public record AiConnectionTestResultDto(
    string Provider,
    string Model,
    bool Success,
    long LatencyMs,
    string? Error,
    int? HttpStatusCode);
