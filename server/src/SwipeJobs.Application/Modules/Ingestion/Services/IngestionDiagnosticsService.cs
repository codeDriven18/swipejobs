using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Ingestion.Services;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

public interface IIngestionDiagnosticsService
{
    Task<IngestionPipelineDiagnosticsDto> GetPipelineDiagnosticsAsync(CancellationToken cancellationToken = default);
}

public record IngestionPipelineDiagnosticsDto(
    int TelegramSourcesActive,
    int MessagesTotal,
    int MessagesProcessed,
    int MessagesFailed,
    int MessagesProcessing,
    int CandidatesTotal,
    int CandidatesPending,
    int CandidatesApproved,
    int CandidatesPublished,
    int CandidatesRejected,
    int JobsPublished,
    IReadOnlyList<SourcePipelineDiagnosticsDto> Sources);

public record SourcePipelineDiagnosticsDto(
    Guid SourceId,
    string SourceName,
    string? ChannelUrl,
    string? LatestChannelMessageId,
    string? LastScannedMessageId,
    int MessagesDiscovered,
    int MessagesSkipped,
    int MessagesImported,
    int PendingModeration,
    string? LastError,
    string? LastSyncStatus);

public class IngestionDiagnosticsService : IIngestionDiagnosticsService
{
    private readonly ISourceRepository _sourceRepository;
    private readonly IIngestionMessageRepository _messageRepository;
    private readonly IJobCandidateRepository _candidateRepository;
    private readonly ITelegramPublicChannelReader _channelReader;

    public IngestionDiagnosticsService(
        ISourceRepository sourceRepository,
        IIngestionMessageRepository messageRepository,
        IJobCandidateRepository candidateRepository,
        ITelegramPublicChannelReader channelReader)
    {
        _sourceRepository = sourceRepository;
        _messageRepository = messageRepository;
        _candidateRepository = candidateRepository;
        _channelReader = channelReader;
    }

    public async Task<IngestionPipelineDiagnosticsDto> GetPipelineDiagnosticsAsync(
        CancellationToken cancellationToken = default)
    {
        var sources = await _sourceRepository.GetAllOrderedAsync(cancellationToken);
        var telegramActive = sources.Count(s =>
            s.Type == SourceType.Telegram && s.IsActive && s.IngestionEnabled);

        var messagesTotal = await _messageRepository.CountAsync(cancellationToken);
        var messagesProcessed = await _messageRepository.CountByStatusAsync(IngestionMessageStatus.Processed, cancellationToken);
        var messagesFailed = await _messageRepository.CountByStatusAsync(IngestionMessageStatus.Failed, cancellationToken);
        var messagesProcessing = await _messageRepository.CountByStatusAsync(IngestionMessageStatus.Processing, cancellationToken);

        var candidatesTotal = await _candidateRepository.CountAsync(cancellationToken);
        var pending = await _candidateRepository.CountByStatusAsync(CandidateJobStatus.PendingReview, cancellationToken);
        var approved = await _candidateRepository.CountByStatusAsync(CandidateJobStatus.Approved, cancellationToken);
        var publishedCandidates = await _candidateRepository.CountByStatusAsync(CandidateJobStatus.Published, cancellationToken);
        var rejected = await _candidateRepository.CountByStatusAsync(CandidateJobStatus.Rejected, cancellationToken);
        var jobsPublished = publishedCandidates;

        var metrics = (await _sourceRepository.GetMetricsSnapshotAsync(cancellationToken))
            .ToDictionary(m => m.SourceId);

        var sourceDiagnostics = new List<SourcePipelineDiagnosticsDto>();
        foreach (var source in sources.Where(s => s.Type == SourceType.Telegram))
        {
            string? latestChannelMessageId = null;
            if (!string.IsNullOrWhiteSpace(source.ChannelUrl))
            {
                var posts = await _channelReader.FetchRecentPostsAsync(source.ChannelUrl, cancellationToken);
                latestChannelMessageId = posts.LastOrDefault()?.MessageId;
            }

            var messageCount = metrics.GetValueOrDefault(source.Id)?.MessagesScanned ?? 0;
            var pendingModeration = metrics.GetValueOrDefault(source.Id)?.PendingModeration ?? 0;
            var imported = metrics.GetValueOrDefault(source.Id)?.JobsExtracted ?? 0;

            sourceDiagnostics.Add(new SourcePipelineDiagnosticsDto(
                source.Id,
                source.Name,
                source.ChannelUrl,
                latestChannelMessageId,
                source.LastScannedTelegramMessageId,
                messageCount,
                Math.Max(0, messageCount - imported),
                imported,
                pendingModeration,
                source.LastIngestionError,
                source.LastSyncStatus));
        }

        return new IngestionPipelineDiagnosticsDto(
            telegramActive,
            messagesTotal,
            messagesProcessed,
            messagesFailed,
            messagesProcessing,
            candidatesTotal,
            pending,
            approved,
            publishedCandidates,
            rejected,
            jobsPublished,
            sourceDiagnostics);
    }
}
