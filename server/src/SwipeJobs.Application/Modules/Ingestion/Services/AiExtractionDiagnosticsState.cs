namespace SwipeJobs.Application.Modules.Ingestion.Services;

public sealed class AiExtractionDiagnosticsState
{
    private long _messagesProcessed;
    private long _successCount;
    private long _failureCount;
    private long _lastSuccessTicks;
    private long _lastFailureTicks;
    private volatile string? _lastFailureMessage;

    public long MessagesProcessed => Interlocked.Read(ref _messagesProcessed);
    public long SuccessCount => Interlocked.Read(ref _successCount);
    public long FailureCount => Interlocked.Read(ref _failureCount);

    public DateTime? LastSuccessfulExtractionAt
    {
        get
        {
            var ticks = Interlocked.Read(ref _lastSuccessTicks);
            return ticks == 0 ? null : new DateTime(ticks, DateTimeKind.Utc);
        }
    }

    public DateTime? LastExtractionFailureAt
    {
        get
        {
            var ticks = Interlocked.Read(ref _lastFailureTicks);
            return ticks == 0 ? null : new DateTime(ticks, DateTimeKind.Utc);
        }
    }

    public string? LastExtractionFailure => _lastFailureMessage;

    public double SuccessRate
    {
        get
        {
            var total = MessagesProcessed;
            return total == 0 ? 0 : Math.Round(SuccessCount * 100.0 / total, 1);
        }
    }

    public void RecordSuccess()
    {
        Interlocked.Increment(ref _messagesProcessed);
        Interlocked.Increment(ref _successCount);
        Interlocked.Exchange(ref _lastSuccessTicks, DateTime.UtcNow.Ticks);
    }

    public void RecordFailure(string? friendlyMessage)
    {
        Interlocked.Increment(ref _messagesProcessed);
        Interlocked.Increment(ref _failureCount);
        Interlocked.Exchange(ref _lastFailureTicks, DateTime.UtcNow.Ticks);
        if (!string.IsNullOrWhiteSpace(friendlyMessage))
            _lastFailureMessage = friendlyMessage;
    }
}
