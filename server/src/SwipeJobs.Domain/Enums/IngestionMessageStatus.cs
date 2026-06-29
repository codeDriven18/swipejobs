namespace SwipeJobs.Domain.Enums;

public enum IngestionMessageStatus
{
    Received = 0,
    Processing = 1,
    Processed = 2,
    Failed = 3,
    SourceDeleted = 4,
    SourceChanged = 5,
    /// <summary>Post was classified as non-job content (course ad, announcement, etc.) and intentionally skipped.</summary>
    Skipped = 6,
}
