using System.Threading;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

public sealed class AiExtractionQueueMetrics
{
    private int _queued;
    private int _processing;
    private long _completed;
    private long _failed;
    private long _rateLimited;
    private long _cooldownUntilTicks;

    public int Queued => Volatile.Read(ref _queued);
    public int Processing => Volatile.Read(ref _processing);
    public long Completed => Interlocked.Read(ref _completed);
    public long Failed => Interlocked.Read(ref _failed);
    public long RateLimited => Interlocked.Read(ref _rateLimited);

    public DateTime CooldownUntilUtc =>
        new(Interlocked.Read(ref _cooldownUntilTicks), DateTimeKind.Utc);

    public bool IsInCooldown => DateTime.UtcNow < CooldownUntilUtc;

    public void IncrementQueued() => Interlocked.Increment(ref _queued);
    public void DecrementQueued() => Interlocked.Decrement(ref _queued);
    public void IncrementProcessing() => Interlocked.Increment(ref _processing);
    public void DecrementProcessing() => Interlocked.Decrement(ref _processing);
    public void IncrementCompleted() => Interlocked.Increment(ref _completed);
    public void IncrementFailed() => Interlocked.Increment(ref _failed);
    public void IncrementRateLimited() => Interlocked.Increment(ref _rateLimited);

    public void SetCooldownUntil(DateTime untilUtc) =>
        Interlocked.Exchange(ref _cooldownUntilTicks, untilUtc.ToUniversalTime().Ticks);

    public AiExtractionQueueMetricsSnapshot Snapshot() => new(
        Queued,
        Processing,
        Completed,
        Failed,
        RateLimited,
        IsInCooldown,
        IsInCooldown ? CooldownUntilUtc : null);
}

public record AiExtractionQueueMetricsSnapshot(
    int Queued,
    int Processing,
    long Completed,
    long Failed,
    long RateLimited,
    bool IsInCooldown,
    DateTime? CooldownUntilUtc);
