using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence;

public static class RegistrationDatabaseDiagnostics
{
    public static void LogConnectionSources(
        ILogger logger,
        IConfiguration configuration,
        string contentRootPath)
    {
        LogSource(logger, "ConnectionStrings:DefaultConnection (IConfiguration)",
            configuration.GetConnectionString("DefaultConnection"));

        LogSource(logger, "ConnectionStrings__DefaultConnection (env)",
            Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection"));

        LogSource(logger, "CUSTOMCONNSTR_DefaultConnection (env)",
            Environment.GetEnvironmentVariable("CUSTOMCONNSTR_DefaultConnection"));

        LogSource(logger, "POSTGRESQLCONNSTR_DefaultConnection (env)",
            Environment.GetEnvironmentVariable("POSTGRESQLCONNSTR_DefaultConnection"));

        var productionPath = Path.Combine(contentRootPath, "appsettings.Production.json");
        if (!File.Exists(productionPath))
        {
            logger.LogWarning("Register diagnostics: appsettings.Production.json connection: file not found at {Path}", productionPath);
            return;
        }

        try
        {
            var json = File.ReadAllText(productionPath);
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.TryGetProperty("ConnectionStrings", out var connectionStrings)
                && connectionStrings.TryGetProperty("DefaultConnection", out var defaultConnection))
            {
                LogSource(logger, "appsettings.Production.json", defaultConnection.GetString());
            }
            else
            {
                logger.LogWarning("Register diagnostics: appsettings.Production.json: ConnectionStrings:DefaultConnection not set");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Register diagnostics: failed to read appsettings.Production.json at {Path}", productionPath);
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

    private static void LogSource(ILogger logger, string source, string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            logger.LogWarning("Register diagnostics: {Source}: not set", source);
            return;
        }

        var info = PostgresConnectionStringNormalizer.DescribeRuntime(connectionString, source);
        logger.LogWarning(
            "Register diagnostics: {Source}: Host={Host};Database={Database};Username={Username};SSL Mode={SslMode};PasswordLength={PasswordLength}",
            source,
            info.Host,
            info.Database,
            info.Username,
            info.SslMode,
            info.PasswordLength);
    }
}
