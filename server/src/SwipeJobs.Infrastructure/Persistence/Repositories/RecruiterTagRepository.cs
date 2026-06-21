using Microsoft.EntityFrameworkCore;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Repositories;

public class RecruiterTagRepository : Repository<RecruiterTag>, IRecruiterTagRepository
{
    public RecruiterTagRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<RecruiterTag>> GetByCompanyIdAsync(
        Guid companyId, CancellationToken cancellationToken = default)
        => await DbSet
            .AsNoTracking()
            .Where(t => t.CompanyId == companyId)
            .OrderBy(t => t.Name)
            .ToListAsync(cancellationToken);

    public async Task<RecruiterTag?> GetByIdForCompanyAsync(
        Guid tagId, Guid companyId, CancellationToken cancellationToken = default)
        => await DbSet.FirstOrDefaultAsync(t => t.Id == tagId && t.CompanyId == companyId, cancellationToken);

    public async Task<RecruiterTag?> GetByNameForCompanyAsync(
        Guid companyId, string name, CancellationToken cancellationToken = default)
        => await DbSet.FirstOrDefaultAsync(
            t => t.CompanyId == companyId && t.Name.ToLower() == name.ToLower(),
            cancellationToken);
}
