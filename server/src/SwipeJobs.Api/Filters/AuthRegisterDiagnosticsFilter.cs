using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using SwipeJobs.Infrastructure.Auth;

namespace SwipeJobs.Api.Filters;

public sealed class AuthRegisterDiagnosticsFilter : IAsyncAlwaysRunResultFilter
{
    private readonly ILogger<AuthRegisterDiagnosticsFilter> _logger;

    public AuthRegisterDiagnosticsFilter(ILogger<AuthRegisterDiagnosticsFilter> logger)
    {
        _logger = logger;
    }

    public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        if (!IsRegisterRequest(context.HttpContext))
        {
            await next();
            return;
        }

        var result = context.Result;
        _logger.LogWarning(
            "Register result executing: resultType={ResultType} declaredStatus={DeclaredStatus}",
            result?.GetType().Name ?? "null",
            result switch
            {
                ObjectResult objectResult => objectResult.StatusCode?.ToString() ?? "default-200",
                StatusCodeResult statusCodeResult => statusCodeResult.StatusCode.ToString(),
                _ => "n/a",
            });

        if (result is ObjectResult { Value: not null } objectResultWithValue)
        {
            _logger.LogWarning(
                "Register ObjectResult payload type={PayloadType}",
                objectResultWithValue.Value.GetType().FullName);
        }

        try
        {
            await next();
        }
        catch (Exception ex)
        {
            RegisterFlowDiagnostics.LogFullExceptionChain(
                _logger,
                "Register result execution failed during response serialization",
                ex);
            throw;
        }

        var response = context.HttpContext.Response;
        _logger.LogWarning(
            "Register result executed: httpStatus={StatusCode} hasStarted={HasStarted} contentType={ContentType}",
            response.StatusCode,
            response.HasStarted,
            response.ContentType ?? "(none)");
    }

    private static bool IsRegisterRequest(HttpContext context)
        => context.Request.Path.StartsWithSegments("/api/auth/register", StringComparison.OrdinalIgnoreCase);
}
