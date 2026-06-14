using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Application.Common.Interfaces.Repositories;

public interface ISourceRepository : IRepository<Source>
{
    Task<IReadOnlyList<Source>> GetActiveSourcesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Source>> GetAllOrderedAsync(CancellationToken cancellationToken = default);
    Task<Source?> GetFirstAsync(CancellationToken cancellationToken = default);
    Task<Source?> GetByExternalIdentifierAsync(string externalIdentifier, CancellationToken cancellationToken = default);
    Task<int> CountActiveIngestionEnabledAsync(CancellationToken cancellationToken = default);
}
