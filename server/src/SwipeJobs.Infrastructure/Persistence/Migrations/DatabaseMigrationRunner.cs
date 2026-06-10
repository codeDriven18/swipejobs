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

        await LogEfMigrationHistoryAsync(dbContext, logger, "before Migrate", cancellationToken);

        var allMigrations = dbContext.Database.GetMigrations().ToList();
        Log(logger, $"Discovered migrations in assembly ({allMigrations.Count}): [{FormatList(allMigrations)}]");

        if (allMigrations.Count == 0)
        {
            throw new InvalidOperationException(
                $"No EF Core migrations were discovered in assembly '{migrationsAssembly}'. " +
                "The published build may be missing migration classes.");
        }

        if (!allMigrations.Contains(InitialMigrationId))
        {
            throw new InvalidOperationException(
                $"Expected migration '{InitialMigrationId}' (creates \"{UsersTableName}\") " +
                $"was not found. Found: [{FormatList(allMigrations)}]");
        }

        var applied = (await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken)).ToList();
        var pending = (await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();

        Log(logger, $"Applied migrations ({applied.Count}): [{FormatList(applied)}]");
        Log(logger, $"Pending migrations ({pending.Count}): [{FormatList(pending)}]");

        Log(logger, "Executing Database.MigrateAsync()...");
        try
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            LogError(logger, "Database.MigrateAsync() failed — startup aborted.", ex);
            throw;
        }

        Log(logger, "Database.MigrateAsync() completed successfully.");

        await LogEfMigrationHistoryAsync(dbContext, logger, "after Migrate", cancellationToken);

        var appliedAfter = (await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken)).ToList();
        var stillPending = (await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();

        if (stillPending.Count > 0)
        {
            throw new InvalidOperationException(
                $"Migrations remain pending after MigrateAsync: [{FormatList(stillPending)}]. " +
                $"Applied: [{FormatList(appliedAfter)}]");
        }

        if (!appliedAfter.Contains(InitialMigrationId))
        {
            throw new InvalidOperationException(
                $"Migration '{InitialMigrationId}' was not recorded in __EFMigrationsHistory after MigrateAsync.");
        }

        await VerifyUsersTableExistsAsync(dbContext, logger, cancellationToken);
    }

    public static async Task VerifyUsersTableExistsAsync(
        AppDbContext dbContext,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await dbContext.Database.ExecuteSqlRawAsync(
                $"SELECT 1 FROM \"{UsersTableName}\" LIMIT 0",
                cancellationToken);
            Log(logger, $"Verified \"{UsersTableName}\" table exists.");
        }
        catch (PostgresException pg) when (pg.SqlState is PostgresErrorCodes.UndefinedTable)
        {
            LogError(
                logger,
                $"\"{UsersTableName}\" table is missing (SqlState={pg.SqlState}) after migration. Registration will fail.",
                pg);
            throw new InvalidOperationException(
                $"Database schema is incomplete: \"{UsersTableName}\" table does not exist after MigrateAsync.",
                pg);
        }
    }

    private static async Task LogEfMigrationHistoryAsync(
        AppDbContext dbContext,
        ILogger logger,
        string stage,
        CancellationToken cancellationToken)
    {
        var applied = (await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken)).ToList();
        Log(
            logger,
            $"__EFMigrationsHistory ({stage}): {applied.Count} row(s) — [{FormatList(applied)}]");

        var historyTableExists = await HistoryTableExistsAsync(dbContext, cancellationToken);
        Log(logger, $"__EFMigrationsHistory table exists ({stage}): {historyTableExists}");
    }

    private static async Task<bool> HistoryTableExistsAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        try
        {
            await dbContext.Database
                .SqlQueryRaw<int>("SELECT COUNT(*) AS \"Value\" FROM \"__EFMigrationsHistory\"")
                .SingleAsync(cancellationToken);
            return true;
        }
        catch (PostgresException pg) when (pg.SqlState is PostgresErrorCodes.UndefinedTable)
        {
            return false;
        }
    }

    private static string FormatList(IReadOnlyList<string> items)
        => items.Count == 0 ? "none" : string.Join(", ", items);

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
