using Microsoft.EntityFrameworkCore;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Infrastructure.Persistence.Repositories;

public class IngestionMessageRepository : Repository<IngestionMessage>, IIngestionMessageRepository
{
    public IngestionMessageRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IngestionMessage?> GetByExternalKeyAsync(
        Guid sourceId,
        string externalSourceKey,
        CancellationToken cancellationToken = default)
        => await DbSet
            .Include(m => m.CandidateLinks)
            .ThenInclude(l => l.JobCandidate)
            .FirstOrDefaultAsync(m => m.SourceId == sourceId && m.ExternalSourceKey == externalSourceKey, cancellationToken);

    public Task<int> CountAsync(CancellationToken cancellationToken = default)
        => DbSet.CountAsync(cancellationToken);

    public Task<int> CountByStatusAsync(IngestionMessageStatus status, CancellationToken cancellationToken = default)
        => DbSet.CountAsync(m => m.Status == status, cancellationToken);

    public Task<int> CountSinceAsync(DateTime sinceUtc, CancellationToken cancellationToken = default)
        => DbSet.CountAsync(m => m.CreatedAt >= sinceUtc, cancellationToken);

    public Task<int> CountBySourceAsync(Guid sourceId, CancellationToken cancellationToken = default)
        => DbSet.CountAsync(m => m.SourceId == sourceId, cancellationToken);
}

public class JobCandidateRepository : Repository<JobCandidate>, IJobCandidateRepository
{
    public JobCandidateRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<JobCandidate?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default)
        => await DbSet
            .Include(c => c.Source)
            .Include(c => c.MessageLinks)
            .ThenInclude(l => l.IngestionMessage)
            .ThenInclude(m => m!.Source)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<JobCandidate?> FindByContentFingerprintAsync(
        string fingerprint,
        CancellationToken cancellationToken = default)
        => await DbSet
            .Include(c => c.MessageLinks)
            .Where(c => c.ContentFingerprint == fingerprint &&
                (c.Status == CandidateJobStatus.PendingReview || c.Status == CandidateJobStatus.Approved))
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<JobCandidate>> GetModerationQueueAsync(
        CandidateJobStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var q = DbSet
            .Include(c => c.Source)
            .Include(c => c.MessageLinks)
            .ThenInclude(l => l.IngestionMessage)
            .AsQueryable();

        if (status.HasValue)
            q = q.Where(c => c.Status == status.Value);

        return await q
            .OrderByDescending(c => c.TrustScore)
            .ThenByDescending(c => c.ExtractionConfidence)
            .ThenByDescending(c => c.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    public Task<int> CountByStatusAsync(CandidateJobStatus status, CancellationToken cancellationToken = default)
        => DbSet.CountAsync(c => c.Status == status, cancellationToken);

    public Task<int> CountAsync(CancellationToken cancellationToken = default)
        => DbSet.CountAsync(cancellationToken);

    public Task<int> CountSinceAsync(DateTime sinceUtc, CancellationToken cancellationToken = default)
        => DbSet.CountAsync(c => c.CreatedAt >= sinceUtc, cancellationToken);

    public Task<int> CountBySourceAsync(Guid sourceId, CancellationToken cancellationToken = default)
        => DbSet.CountAsync(c => c.SourceId == sourceId, cancellationToken);

    public Task<int> CountPendingBySourceAsync(Guid sourceId, CancellationToken cancellationToken = default)
        => DbSet.CountAsync(
            c => c.SourceId == sourceId && c.Status == CandidateJobStatus.PendingReview,
            cancellationToken);

    public Task<int> CountDuplicatesMergedAsync(CancellationToken cancellationToken = default)
        => DbSet.CountAsync(
            c => c.MessageLinks.Count > 1,
            cancellationToken);

    public async Task<double> GetAverageConfidenceAsync(CancellationToken cancellationToken = default)
    {
        if (!await DbSet.AnyAsync(cancellationToken))
            return 0;

        return await DbSet.AverageAsync(c => (double)c.ExtractionConfidence, cancellationToken);
    }

    public async Task<IReadOnlyList<JobCandidate>> SearchAsync(
        string query,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var q = query.Trim().ToLower();
        return await DbSet
            .AsNoTracking()
            .Include(c => c.Source)
            .Where(c =>
                (c.Title != null && c.Title.ToLower().Contains(q)) ||
                (c.CompanyName != null && c.CompanyName.ToLower().Contains(q)))
            .OrderByDescending(c => c.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<JobCandidate>> GetByDuplicateGroupIdAsync(
        Guid groupId,
        CancellationToken cancellationToken = default)
        => await DbSet
            .Include(c => c.Source)
            .Include(c => c.MessageLinks)
            .ThenInclude(l => l.IngestionMessage)
            .Where(c => c.DuplicateGroupId == groupId)
            .ToListAsync(cancellationToken);
}

public class JobReportRepository : Repository<JobReport>, IJobReportRepository
{
    public JobReportRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<JobReport>> GetPendingAsync(CancellationToken cancellationToken = default)
        => await DbSet
            .Include(r => r.Job)
            .ThenInclude(j => j.Company)
            .Where(r => r.Status == JobReportStatus.Pending)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
}
