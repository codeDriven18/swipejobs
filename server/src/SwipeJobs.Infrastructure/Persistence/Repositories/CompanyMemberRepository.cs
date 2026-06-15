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
    {
        var members = await DbSet
            .AsNoTracking()
            .Include(m => m.User)
            .ThenInclude(u => u.Profile)
            .Where(m => m.CompanyId == companyId)
            .ToListAsync(cancellationToken);

        return members
            .Select(m => m.User?.Profile?.Id)
            .Where(id => id.HasValue && id.Value != Guid.Empty)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();
    }
}
