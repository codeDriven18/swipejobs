namespace SwipeJobs.Application.Common.Configuration;

public class IngestionOptions
{
    public const string SectionName = "Ingestion";

    public string? WebhookSecret { get; set; }

    /// <summary>Poll public Telegram channels for new posts when no webhook forwarder is configured.</summary>
    public bool PollingEnabled { get; set; } = true;

    public int PollIntervalSeconds { get; set; } = 60;
}
