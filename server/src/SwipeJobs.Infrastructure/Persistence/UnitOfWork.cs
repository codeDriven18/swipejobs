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

    public void LogPendingChanges(string operation)
    {
        var entries = _context.ChangeTracker.Entries()
            .Where(entry => entry.State is not EntityState.Unchanged and not EntityState.Detached)
            .ToList();

        if (entries.Count == 0)
        {
            _logger.LogWarning("ChangeTracker [{Operation}]: no pending changes", operation);
            Console.Error.WriteLine($"[ChangeTracker] {operation}: no pending changes");
            return;
        }

        foreach (var entry in entries)
        {
            var key = entry.Properties
                .Where(p => p.Metadata.IsPrimaryKey())
                .Select(p => $"{p.Metadata.Name}={p.CurrentValue}")
                .FirstOrDefault() ?? "(no key)";

            _logger.LogWarning(
                "ChangeTracker [{Operation}]: {Entity} State={State} Key={Key}",
                operation,
                entry.Entity.GetType().Name,
                entry.State,
                key);
            Console.Error.WriteLine(
                $"[ChangeTracker] {operation}: {entry.Entity.GetType().Name} State={entry.State} Key={key}");
        }
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
        catch (DbUpdateConcurrencyException ex)
        {
            foreach (var entry in ex.Entries)
            {
                var key = entry.Properties
                    .Where(p => p.Metadata.IsPrimaryKey())
                    .Select(p => $"{p.Metadata.Name}={p.CurrentValue}")
                    .FirstOrDefault() ?? "(no key)";

                _logger.LogError(
                    "SaveChangesAsync concurrency conflict: {Entity} State={State} Key={Key}",
                    entry.Entity.GetType().Name,
                    entry.State,
                    key);
                Console.Error.WriteLine(
                    $"[ChangeTracker] CONFLICT: {entry.Entity.GetType().Name} State={entry.State} Key={key}");
            }

            RegisterFlowDiagnostics.LogFullExceptionChain(_logger, "SaveChangesAsync concurrency conflict", ex);
            throw;
        }
        catch (Exception ex)
        {
            RegisterFlowDiagnostics.LogFullExceptionChain(_logger, "SaveChangesAsync failed", ex);
            throw;
        }
    }
}
