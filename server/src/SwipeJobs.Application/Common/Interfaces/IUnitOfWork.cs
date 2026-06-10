namespace SwipeJobs.Application.Common.Interfaces;

public interface IUnitOfWork
{
    void LogPendingChanges(string operation);

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
