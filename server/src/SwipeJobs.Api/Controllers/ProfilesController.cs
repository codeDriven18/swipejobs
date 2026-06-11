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
    private readonly ILogger<ProfilesController> _logger;

    public ProfilesController(
        IUserProfileService profileService,
        ICurrentUserService currentUser,
        ILogger<ProfilesController> logger)
    {
        _profileService = profileService;
        _currentUser = currentUser;
        _logger = logger;
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

        _logger.LogInformation(
            "PUT /api/profiles/me userId={UserId} email={Email} headline={Headline} location={Location} educations={EducationCount} skills={SkillCount} experiences={ExperienceCount}",
            userId,
            dto.Email,
            dto.Headline,
            dto.Location,
            dto.Educations?.Count ?? -1,
            dto.Skills?.Count ?? -1,
            dto.Experiences?.Count ?? -1);

        try
        {
            var profile = await _profileService.UpdateForCurrentUserAsync(userId, dto, cancellationToken);
            if (profile is null)
            {
                _logger.LogWarning("PUT /api/profiles/me returned NotFound for userId={UserId}", userId);
                return NotFound(new { error = "Profile not found." });
            }

            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PUT /api/profiles/me failed for userId={UserId}", userId);
            throw;
        }
    }

    [Authorize]
    [HttpPost("me/avatar")]
    [RequestSizeLimit(512_000)]
    public async Task<IActionResult> UploadAvatar(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No image file provided." });

        var userId = _currentUser.GetRequiredUserId();
        _logger.LogInformation(
            "POST /api/profiles/me/avatar userId={UserId} fileName={FileName} length={Length} contentType={ContentType}",
            userId,
            file.FileName,
            file.Length,
            file.ContentType);

        try
        {
            await using var stream = file.OpenReadStream();
            var profile = await _profileService.UploadAvatarAsync(
                userId,
                stream,
                file.ContentType,
                file.Length,
                cancellationToken);

            return profile is null
                ? NotFound(new { error = "Profile not found." })
                : Ok(new ProfileAvatarUploadDto(profile.ProfileImageUrl ?? string.Empty));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize]
    [HttpDelete("me/avatar")]
    public async Task<IActionResult> RemoveAvatar(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var profile = await _profileService.RemoveAvatarAsync(userId, cancellationToken);
        return profile is null ? NotFound() : NoContent();
    }

    [HttpPost("me/resume")]
    [RequestSizeLimit(768_000)]
    public async Task<IActionResult> UploadResume(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No resume file provided." });

        var userId = _currentUser.GetRequiredUserId();
        try
        {
            await using var stream = file.OpenReadStream();
            var profile = await _profileService.UploadResumeAsync(
                userId, stream, file.FileName, file.ContentType, file.Length, cancellationToken);
            return profile is null
                ? NotFound(new { error = "Profile not found." })
                : Ok(new ProfileResumeUploadDto(profile.ResumeFileName ?? file.FileName, profile.ResumeUploadedAt ?? DateTime.UtcNow));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("me/resume")]
    public async Task<IActionResult> RemoveResume(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var profile = await _profileService.RemoveResumeAsync(userId, cancellationToken);
        return profile is null ? NotFound() : NoContent();
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
