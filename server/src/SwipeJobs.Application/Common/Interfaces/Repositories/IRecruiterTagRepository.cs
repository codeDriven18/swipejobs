using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Application.Common.Interfaces.Repositories;

public interface IRecruiterTagRepository : IRepository<RecruiterTag>
{
    Task<IReadOnlyList<RecruiterTag>> GetByCompanyIdAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<RecruiterTag?> GetByIdForCompanyAsync(Guid tagId, Guid companyId, CancellationToken cancellationToken = default);
    Task<RecruiterTag?> GetByNameForCompanyAsync(Guid companyId, string name, CancellationToken cancellationToken = default);
}
