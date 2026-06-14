using Microsoft.EntityFrameworkCore;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Domain.Entities;

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
}
