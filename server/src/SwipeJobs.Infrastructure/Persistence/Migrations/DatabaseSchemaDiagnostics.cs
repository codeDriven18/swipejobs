using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace SwipeJobs.Infrastructure.Persistence.Migrations;

public sealed class DatabaseSchemaSnapshot
{
    public string CurrentDatabase { get; init; } = string.Empty;
    public string CurrentSchema { get; init; } = string.Empty;
    public string CurrentUser { get; init; } = string.Empty;
    public string SearchPath { get; init; } = string.Empty;
    public bool HistoryTableExists { get; init; }
    public IReadOnlyList<string> AppliedMigrationIds { get; init; } = [];
    public IReadOnlyList<string> DiscoveredMigrationIds { get; init; } = [];
    public IReadOnlyList<string> PendingMigrationIds { get; init; } = [];
    public IReadOnlyList<string> PublicTables { get; init; } = [];
    public bool UsersTableExists { get; init; }
}

public static class DatabaseSchemaDiagnostics
{
    public static async Task<DatabaseSchemaSnapshot> CaptureAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        var context = await QueryContextAsync(dbContext, cancellationToken);
        var historyTableExists = await HistoryTableExistsAsync(dbContext, cancellationToken);
        var applied = (await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken)).ToList();
        var discovered = dbContext.Database.GetMigrations().ToList();
        var pending = (await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
        var publicTables = await ListPublicTablesAsync(dbContext, cancellationToken);
        var usersTableExists = await UsersTableExistsAsync(dbContext, cancellationToken);

        return new DatabaseSchemaSnapshot
        {
            CurrentDatabase = context.Database,
            CurrentSchema = context.Schema,
            CurrentUser = context.User,
            SearchPath = context.SearchPath,
            HistoryTableExists = historyTableExists,
            AppliedMigrationIds = applied,
            DiscoveredMigrationIds = discovered,
            PendingMigrationIds = pending,
            PublicTables = publicTables,
            UsersTableExists = usersTableExists,
        };
    }

    public static void LogSnapshot(ILogger logger, DatabaseSchemaSnapshot snapshot, string stage)
    {
        Log(
            logger,
            $"{stage}: PostgreSQL context database={snapshot.CurrentDatabase}; schema={snapshot.CurrentSchema}; user={snapshot.CurrentUser}; search_path={snapshot.SearchPath}");
        Log(
            logger,
            $"{stage}: migrations assembly discovered={snapshot.DiscoveredMigrationIds.Count} [{Format(snapshot.DiscoveredMigrationIds)}]");
        Log(
            logger,
            $"{stage}: __EFMigrationsHistory exists={snapshot.HistoryTableExists}; applied={snapshot.AppliedMigrationIds.Count} [{Format(snapshot.AppliedMigrationIds)}]");
        Log(
            logger,
            $"{stage}: pending migrations={snapshot.PendingMigrationIds.Count} [{Format(snapshot.PendingMigrationIds)}]");
        Log(
            logger,
            $"{stage}: public tables ({snapshot.PublicTables.Count})=[{Format(snapshot.PublicTables)}]");
        Log(
            logger,
            $"{stage}: \"Users\" table exists={snapshot.UsersTableExists}");
    }

    private static async Task<(string Database, string Schema, string User, string SearchPath)> QueryContextAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var row = await dbContext.Database
            .SqlQueryRaw<ContextRow>(
                """
                SELECT
                    current_database() AS "Database",
                    current_schema() AS "Schema",
                    current_user AS "User",
                    current_setting('search_path') AS "SearchPath"
                """)
            .SingleAsync(cancellationToken);

        return (row.Database, row.Schema, row.User, row.SearchPath);
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

    private static async Task<IReadOnlyList<string>> ListPublicTablesAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        return await dbContext.Database
            .SqlQueryRaw<TableRow>(
                """
                SELECT table_name AS "Name"
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
                """)
            .Select(row => row.Name)
            .ToListAsync(cancellationToken);
    }

    public static async Task<bool> UsersTableExistsAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await dbContext.Database.ExecuteSqlRawAsync(
                "SELECT 1 FROM \"Users\" LIMIT 0",
                cancellationToken);
            return true;
        }
        catch (PostgresException pg) when (pg.SqlState is PostgresErrorCodes.UndefinedTable)
        {
            return false;
        }
    }

    private static string Format(IReadOnlyList<string> items)
        => items.Count == 0 ? "none" : string.Join(", ", items);

    private static void Log(ILogger logger, string message)
    {
        logger.LogWarning("[DatabaseSchema] {Message}", message);
        Console.Error.WriteLine($"[DatabaseSchema] {message}");
    }

    private sealed class ContextRow
    {
        public string Database { get; init; } = string.Empty;
        public string Schema { get; init; } = string.Empty;
        public string User { get; init; } = string.Empty;
        public string SearchPath { get; init; } = string.Empty;
    }

    private sealed class TableRow
    {
        public string Name { get; init; } = string.Empty;
    }
}
