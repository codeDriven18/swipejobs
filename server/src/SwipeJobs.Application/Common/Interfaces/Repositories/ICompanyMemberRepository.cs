using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Application.Common.Interfaces.Repositories;

public interface ICompanyMemberRepository : IRepository<CompanyMember>
{
    Task<CompanyMember?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<CompanyMember?> GetByUserIdWithCompanyAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> GetMemberProfileIdsByCompanyIdAsync(Guid companyId, CancellationToken cancellationToken = default);
}
