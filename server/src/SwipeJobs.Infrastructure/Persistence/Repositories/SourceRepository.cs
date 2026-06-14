using Microsoft.EntityFrameworkCore;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Ingestion;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Infrastructure.Persistence.Repositories;

public class SourceRepository : Repository<Source>, ISourceRepository
{
    public SourceRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Source>> GetActiveSourcesAsync(CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking().Where(s => s.IsActive).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Source>> GetAllOrderedAsync(CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking().OrderBy(s => s.Name).ToListAsync(cancellationToken);

    public async Task<Source?> GetFirstAsync(CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking().FirstOrDefaultAsync(cancellationToken);

    public async Task<Source?> GetByExternalIdentifierAsync(string externalIdentifier, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .FirstOrDefaultAsync(s => s.ExternalIdentifier == externalIdentifier, cancellationToken);

    public Task<int> CountActiveIngestionEnabledAsync(CancellationToken cancellationToken = default)
        => DbSet.CountAsync(s => s.IsActive && s.IngestionEnabled, cancellationToken);

    public async Task<Source?> GetByChannelUrlAsync(string normalizedChannelUrl, CancellationToken cancellationToken = default)
    {
        var canonical = TelegramChannelUrlNormalizer.Normalize(normalizedChannelUrl);
        if (canonical is null)
            return null;

        var sources = await DbSet
            .AsNoTracking()
            .Where(s => s.ChannelUrl != null)
            .ToListAsync(cancellationToken);

        return sources.FirstOrDefault(s =>
            TelegramChannelUrlNormalizer.AreEquivalent(s.ChannelUrl, canonical));
    }

    public async Task<IReadOnlyList<SourceMetricsSnapshot>> GetMetricsSnapshotAsync(
        CancellationToken cancellationToken = default)
    {
        var messageCounts = await Context.IngestionMessages
            .AsNoTracking()
            .GroupBy(m => m.SourceId)
            .Select(g => new { SourceId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var candidateCounts = await Context.JobCandidates
            .AsNoTracking()
            .GroupBy(c => c.SourceId)
            .Select(g => new { SourceId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var pendingCounts = await Context.JobCandidates
            .AsNoTracking()
            .Where(c => c.Status == CandidateJobStatus.PendingReview)
            .GroupBy(c => c.SourceId)
            .Select(g => new { SourceId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var sourceIds = messageCounts.Select(x => x.SourceId)
            .Union(candidateCounts.Select(x => x.SourceId))
            .Union(pendingCounts.Select(x => x.SourceId))
            .Distinct();

        return sourceIds.Select(id => new SourceMetricsSnapshot(
            id,
            messageCounts.FirstOrDefault(x => x.SourceId == id)?.Count ?? 0,
            candidateCounts.FirstOrDefault(x => x.SourceId == id)?.Count ?? 0,
            pendingCounts.FirstOrDefault(x => x.SourceId == id)?.Count ?? 0)).ToList();
    }
}
