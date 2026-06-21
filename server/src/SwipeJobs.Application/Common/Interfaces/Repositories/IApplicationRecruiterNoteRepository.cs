using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Application.Common.Interfaces.Repositories;

public interface IApplicationRecruiterNoteRepository : IRepository<ApplicationRecruiterNote>
{
    Task<IReadOnlyList<ApplicationRecruiterNote>> GetByApplicationIdAsync(
        Guid applicationId, CancellationToken cancellationToken = default);
    Task<ApplicationRecruiterNote?> GetByIdForApplicationAsync(
        Guid noteId, Guid applicationId, CancellationToken cancellationToken = default);
}
