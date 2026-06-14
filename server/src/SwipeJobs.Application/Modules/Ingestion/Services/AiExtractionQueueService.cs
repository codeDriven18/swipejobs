using System.Threading.Channels;
using SwipeJobs.Application.Modules.Ingestion.Interfaces;
using SwipeJobs.Application.Modules.Ingestion.Models;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

public sealed class QueuedAiExtractionService : IAiExtractionService
{
    private readonly Channel<ExtractionWorkItem> _channel;
    private readonly AiExtractionQueueMetrics _metrics;

    public QueuedAiExtractionService(AiExtractionQueueMetrics metrics)
    {
        _metrics = metrics;
        _channel = Channel.CreateUnbounded<ExtractionWorkItem>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
        });
    }

    public ChannelReader<ExtractionWorkItem> Reader => _channel.Reader;

    public async Task<AiExtractionResponse> ExtractJobAsync(string rawMessage, CancellationToken cancellationToken = default)
    {
        var workItem = new ExtractionWorkItem(rawMessage, cancellationToken);
        _metrics.IncrementQueued();
        await _channel.Writer.WriteAsync(workItem, cancellationToken);
        return await workItem.Completion.Task.ConfigureAwait(false);
    }

    public sealed class ExtractionWorkItem
    {
        public ExtractionWorkItem(string rawMessage, CancellationToken cancellationToken)
        {
            RawMessage = rawMessage;
            CancellationToken = cancellationToken;
        }

        public string RawMessage { get; }
        public CancellationToken CancellationToken { get; }
        public TaskCompletionSource<AiExtractionResponse> Completion { get; } =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
    }
}
