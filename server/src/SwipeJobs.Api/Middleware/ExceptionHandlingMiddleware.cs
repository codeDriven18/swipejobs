using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using SwipeJobs.Api.Models;
using SwipeJobs.Application.Modules.Ingestion;
using SwipeJobs.Infrastructure.Auth;

namespace SwipeJobs.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (UnauthorizedAccessException ex)
        {
            LogCaughtException(context, ex, StatusCodes.Status403Forbidden);
            if (await TryWriteErrorAsync(context, StatusCodes.Status403Forbidden, "Forbidden", "forbidden"))
                return;
            throw;
        }
        catch (InvalidOperationException ex)
        {
            LogCaughtException(context, ex, StatusCodes.Status400BadRequest);
            if (await TryWriteErrorAsync(context, StatusCodes.Status400BadRequest, ex.Message, "bad_request"))
                return;
            throw;
        }
        catch (ModerationException ex)
        {
            LogCaughtException(context, ex, StatusCodes.Status400BadRequest);
            if (await TryWriteErrorAsync(context, StatusCodes.Status400BadRequest, ex.Message, ex.Code))
                return;
            throw;
        }
        catch (IngestionPipelineException ex)
        {
            LogCaughtException(context, ex, StatusCodes.Status422UnprocessableEntity);
            if (await TryWriteErrorAsync(context, StatusCodes.Status422UnprocessableEntity, ex.Message, ex.Code))
                return;
            throw;
        }
        catch (KeyNotFoundException ex)
        {
            LogCaughtException(context, ex, StatusCodes.Status404NotFound);
            if (await TryWriteErrorAsync(context, StatusCodes.Status404NotFound, "Not found", "not_found"))
                return;
            throw;
        }
        catch (DbUpdateException ex)
        {
            LogCaughtException(context, ex, StatusCodes.Status500InternalServerError);
            var message = ClassifyDatabaseFailure(ex);
            if (await TryWriteErrorAsync(context, StatusCodes.Status500InternalServerError, message, "database_error"))
                return;
            throw;
        }
        catch (Exception ex)
        {
            LogCaughtException(context, ex, StatusCodes.Status500InternalServerError);
            var message = _environment.IsDevelopment() ? ex.Message : "An unexpected error occurred.";
            if (await TryWriteErrorAsync(context, StatusCodes.Status500InternalServerError, message, "internal_error"))
                return;
            throw;
        }
    }

    private void LogCaughtException(HttpContext context, Exception ex, int statusCode)
    {
        var isRegister = context.Request.Path.StartsWithSegments("/api/auth/register", StringComparison.OrdinalIgnoreCase);
        var contextLabel = isRegister
            ? $"ExceptionHandlingMiddleware [REGISTER] {context.Request.Method} {context.Request.Path} -> HTTP {statusCode}"
            : $"ExceptionHandlingMiddleware {context.Request.Method} {context.Request.Path} -> HTTP {statusCode}";

        RegisterFlowDiagnostics.LogFullExceptionChain(_logger, contextLabel, ex);
    }

    private static string ClassifyDatabaseFailure(Exception ex)
    {
        for (var current = ex; current is not null; current = current.InnerException)
        {
            if (current is PostgresException pg)
            {
                return pg.SqlState switch
                {
                    "28P01" => "Database authentication failed.",
                    "3D000" => "Database does not exist.",
                    "42P01" => "Database schema is missing. Run migrations.",
                    _ => "Database operation failed.",
                };
            }
        }

        return "Database operation failed.";
    }

    private async Task<bool> TryWriteErrorAsync(HttpContext context, int statusCode, string message, string code)
    {
        if (context.Response.HasStarted)
        {
            _logger.LogError(
                "Exception after response started for {Method} {Path}; cannot write error body. Status may already be committed.",
                context.Request.Method,
                context.Request.Path);
            Console.Error.WriteLine(
                $"[ExceptionHandlingMiddleware] Response already started for {context.Request.Method} {context.Request.Path}");
            return false;
        }

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new ApiErrorResponse(message, code));
        return true;
    }
}
