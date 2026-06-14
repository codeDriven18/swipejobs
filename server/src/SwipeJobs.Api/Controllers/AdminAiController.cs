using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SwipeJobs.Application.Common.Configuration;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Modules.Ingestion.Interfaces;
using SwipeJobs.Application.Modules.Ingestion.Models;
using SwipeJobs.Application.Modules.Ingestion.Services;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Api.Controllers;

[ApiController]
[Route("api/admin/ai")]
[Authorize]
public class AdminAiController : ControllerBase
{
    private const string ConnectionTestMessage = """
        Senior .NET Developer at Acme Corp. Remote position. Salary $120k-$150k USD.
        Requirements: C#, ASP.NET Core, PostgreSQL. Apply: careers@acme.com
        """;

    private readonly IAiExtractionService _extractionService;
    private readonly IJobExtractionProvider _provider;
    private readonly AiConfigurationRuntimeInfo _runtimeInfo;
    private readonly AiExtractionDiagnosticsState _diagnostics;
    private readonly AiExtractionQueueMetrics _queueMetrics;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<AdminAiController> _logger;

    public AdminAiController(
        IAiExtractionService extractionService,
        IJobExtractionProvider provider,
        AiConfigurationRuntimeInfo runtimeInfo,
        AiExtractionDiagnosticsState diagnostics,
        AiExtractionQueueMetrics queueMetrics,
        ICurrentUserService currentUser,
        ILogger<AdminAiController> logger)
    {
        _extractionService = extractionService;
        _provider = provider;
        _runtimeInfo = runtimeInfo;
        _diagnostics = diagnostics;
        _queueMetrics = queueMetrics;
        _currentUser = currentUser;
        _logger = logger;
    }

    [HttpGet("diagnostics")]
    public IActionResult GetDiagnostics()
    {
        _currentUser.RequireRole(UserRole.Admin);

        return Ok(new AiDiagnosticsDto(
            _runtimeInfo.Provider,
            _runtimeInfo.ProviderSource,
            _runtimeInfo.Model,
            _runtimeInfo.ModelSource,
            _runtimeInfo.ApiKeyConfigured,
            _diagnostics.LastSuccessfulExtractionAt,
            _diagnostics.LastExtractionFailureAt,
            _diagnostics.LastExtractionFailure,
            _diagnostics.MessagesProcessed,
            _diagnostics.SuccessRate,
            _queueMetrics.Snapshot()));
    }

    [HttpPost("test-connection")]
    public async Task<IActionResult> TestConnection(CancellationToken cancellationToken = default)
    {
        _currentUser.RequireRole(UserRole.Admin);

        _logger.LogInformation(
            "Admin AI connection test requested. Provider={Provider}, Model={Model}",
            _provider.ProviderName,
            _runtimeInfo.Model);

        var result = await _provider.ExtractJobAsync(ConnectionTestMessage, cancellationToken);

        var dto = new AiConnectionTestResultDto(
            _provider.ProviderName,
            _runtimeInfo.Model,
            result.Success,
            result.ProcessingTimeMs,
            result.Success ? null : result.ErrorMessage,
            result.HttpStatusCode);

        if (!result.Success)
        {
            _logger.LogWarning(
                "Admin AI connection test failed. Provider={Provider}, Model={Model}, Error={Error}, Status={Status}",
                dto.Provider,
                dto.Model,
                dto.Error,
                dto.HttpStatusCode);
            return StatusCode(StatusCodes.Status502BadGateway, dto);
        }

        _logger.LogInformation(
            "Admin AI connection test succeeded. Provider={Provider}, Model={Model}, LatencyMs={LatencyMs}",
            dto.Provider,
            dto.Model,
            dto.LatencyMs);

        return Ok(dto);
    }

    [HttpPost("test-extraction")]
    public async Task<IActionResult> TestExtraction(
        [FromBody] TestExtractionRequest request,
        CancellationToken cancellationToken = default)
    {
        _currentUser.RequireRole(UserRole.Admin);

        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { error = "message is required." });

        _logger.LogInformation(
            "Admin AI test extraction requested. MessageLength={Length}",
            request.Message.Length);

        var result = await _extractionService.ExtractJobAsync(request.Message, cancellationToken);

        if (!result.Success)
        {
            _logger.LogWarning(
                "Admin AI test extraction failed. Provider={Provider}, Model={Model}, Error={Error}",
                result.Provider,
                result.Model,
                result.ErrorMessage);
            return StatusCode(StatusCodes.Status502BadGateway, result);
        }

        _logger.LogInformation(
            "Admin AI test extraction succeeded. Provider={Provider}, Model={Model}, Confidence={Confidence}, ProcessingTimeMs={ProcessingTimeMs}",
            result.Provider,
            result.Model,
            result.Result?.Confidence,
            result.ProcessingTimeMs);

        return Ok(result);
    }

    public sealed record TestExtractionRequest(string Message);
}
