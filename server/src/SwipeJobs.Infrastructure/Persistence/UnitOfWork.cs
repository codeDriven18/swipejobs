using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Infrastructure.Auth;

namespace SwipeJobs.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private readonly ILogger<UnitOfWork> _logger;

    public UnitOfWork(AppDbContext context, ILogger<UnitOfWork> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var pending = _context.ChangeTracker.Entries()
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Select(entry => $"{entry.Entity.GetType().Name}:{entry.State}")
            .ToList();

        if (pending.Count > 0)
        {
            _logger.LogWarning(
                "SaveChangesAsync: persisting {Count} change(s): [{Changes}]",
                pending.Count,
                string.Join(", ", pending));
        }

        try
        {
            var affected = await _context.SaveChangesAsync(cancellationToken);
            _logger.LogWarning("SaveChangesAsync: completed, {Affected} row(s) affected", affected);
            return affected;
        }
        catch (Exception ex)
        {
            RegisterFlowDiagnostics.LogFullExceptionChain(_logger, "SaveChangesAsync failed", ex);
            throw;
        }
    }
}
