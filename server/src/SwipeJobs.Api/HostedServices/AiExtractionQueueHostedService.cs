using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SwipeJobs.Application.Common.Configuration;
using SwipeJobs.Application.Modules.Ingestion.Models;
using SwipeJobs.Application.Modules.Ingestion.Services;

namespace SwipeJobs.Api.HostedServices;

public sealed class AiExtractionQueueHostedService : BackgroundService
{
    private readonly QueuedAiExtractionService _queue;
    private readonly IGeminiExtractionClient _gemini;
    private readonly AiExtractionQueueMetrics _metrics;
    private readonly AiOptions _options;
    private readonly ILogger<AiExtractionQueueHostedService> _logger;
    private readonly SemaphoreSlim _concurrency;
    private readonly object _intervalLock = new();
    private DateTime _lastRequestUtc = DateTime.MinValue;

    public AiExtractionQueueHostedService(
        QueuedAiExtractionService queue,
        IGeminiExtractionClient gemini,
        AiExtractionQueueMetrics metrics,
        IOptions<AiOptions> options,
        ILogger<AiExtractionQueueHostedService> logger)
    {
        _queue = queue;
        _gemini = gemini;
        _metrics = metrics;
        _options = options.Value;
        _logger = logger;
        _concurrency = new SemaphoreSlim(Math.Max(1, _options.MaxConcurrentRequests));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "AI extraction queue started. MaxConcurrent={MaxConcurrent}, MinIntervalMs={MinIntervalMs}, MaxRetries={MaxRetries}",
            _options.MaxConcurrentRequests,
            _options.MinRequestIntervalMs,
            _options.MaxRetryAttempts);

        await foreach (var item in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            _metrics.DecrementQueued();
            await ProcessWorkItemAsync(item, stoppingToken);
        }
    }

    private async Task ProcessWorkItemAsync(
        QueuedAiExtractionService.ExtractionWorkItem item,
        CancellationToken stoppingToken)
    {
        _metrics.IncrementProcessing();
        try
        {
            var result = await ExecuteWithRateLimitAsync(item, stoppingToken);
            if (result.Success)
                _metrics.IncrementCompleted();
            else if (result.IsRateLimited)
                _metrics.IncrementRateLimited();
            else
                _metrics.IncrementFailed();

            item.Completion.TrySetResult(result);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            item.Completion.TrySetCanceled(stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected extraction queue failure.");
            _metrics.IncrementFailed();
            item.Completion.TrySetException(ex);
        }
        finally
        {
            _metrics.DecrementProcessing();
        }
    }

    private async Task<AiExtractionResponse> ExecuteWithRateLimitAsync(
        QueuedAiExtractionService.ExtractionWorkItem item,
        CancellationToken stoppingToken)
    {
        var maxAttempts = Math.Max(1, _options.MaxRetryAttempts);
        AiExtractionResponse? lastResult = null;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            item.CancellationToken.ThrowIfCancellationRequested();
            stoppingToken.ThrowIfCancellationRequested();

            await WaitForGlobalCooldownAsync(stoppingToken);
            await _concurrency.WaitAsync(stoppingToken);
            try
            {
                await EnforceMinIntervalAsync(stoppingToken);
                lastResult = await _gemini.ExtractJobAsync(item.RawMessage, stoppingToken);

                if (lastResult.Success)
                    return lastResult;

                if (!lastResult.IsRateLimited)
                    return lastResult;

                var delay = ComputeBackoffDelay(attempt, lastResult);
                _metrics.SetCooldownUntil(DateTime.UtcNow.Add(delay));
                _logger.LogWarning(
                    "Gemini rate limited (attempt {Attempt}/{MaxAttempts}). Retrying in {DelayMs}ms.",
                    attempt,
                    maxAttempts,
                    (int)delay.TotalMilliseconds);

                if (attempt >= maxAttempts)
                    return lastResult;

                await Task.Delay(delay, stoppingToken);
            }
            finally
            {
                _concurrency.Release();
            }
        }

        return lastResult ?? new AiExtractionResponse(
            null, "Gemini", string.Empty, "Gemini", false,
            "Extraction failed.", 0, 429, true);
    }

    private async Task WaitForGlobalCooldownAsync(CancellationToken cancellationToken)
    {
        while (_metrics.IsInCooldown)
        {
            var remaining = _metrics.CooldownUntilUtc - DateTime.UtcNow;
            if (remaining <= TimeSpan.Zero)
                break;

            _logger.LogInformation(
                "AI extraction queue waiting for cooldown. RemainingMs={RemainingMs}",
                (int)remaining.TotalMilliseconds);

            await Task.Delay(remaining, cancellationToken);
        }
    }

    private async Task EnforceMinIntervalAsync(CancellationToken cancellationToken)
    {
        var minInterval = TimeSpan.FromMilliseconds(Math.Max(0, _options.MinRequestIntervalMs));
        if (minInterval <= TimeSpan.Zero)
            return;

        TimeSpan wait;
        lock (_intervalLock)
        {
            var elapsed = DateTime.UtcNow - _lastRequestUtc;
            wait = minInterval - elapsed;
            if (wait <= TimeSpan.Zero)
            {
                _lastRequestUtc = DateTime.UtcNow;
                return;
            }

            _lastRequestUtc = DateTime.UtcNow + wait;
        }

        await Task.Delay(wait, cancellationToken);
    }

    private TimeSpan ComputeBackoffDelay(int attempt, AiExtractionResponse response)
    {
        if (response.RetryAfterSeconds is > 0)
        {
            return TimeSpan.FromSeconds(Math.Min(
                response.RetryAfterSeconds.Value,
                _options.MaxBackoffMs / 1000));
        }

        var baseMs = Math.Max(100, _options.BaseBackoffMs);
        var maxMs = Math.Max(baseMs, _options.MaxBackoffMs);
        var exponential = Math.Min(maxMs, baseMs * Math.Pow(2, attempt - 1));
        var jitterMs = Random.Shared.Next(0, Math.Max(1, (int)(exponential * 0.15)));
        return TimeSpan.FromMilliseconds(exponential + jitterMs);
    }
}
