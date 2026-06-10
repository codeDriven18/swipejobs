using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Modules.Profiles.Interfaces;

namespace SwipeJobs.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfilesController : ControllerBase
{
    private readonly IUserProfileService _profileService;
    private readonly ICurrentUserService _currentUser;

    public ProfilesController(IUserProfileService profileService, ICurrentUserService currentUser)
    {
        _profileService = profileService;
        _currentUser = currentUser;
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var profile = await _profileService.GetByUserIdAsync(_currentUser.GetRequiredUserId(), cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [Authorize]
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateUserProfileDto dto, CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var profile = await _profileService.UpdateForCurrentUserAsync(userId, dto, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [Authorize]
    [HttpGet("me/completeness")]
    public async Task<IActionResult> CheckMyCompleteness(CancellationToken cancellationToken)
    {
        var existing = await _profileService.GetByUserIdAsync(_currentUser.GetRequiredUserId(), cancellationToken);
        if (existing is null) return NotFound();

        var result = await _profileService.CheckCompletenessAsync(existing.Id, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var own = await _profileService.GetByUserIdAsync(_currentUser.GetRequiredUserId(), cancellationToken);
        if (own is null || own.Id != id) return Forbid();

        return Ok(own);
    }
}
