using Microsoft.EntityFrameworkCore;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Repositories;

public class CompanyMemberRepository : Repository<CompanyMember>, ICompanyMemberRepository
{
    public CompanyMemberRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<CompanyMember?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await DbSet.FirstOrDefaultAsync(m => m.UserId == userId, cancellationToken);

    public async Task<CompanyMember?> GetByUserIdWithCompanyAsync(Guid userId, CancellationToken cancellationToken = default)
        => await DbSet
            .AsNoTracking()
            .Include(m => m.Company)
            .FirstOrDefaultAsync(m => m.UserId == userId, cancellationToken);

    public async Task<IReadOnlyList<Guid>> GetMemberProfileIdsByCompanyIdAsync(
        Guid companyId, CancellationToken cancellationToken = default)
        => await DbSet
            .AsNoTracking()
            .Where(m => m.CompanyId == companyId)
            .Select(m => m.User.Profile!.Id)
            .Where(id => id != Guid.Empty)
            .ToListAsync(cancellationToken);
}
