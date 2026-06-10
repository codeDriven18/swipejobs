using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence;

public static class RegistrationDatabaseDiagnostics
{
    public static void LogConnectionSources(
        ILogger logger,
        PostgresConnectionRuntimeInfo runtimeInfo)
    {
        logger.LogWarning(
            "Register diagnostics: DbContext winning source={Source}; PasswordLength={PasswordLength}; HasConflictingSources={HasConflictingSources}",
            runtimeInfo.Source,
            runtimeInfo.PasswordLength,
            runtimeInfo.HasConflictingSources);

        foreach (var source in runtimeInfo.AllSources)
        {
            if (!source.IsSet)
            {
                logger.LogWarning("Register diagnostics: {SourceName}: not set", source.SourceName);
                continue;
            }

            logger.LogWarning(
                "Register diagnostics: {SourceName}: PasswordLength={PasswordLength}; IsWinner={IsWinner}",
                source.SourceName,
                source.PasswordLength,
                source.SourceName == runtimeInfo.Source);
        }
    }

    public static async Task LogDatabaseStateAsync(
        AppDbContext dbContext,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        try
        {
            var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
            logger.LogWarning("Register diagnostics: DbContext CanConnect={CanConnect}", canConnect);

            if (!canConnect)
                return;

            var applied = await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken);
            var pending = await dbContext.Database.GetPendingMigrationsAsync(cancellationToken);

            logger.LogWarning(
                "Register diagnostics: AppliedMigrations=[{Applied}] PendingMigrations=[{Pending}]",
                string.Join(", ", applied),
                string.Join(", ", pending));

            var usersTable = dbContext.Model.FindEntityType(typeof(User))?.GetTableName() ?? "Users";
            try
            {
                var userCount = await dbContext.Users.AsNoTracking().CountAsync(cancellationToken);
                logger.LogWarning(
                    "Register diagnostics: Users table '{Table}' query succeeded. Row count={Count}",
                    usersTable,
                    userCount);
            }
            catch (Exception ex)
            {
                LogException(logger, $"Register diagnostics: Users table '{usersTable}' query failed", ex);
            }

            try
            {
                var indexes = await dbContext.Database
                    .SqlQueryRaw<string>(
                        "SELECT indexname AS \"Value\" FROM pg_indexes WHERE schemaname = 'public' AND tablename = {0}",
                        usersTable.ToLowerInvariant())
                    .ToListAsync(cancellationToken);

                logger.LogWarning(
                    "Register diagnostics: Users indexes=[{Indexes}]",
                    string.Join(", ", indexes));
            }
            catch (Exception ex)
            {
                LogException(logger, "Register diagnostics: Users index inspection failed", ex);
            }
        }
        catch (Exception ex)
        {
            LogException(logger, "Register diagnostics: database state inspection failed", ex);
        }
    }

    public static void LogException(ILogger logger, string message, Exception ex)
    {
        logger.LogError(ex, "{Message}. FullException:{FullException}", message, ex.ToString());

        for (var current = ex; current is not null; current = current.InnerException)
        {
            switch (current)
            {
                case PostgresException pg:
                    logger.LogError(
                        "PostgreSQL exception. SqlState={SqlState} Severity={Severity} Message={Message} Detail={Detail}",
                        pg.SqlState,
                        pg.Severity,
                        pg.MessageText,
                        pg.Detail);
                    return;
                case NpgsqlException npgsql:
                    logger.LogError("Npgsql exception. Message={Message}", npgsql.Message);
                    return;
            }
        }
    }
}
