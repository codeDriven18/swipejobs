using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Application.Common.Interfaces.Repositories;

public interface IConversationRepository : IRepository<Conversation>
{
    Task<Conversation?> GetByApplicationIdAsync(Guid applicationId, CancellationToken cancellationToken = default);
    Task<Conversation?> GetByApplicationIdTrackedAsync(Guid applicationId, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, Guid>> GetConversationIdsByApplicationIdsAsync(
        IEnumerable<Guid> applicationIds, CancellationToken cancellationToken = default);
    Task<Conversation?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Conversation>> GetByCandidateProfileIdAsync(Guid profileId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Conversation>> GetByCompanyIdAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<int> CountAllAsync(CancellationToken cancellationToken = default);
}
