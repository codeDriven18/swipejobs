using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Modules.Admin.Interfaces;
using SwipeJobs.Application.Modules.Companies.Interfaces;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly IAdminSearchService _adminSearchService;
    private readonly ICompanyService _companyService;
    private readonly ICurrentUserService _currentUser;

    public AdminController(
        IAdminService adminService,
        IAdminSearchService adminSearchService,
        ICompanyService companyService,
        ICurrentUserService currentUser)
    {
        _adminService = adminService;
        _adminSearchService = adminSearchService;
        _companyService = companyService;
        _currentUser = currentUser;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> Stats(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        return Ok(await _adminService.GetStatsAsync(cancellationToken));
    }

    [HttpGet("users")]
    public async Task<IActionResult> Users(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        return Ok(await _adminService.GetUsersAsync(cancellationToken));
    }

    [HttpPatch("users/{id:guid}/role")]
    public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateUserRoleDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        var ok = await _adminService.UpdateUserRoleAsync(id, dto, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("companies")]
    public async Task<IActionResult> Companies(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        return Ok(await _adminService.GetCompaniesAsync(cancellationToken));
    }

    [HttpPatch("companies/{id:guid}/active")]
    public async Task<IActionResult> SetCompanyActive(Guid id, [FromBody] bool isActive, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        var ok = await _adminService.SetCompanyActiveAsync(id, isActive, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpPatch("companies/{id:guid}/status")]
    public async Task<IActionResult> SetCompanyStatus(Guid id, [FromBody] UpdateCompanyStatusDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        var ok = await _adminService.SetCompanyStatusAsync(id, dto.Status, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("companies")]
    public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        var company = await _companyService.CreateAsync(dto, cancellationToken);
        return Ok(company);
    }

    [HttpGet("jobs")]
    public async Task<IActionResult> Jobs(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        return Ok(await _adminService.GetJobsAsync(cancellationToken));
    }

    [HttpPost("jobs")]
    public async Task<IActionResult> CreateJob([FromBody] AdminCreateJobDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        var job = await _adminService.CreateJobAsync(dto, cancellationToken);
        return Ok(job);
    }

    [HttpPut("jobs/{id:guid}")]
    public async Task<IActionResult> UpdateJob(Guid id, [FromBody] AdminUpdateJobDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        var job = await _adminService.UpdateJobAsync(id, dto, cancellationToken);
        return job is null ? NotFound() : Ok(job);
    }

    [HttpPatch("jobs/{id:guid}/active")]
    public async Task<IActionResult> SetJobActive(Guid id, [FromBody] bool isActive, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        var ok = await _adminService.SetJobActiveAsync(id, isActive, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("jobs/{id:guid}/archive")]
    public async Task<IActionResult> ArchiveJob(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        var ok = await _adminService.ArchiveJobAsync(id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("jobs/{id:guid}/unarchive")]
    public async Task<IActionResult> UnarchiveJob(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        var ok = await _adminService.UnarchiveJobAsync(id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> Notifications([FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        _currentUser.RequireRole(UserRole.Admin);
        return Ok(await _adminService.GetNotificationsAsync(limit, cancellationToken));
    }

    [HttpPost("notifications")]
    public async Task<IActionResult> CreateNotification([FromBody] CreateAdminNotificationDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        var notification = await _adminService.CreateNotificationAsync(dto, cancellationToken);
        return Ok(notification);
    }

    [HttpDelete("notifications/{id:guid}")]
    public async Task<IActionResult> DeleteNotification(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        var ok = await _adminService.DeleteNotificationAsync(id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("applications")]
    public async Task<IActionResult> Applications(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        return Ok(await _adminService.GetApplicationsAsync(cancellationToken));
    }

    [HttpGet("audit")]
    public async Task<IActionResult> AuditLogs([FromQuery] AuditLogQueryDto query, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        return Ok(await _adminService.GetAuditLogsAsync(query, cancellationToken));
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> Analytics([FromQuery] int days = 30, CancellationToken cancellationToken = default)
    {
        _currentUser.RequireRole(UserRole.Admin);
        return Ok(await _adminService.GetAnalyticsAsync(days, cancellationToken));
    }

    [HttpGet("system")]
    public async Task<IActionResult> SystemHealth(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Admin);
        return Ok(await _adminService.GetSystemHealthAsync(cancellationToken));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, CancellationToken cancellationToken = default)
    {
        _currentUser.RequireRole(UserRole.Admin);
        return Ok(await _adminSearchService.SearchAsync(q ?? string.Empty, cancellationToken));
    }
}
