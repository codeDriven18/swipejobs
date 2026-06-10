using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SwipeJobs.Api.Models;
using SwipeJobs.Infrastructure.Persistence;
using SwipeJobs.Infrastructure.Persistence.Migrations;

namespace SwipeJobs.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly PostgresConnectionRuntimeInfo _connectionInfo;
    private readonly ILogger<HealthController> _logger;

    public HealthController(
        AppDbContext dbContext,
        PostgresConnectionRuntimeInfo connectionInfo,
        ILogger<HealthController> logger)
    {
        _dbContext = dbContext;
        _connectionInfo = connectionInfo;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "1.0.0";
        var dbStatus = "healthy";
        string? databaseError = null;
        DatabaseSchemaSnapshot? schema = null;

        try
        {
            if (!await _dbContext.Database.CanConnectAsync(cancellationToken))
            {
                dbStatus = "unhealthy";
                databaseError = "CanConnectAsync returned false.";
                _logger.LogError("Database CanConnectAsync returned false.");
            }
            else
            {
                schema = await DatabaseSchemaDiagnostics.CaptureAsync(_dbContext, cancellationToken);
                DatabaseSchemaDiagnostics.LogSnapshot(_logger, schema, "health check");

                if (!schema.UsersTableExists)
                {
                    dbStatus = "unhealthy";
                    databaseError =
                        $"Schema missing \"{DatabaseMigrationRunner.UsersTableName}\" table (SqlState 42P01). " +
                        $"Applied migrations: [{string.Join(", ", schema.AppliedMigrationIds)}]. " +
                        $"Pending: [{string.Join(", ", schema.PendingMigrationIds)}].";
                    _logger.LogError("{DatabaseError}", databaseError);
                }
            }
        }
        catch (Exception ex)
        {
            dbStatus = "unhealthy";
            databaseError = GetDatabaseErrorMessage(ex);
            LogDatabaseException(ex);
        }

        var apiStatus = dbStatus == "healthy" ? "healthy" : "degraded";

        var sourceAudit = _connectionInfo.AllSources
            .Select(source => new ConnectionSourceHealthInfo(
                source.SourceName,
                source.PasswordLength,
                source.IsSet,
                source.SourceName == _connectionInfo.Source))
            .ToList();

        return Ok(new HealthResponse(
            apiStatus,
            "SwipeJobs API",
            version,
            dbStatus,
            DateTime.UtcNow,
            _connectionInfo.Host,
            _connectionInfo.Database,
            _connectionInfo.Username,
            _connectionInfo.SslMode,
            databaseError,
            _connectionInfo.Source,
            _connectionInfo.PasswordLength,
            _connectionInfo.HasConflictingSources,
            sourceAudit,
            schema?.CurrentDatabase,
            schema?.CurrentSchema,
            schema?.HistoryTableExists,
            schema?.UsersTableExists,
            schema?.AppliedMigrationIds,
            schema?.PendingMigrationIds,
            schema?.DiscoveredMigrationIds.Count,
            schema?.PublicTables));
    }

    private static string GetDatabaseErrorMessage(Exception ex)
    {
        for (var current = ex; current is not null; current = current.InnerException)
        {
            if (current is PostgresException pg)
                return pg.MessageText;
            if (current is NpgsqlException npgsql)
                return npgsql.Message;
            if (current is System.Net.Sockets.SocketException socket)
                return $"{socket.SocketErrorCode}: {socket.Message}";
            if (current is TimeoutException timeout)
                return timeout.Message;
        }

        return ex.Message;
    }

    private void LogDatabaseException(Exception ex)
    {
        for (var current = ex; current is not null; current = current.InnerException)
        {
            switch (current)
            {
                case PostgresException pg:
                    _logger.LogError(
                        pg,
                        "PostgreSQL health check failed. SqlState={SqlState} Severity={Severity} Message={Message}",
                        pg.SqlState,
                        pg.Severity,
                        pg.MessageText);
                    return;
                case NpgsqlException npgsql:
                    _logger.LogError(
                        npgsql,
                        "Npgsql health check failed. Message={Message}",
                        npgsql.Message);
                    return;
                case System.Net.Sockets.SocketException socket:
                    _logger.LogError(
                        socket,
                        "Database network error. SocketError={SocketError} Message={Message}",
                        socket.SocketErrorCode,
                        socket.Message);
                    return;
                case TimeoutException timeout:
                    _logger.LogError(
                        timeout,
                        "Database connection timeout. Message={Message}",
                        timeout.Message);
                    return;
            }
        }

        _logger.LogError(ex, "Database health check failed.");
    }
}
