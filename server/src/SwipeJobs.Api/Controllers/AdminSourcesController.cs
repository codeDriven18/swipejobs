using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Modules.Ingestion;
using SwipeJobs.Application.Modules.Sources.Interfaces;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Api.Controllers;

[ApiController]
[Route("api/admin/sources")]
[Authorize]
public class AdminSourcesController : ControllerBase
{
    private readonly IAdminSourceService _adminSourceService;
    private readonly ICurrentUserService _currentUser;

    public AdminSourcesController(IAdminSourceService adminSourceService, ICurrentUserService currentUser)
    {
        _adminSourceService = adminSourceService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        RequireAdmin();
        return Ok(await _adminSourceService.GetAllWithMetricsAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        RequireAdmin();
        var source = await _adminSourceService.GetWithMetricsAsync(id, cancellationToken);
        return source is null ? NotFound() : Ok(source);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAdminSourceDto dto, CancellationToken cancellationToken)
    {
        RequireAdmin();
        try
        {
            var source = await _adminSourceService.CreateAsync(dto, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = source.Id }, source);
        }
        catch (IngestionPipelineException ex)
        {
            return UnprocessableEntity(new { error = ex.Message, code = ex.Code });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAdminSourceDto dto, CancellationToken cancellationToken)
    {
        RequireAdmin();
        try
        {
            var source = await _adminSourceService.UpdateAsync(id, dto, cancellationToken);
            return source is null ? NotFound() : Ok(source);
        }
        catch (IngestionPipelineException ex)
        {
            return UnprocessableEntity(new { error = ex.Message, code = ex.Code });
        }
    }

    [HttpPatch("{id:guid}/enabled")]
    public async Task<IActionResult> SetEnabled(Guid id, [FromBody] bool enabled, CancellationToken cancellationToken)
    {
        RequireAdmin();
        var ok = await _adminSourceService.SetEnabledAsync(id, enabled, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        RequireAdmin();
        var ok = await _adminSourceService.DeleteAsync(id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/test-connection")]
    public async Task<IActionResult> TestConnection(Guid id, CancellationToken cancellationToken)
    {
        RequireAdmin();
        try
        {
            return Ok(await _adminSourceService.TestConnectionAsync(id, cancellationToken));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("{id:guid}/logs")]
    public async Task<IActionResult> GetLogs(Guid id, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        RequireAdmin();
        return Ok(await _adminSourceService.GetLogsAsync(id, limit, cancellationToken));
    }

    [HttpGet("dashboard/ingestion")]
    public async Task<IActionResult> DashboardIngestion(CancellationToken cancellationToken)
    {
        RequireAdmin();
        return Ok(await _adminSourceService.GetDashboardIngestionAsync(cancellationToken));
    }

    [HttpGet("extraction-queue")]
    public IActionResult GetExtractionQueueMetrics()
    {
        RequireAdmin();
        var snapshot = _adminSourceService.GetExtractionQueueMetrics();
        return Ok(new AiExtractionQueueMetricsDto(
            snapshot.Queued,
            snapshot.Processing,
            snapshot.Completed,
            snapshot.Failed,
            snapshot.RateLimited,
            snapshot.IsInCooldown,
            snapshot.CooldownUntilUtc));
    }

    private void RequireAdmin() => _currentUser.RequireRole(UserRole.Admin);
}
