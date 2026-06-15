using Microsoft.EntityFrameworkCore;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Repositories;

public class ConversationRepository : Repository<Conversation>, IConversationRepository
{
    public ConversationRepository(AppDbContext context) : base(context)
    {
    }

    public Task<Conversation?> GetByApplicationIdAsync(Guid applicationId, CancellationToken cancellationToken = default)
        => DbSet.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ApplicationId == applicationId, cancellationToken);

    public Task<Conversation?> GetByApplicationIdTrackedAsync(Guid applicationId, CancellationToken cancellationToken = default)
        => DbSet.FirstOrDefaultAsync(c => c.ApplicationId == applicationId, cancellationToken);

    public async Task<IReadOnlyDictionary<Guid, Guid>> GetConversationIdsByApplicationIdsAsync(
        IEnumerable<Guid> applicationIds, CancellationToken cancellationToken = default)
    {
        var ids = applicationIds.Distinct().ToList();
        if (ids.Count == 0)
            return new Dictionary<Guid, Guid>();

        return await DbSet.AsNoTracking()
            .Where(c => ids.Contains(c.ApplicationId))
            .ToDictionaryAsync(c => c.ApplicationId, c => c.Id, cancellationToken);
    }

    public Task<Conversation?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default)
        => DbSet
            .Include(c => c.Application).ThenInclude(a => a.Job)
            .Include(c => c.Company)
            .Include(c => c.CandidateProfile)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Conversation>> GetByCandidateProfileIdAsync(
        Guid profileId, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Include(c => c.Company)
            .Include(c => c.Application).ThenInclude(a => a.Job)
            .Where(c => c.CandidateProfileId == profileId)
            .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Conversation>> GetByCompanyIdAsync(
        Guid companyId, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Include(c => c.CandidateProfile)
            .Include(c => c.Application).ThenInclude(a => a.Job)
            .Where(c => c.CompanyId == companyId)
            .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<int> CountAllAsync(CancellationToken cancellationToken = default)
        => DbSet.CountAsync(cancellationToken);
}
