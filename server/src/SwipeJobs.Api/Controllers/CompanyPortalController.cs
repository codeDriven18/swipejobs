using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Modules.Portal.Interfaces;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Api.Controllers;

[ApiController]
[Route("api/portal")]
[Authorize]
public class CompanyPortalController : ControllerBase
{
    private readonly ICompanyPortalService _portalService;
    private readonly ICurrentUserService _currentUser;

    public CompanyPortalController(ICompanyPortalService portalService, ICurrentUserService currentUser)
    {
        _portalService = portalService;
        _currentUser = currentUser;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> Stats(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        return Ok(await _portalService.GetStatsAsync(companyId, cancellationToken));
    }

    [HttpGet("jobs")]
    public async Task<IActionResult> Jobs(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        return Ok(await _portalService.GetJobsAsync(companyId, cancellationToken));
    }

    [HttpPost("jobs")]
    public async Task<IActionResult> CreateJob([FromBody] PortalCreateJobDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var job = await _portalService.CreateJobAsync(companyId, dto, cancellationToken);
        return Ok(job);
    }

    [HttpPut("jobs/{id:guid}")]
    public async Task<IActionResult> UpdateJob(Guid id, [FromBody] PortalUpdateJobDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var job = await _portalService.UpdateJobAsync(companyId, id, dto, cancellationToken);
        return job is null ? NotFound() : Ok(job);
    }

    [HttpPost("jobs/{id:guid}/archive")]
    public async Task<IActionResult> ArchiveJob(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var ok = await _portalService.ArchiveJobAsync(companyId, id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("applications")]
    public async Task<IActionResult> Applications([FromQuery] Guid? jobId, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        return Ok(await _portalService.GetApplicationsAsync(companyId, jobId, cancellationToken));
    }

    [HttpGet("company")]
    public async Task<IActionResult> Company(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var company = await _portalService.GetCompanyAsync(companyId, cancellationToken);
        return company is null ? NotFound() : Ok(company);
    }

    [HttpPut("company")]
    public async Task<IActionResult> UpdateCompany([FromBody] PortalUpdateCompanyDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var company = await _portalService.UpdateCompanyAsync(companyId, dto, cancellationToken);
        return company is null ? NotFound() : Ok(company);
    }
}
