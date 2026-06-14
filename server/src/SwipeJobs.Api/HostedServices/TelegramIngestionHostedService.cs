using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SwipeJobs.Application.Common.Configuration;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Ingestion;
using SwipeJobs.Application.Modules.Ingestion.Services;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Api.HostedServices;

public class TelegramIngestionHostedService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<TelegramIngestionHostedService> _logger;
    private readonly IngestionOptions _options;

    public TelegramIngestionHostedService(
        IServiceProvider services,
        IOptions<IngestionOptions> options,
        ILogger<TelegramIngestionHostedService> logger)
    {
        _services = services;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.PollingEnabled)
        {
            _logger.LogInformation("Telegram channel polling is disabled.");
            return;
        }

        var interval = TimeSpan.FromSeconds(Math.Clamp(_options.PollIntervalSeconds, 15, 300));
        _logger.LogInformation("Telegram channel polling started. Interval={IntervalSeconds}s", interval.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PollSourcesAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Telegram polling cycle failed.");
            }

            await Task.Delay(interval, stoppingToken);
        }
    }

    private async Task PollSourcesAsync(CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var sourceRepository = scope.ServiceProvider.GetRequiredService<ISourceRepository>();
        var reader = scope.ServiceProvider.GetRequiredService<ITelegramPublicChannelReader>();
        var pipeline = scope.ServiceProvider.GetRequiredService<IngestionPipelineService>();
        var ingestionLogger = scope.ServiceProvider.GetRequiredService<ISourceIngestionLogger>();

        var sources = await sourceRepository.GetActiveSourcesAsync(cancellationToken);
        var telegramSources = sources
            .Where(s => s.Type == SourceType.Telegram && s.IngestionEnabled && !string.IsNullOrWhiteSpace(s.ChannelUrl))
            .ToList();

        foreach (var source in telegramSources)
        {
            var posts = await reader.FetchRecentPostsAsync(source.ChannelUrl!, cancellationToken);
            if (posts.Count == 0)
                continue;

            var latestId = posts[^1].MessageId;
            var lastScanned = source.LastScannedTelegramMessageId;
            var discovered = 0;
            var skipped = 0;
            var imported = 0;

            foreach (var post in posts)
            {
                if (IsAlreadyScanned(post.MessageId, lastScanned))
                {
                    skipped++;
                    continue;
                }

                discovered++;
                try
                {
                    var (_, isDuplicate) = await pipeline.ProcessTelegramMessageAsync(
                        new TelegramIngestMessageDto(
                            source.Id,
                            post.MessageId,
                            post.MessageUrl,
                            source.ChannelName,
                            source.ChannelUrl,
                            post.PostedAt,
                            post.Text,
                            null),
                        cancellationToken);

                    if (!isDuplicate)
                        imported++;
                }
                catch (IngestionPipelineException ex)
                {
                    _logger.LogWarning(
                        "Telegram poll ingest failed source={SourceId} message={MessageId}: {Error}",
                        source.Id,
                        post.MessageId,
                        ex.Message);
                }
            }

            await ingestionLogger.LogAsync(
                source.Id,
                "telegram-scan",
                "Info",
                $"Scan complete. Latest={latestId}; LastScanned={lastScanned ?? "none"}; Discovered={discovered}; Skipped={skipped}; Imported={imported}",
                null,
                cancellationToken);
        }
    }

    private static bool IsAlreadyScanned(string messageId, string? lastScanned)
    {
        if (string.IsNullOrWhiteSpace(lastScanned))
            return false;

        if (long.TryParse(messageId, out var current) && long.TryParse(lastScanned, out var last))
            return current <= last;

        return string.Equals(messageId, lastScanned, StringComparison.OrdinalIgnoreCase);
    }
}
