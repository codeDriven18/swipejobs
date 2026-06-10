using Microsoft.Extensions.Logging;
using Npgsql;

namespace SwipeJobs.Infrastructure.Auth;

public static class RegisterFlowDiagnostics
{
    public static void LogPhaseStart(ILogger logger, string phase, string? detail = null)
    {
        if (string.IsNullOrEmpty(detail))
            logger.LogWarning("Register flow [{Phase}]: starting", phase);
        else
            logger.LogWarning("Register flow [{Phase}]: starting — {Detail}", phase, detail);
    }

    public static void LogPhaseComplete(ILogger logger, string phase, string? detail = null)
    {
        if (string.IsNullOrEmpty(detail))
            logger.LogWarning("Register flow [{Phase}]: completed", phase);
        else
            logger.LogWarning("Register flow [{Phase}]: completed — {Detail}", phase, detail);
    }

    public static void LogFullExceptionChain(ILogger logger, string context, Exception ex)
    {
        logger.LogError(
            ex,
            "{Context}: {ExceptionType}: {Message}",
            context,
            ex.GetType().FullName,
            ex.Message);

        logger.LogError("{Context}: Full exception (ToString):{NewLine}{FullException}", context, Environment.NewLine, ex.ToString());

        var depth = 0;
        for (var inner = ex.InnerException; inner is not null; inner = inner.InnerException)
        {
            depth++;
            logger.LogError(
                "{Context}: InnerException[{Depth}] {Type}: {Message}",
                context,
                depth,
                inner.GetType().FullName,
                inner.Message);

            if (!string.IsNullOrWhiteSpace(inner.StackTrace))
            {
                logger.LogError(
                    "{Context}: InnerException[{Depth}] stack trace:{NewLine}{StackTrace}",
                    context,
                    depth,
                    Environment.NewLine,
                    inner.StackTrace);
            }

            LogProviderSpecificException(logger, context, depth, inner);
        }

        LogProviderSpecificException(logger, context, 0, ex);
    }

    private static void LogProviderSpecificException(ILogger logger, string context, int depth, Exception current)
    {
        switch (current)
        {
            case PostgresException pg:
                logger.LogError(
                    "{Context}: PostgresException[{Depth}] SqlState={SqlState} Severity={Severity} Message={Message} Detail={Detail} ColumnName={ColumnName} TableName={TableName}",
                    context,
                    depth,
                    pg.SqlState,
                    pg.Severity,
                    pg.MessageText,
                    pg.Detail,
                    pg.ColumnName,
                    pg.TableName);
                break;
            case NpgsqlException npgsql:
                logger.LogError(
                    "{Context}: NpgsqlException[{Depth}] Message={Message} IsTransient={IsTransient}",
                    context,
                    depth,
                    npgsql.Message,
                    npgsql.IsTransient);
                break;
        }
    }
}
