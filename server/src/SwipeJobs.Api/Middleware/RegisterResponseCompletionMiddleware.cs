namespace SwipeJobs.Api.Middleware;

/// <summary>
/// Logs the final HTTP status after the full pipeline (including response serialization) completes.
/// </summary>
public sealed class RegisterResponseCompletionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RegisterResponseCompletionMiddleware> _logger;

    public RegisterResponseCompletionMiddleware(
        RequestDelegate next,
        ILogger<RegisterResponseCompletionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var isRegister = context.Request.Path.StartsWithSegments(
            "/api/auth/register",
            StringComparison.OrdinalIgnoreCase);

        try
        {
            await _next(context);
        }
        finally
        {
            if (isRegister)
            {
                var response = context.Response;
                _logger.LogWarning(
                    "Register pipeline completed: httpStatus={StatusCode} hasStarted={HasStarted} contentLength={ContentLength}",
                    response.StatusCode,
                    response.HasStarted,
                    response.ContentLength?.ToString() ?? "unknown");
                Console.Error.WriteLine(
                    $"[RegisterPipeline] completed status={response.StatusCode} hasStarted={response.HasStarted}");
            }
        }
    }
}
