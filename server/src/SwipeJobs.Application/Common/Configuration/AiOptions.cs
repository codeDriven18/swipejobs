namespace SwipeJobs.Application.Common.Configuration;

public class AiOptions
{
    public const string SectionName = "AI";

    public string Provider { get; set; } = "Gemini";

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    /// <summary>Maximum concurrent in-flight Gemini HTTP requests.</summary>
    public int MaxConcurrentRequests { get; set; } = 2;

    /// <summary>Minimum delay between consecutive Gemini requests.</summary>
    public int MinRequestIntervalMs { get; set; } = 600;

    /// <summary>Maximum retry attempts per queued extraction (429 / transient errors).</summary>
    public int MaxRetryAttempts { get; set; } = 8;

    /// <summary>Base delay for exponential backoff when Retry-After is absent.</summary>
    public int BaseBackoffMs { get; set; } = 2000;

    /// <summary>Maximum backoff delay between retries.</summary>
    public int MaxBackoffMs { get; set; } = 120_000;
}
