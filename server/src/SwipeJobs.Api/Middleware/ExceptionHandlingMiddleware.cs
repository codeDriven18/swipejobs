using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using SwipeJobs.Api.Models;
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
            await WriteErrorAsync(context, StatusCodes.Status403Forbidden, "Forbidden", "forbidden");
        }
        catch (InvalidOperationException ex)
        {
            LogCaughtException(context, ex, StatusCodes.Status400BadRequest);
            await WriteErrorAsync(context, StatusCodes.Status400BadRequest, ex.Message, "bad_request");
        }
        catch (KeyNotFoundException ex)
        {
            LogCaughtException(context, ex, StatusCodes.Status404NotFound);
            await WriteErrorAsync(context, StatusCodes.Status404NotFound, "Not found", "not_found");
        }
        catch (DbUpdateException ex)
        {
            LogCaughtException(context, ex, StatusCodes.Status500InternalServerError);
            var message = ClassifyDatabaseFailure(ex);
            await WriteErrorAsync(context, StatusCodes.Status500InternalServerError, message, "database_error");
        }
        catch (Exception ex)
        {
            LogCaughtException(context, ex, StatusCodes.Status500InternalServerError);
            var message = _environment.IsDevelopment() ? ex.Message : "An unexpected error occurred.";
            await WriteErrorAsync(context, StatusCodes.Status500InternalServerError, message, "internal_error");
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

    private static Task WriteErrorAsync(HttpContext context, int statusCode, string message, string code)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsJsonAsync(new ApiErrorResponse(message, code));
    }
}
