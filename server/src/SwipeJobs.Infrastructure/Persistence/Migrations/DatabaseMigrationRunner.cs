using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using SwipeJobs.Infrastructure.Persistence;

namespace SwipeJobs.Infrastructure.Persistence.Migrations;

public static class DatabaseMigrationRunner
{
    public const string UsersTableName = "Users";
    public const string InitialMigrationId = "20260607170756_InitialPostgreSQL";

    public static async Task ApplyPendingMigrationsAsync(
        AppDbContext dbContext,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var migrationsAssembly = typeof(AppDbContext).Assembly.GetName().Name
            ?? throw new InvalidOperationException("Could not resolve migrations assembly name.");

        Log(logger, $"Migrations assembly: {migrationsAssembly}");

        if (!await dbContext.Database.CanConnectAsync(cancellationToken))
        {
            throw new InvalidOperationException("Database connection failed before migration.");
        }

        Log(logger, "Database connection verified (CanConnectAsync=true).");

        var before = await DatabaseSchemaDiagnostics.CaptureAsync(dbContext, cancellationToken);
        DatabaseSchemaDiagnostics.LogSnapshot(logger, before, "before Migrate");

        if (before.DiscoveredMigrationIds.Count == 0)
        {
            throw new InvalidOperationException(
                $"No EF Core migrations were discovered in assembly '{migrationsAssembly}'. " +
                "The published build may be missing migration classes.");
        }

        if (!before.DiscoveredMigrationIds.Contains(InitialMigrationId))
        {
            throw new InvalidOperationException(
                $"Expected migration '{InitialMigrationId}' (creates \"{UsersTableName}\") " +
                $"was not found. Found: [{string.Join(", ", before.DiscoveredMigrationIds)}]");
        }

        Log(logger, "Executing Database.MigrateAsync()...");
        try
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            LogError(logger, "Database.MigrateAsync() failed — startup aborted.", ex);
            if (ex is PostgresException pg)
            {
                Log(logger, $"Failed PostgreSQL statement context: SqlState={pg.SqlState}; Message={pg.MessageText}; Position={pg.Position}");
            }
            throw;
        }

        Log(logger, "Database.MigrateAsync() completed.");

        var snapshot = await DatabaseSchemaDiagnostics.CaptureAsync(dbContext, cancellationToken);
        DatabaseSchemaDiagnostics.LogSnapshot(logger, snapshot, "after Migrate");

        if (!snapshot.UsersTableExists)
        {
            await RepairStaleMigrationHistoryAsync(dbContext, logger, snapshot, cancellationToken);
            snapshot = await DatabaseSchemaDiagnostics.CaptureAsync(dbContext, cancellationToken);
            DatabaseSchemaDiagnostics.LogSnapshot(logger, snapshot, "after history repair");
        }

        if (!snapshot.UsersTableExists)
        {
            throw new InvalidOperationException(
                $"\"{UsersTableName}\" table is still missing after MigrateAsync and history repair. " +
                $"Database={snapshot.CurrentDatabase}; schema={snapshot.CurrentSchema}; " +
                $"applied=[{string.Join(", ", snapshot.AppliedMigrationIds)}]; " +
                $"public tables=[{string.Join(", ", snapshot.PublicTables)}]");
        }

        if (snapshot.PendingMigrationIds.Count > 0)
        {
            throw new InvalidOperationException(
                $"Migrations remain pending after MigrateAsync: [{string.Join(", ", snapshot.PendingMigrationIds)}]");
        }

        if (!snapshot.AppliedMigrationIds.Contains(InitialMigrationId))
        {
            throw new InvalidOperationException(
                $"Migration '{InitialMigrationId}' was not recorded in __EFMigrationsHistory after MigrateAsync.");
        }

        Log(logger, $"Verified \"{UsersTableName}\" table exists in database '{snapshot.CurrentDatabase}'.");
    }

    private static async Task RepairStaleMigrationHistoryAsync(
        AppDbContext dbContext,
        ILogger logger,
        DatabaseSchemaSnapshot snapshot,
        CancellationToken cancellationToken)
    {
        if (!snapshot.AppliedMigrationIds.Contains(InitialMigrationId))
        {
            Log(
                logger,
                $"\"{UsersTableName}\" missing but '{InitialMigrationId}' is not in __EFMigrationsHistory — re-running MigrateAsync.");
            await dbContext.Database.MigrateAsync(cancellationToken);
            return;
        }

        Log(
            logger,
            $"Detected stale __EFMigrationsHistory for '{InitialMigrationId}' without \"{UsersTableName}\" table. " +
            "Removing history row and re-applying migration.");

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            DELETE FROM "__EFMigrationsHistory"
            WHERE "MigrationId" = {0}
            """,
            new object[] { InitialMigrationId },
            cancellationToken);

        await dbContext.Database.MigrateAsync(cancellationToken);
    }

    public static async Task VerifyUsersTableExistsAsync(
        AppDbContext dbContext,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (await DatabaseSchemaDiagnostics.UsersTableExistsAsync(dbContext, cancellationToken))
        {
            Log(logger, $"Verified \"{UsersTableName}\" table exists.");
            return;
        }

        var snapshot = await DatabaseSchemaDiagnostics.CaptureAsync(dbContext, cancellationToken);
        DatabaseSchemaDiagnostics.LogSnapshot(logger, snapshot, "Users verification failed");

        throw new InvalidOperationException(
            $"Database schema is incomplete: \"{UsersTableName}\" table does not exist.");
    }

    private static void Log(ILogger logger, string message)
    {
        logger.LogWarning("[DatabaseMigration] {Message}", message);
        Console.Error.WriteLine($"[DatabaseMigration] {message}");
    }

    private static void LogError(ILogger logger, string message, Exception ex)
    {
        logger.LogError(ex, "[DatabaseMigration] {Message}", message);
        Console.Error.WriteLine($"[DatabaseMigration] ERROR: {message}");
        Console.Error.WriteLine(ex);
    }
}
