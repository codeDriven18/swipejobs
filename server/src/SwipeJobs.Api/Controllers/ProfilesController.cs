using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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

    [AllowAnonymous]
    [HttpGet("public/{id:guid}")]
    public async Task<IActionResult> GetPublic(Guid id, CancellationToken cancellationToken)
    {
        var profile = await _profileService.GetPublicShareAsync(id, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var sw = Stopwatch.StartNew();
        _logger.LogInformation("GET /api/profiles/me start userId={UserId}", userId);

        try
        {
            var profile = await _profileService.GetByUserIdAsync(userId, cancellationToken);
            if (profile is null)
            {
                var email = User.FindFirstValue(ClaimTypes.Email)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Email)
                    ?? string.Empty;
                profile = await _profileService.EnsureForUserAsync(userId, email, cancellationToken);
            }

            _logger.LogInformation(
                "GET /api/profiles/me end userId={UserId} profileId={ProfileId} elapsedMs={ElapsedMs}",
                userId,
                profile.Id,
                sw.ElapsedMilliseconds);

            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "GET /api/profiles/me failed userId={UserId} elapsedMs={ElapsedMs}",
                userId,
                sw.ElapsedMilliseconds);
            throw;
        }
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
            var existing = await _profileService.GetByUserIdAsync(userId, cancellationToken);
            if (existing is null)
            {
                var email = dto.Email?.Trim()
                    ?? User.FindFirstValue(ClaimTypes.Email)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Email)
                    ?? string.Empty;
                await _profileService.EnsureForUserAsync(userId, email, cancellationToken);
            }

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
            await EnsureProfileAsync(userId, cancellationToken);

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

    [Authorize]
    [HttpPost("me/banner")]
    [RequestSizeLimit(768_000)]
    public async Task<IActionResult> UploadBanner(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No image file provided." });

        var userId = _currentUser.GetRequiredUserId();
        try
        {
            await EnsureProfileAsync(userId, cancellationToken);

            await using var stream = file.OpenReadStream();
            var profile = await _profileService.UploadBannerAsync(
                userId,
                stream,
                file.ContentType,
                file.Length,
                cancellationToken);

            return profile is null
                ? NotFound(new { error = "Profile not found." })
                : Ok(new ProfileBannerUploadDto(profile.BannerUrl ?? string.Empty));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize]
    [HttpDelete("me/banner")]
    public async Task<IActionResult> RemoveBanner(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var profile = await _profileService.RemoveBannerAsync(userId, cancellationToken);
        return profile is null ? NotFound() : NoContent();
    }

    [Authorize]
    [HttpPost("me/resume")]
    [RequestSizeLimit(5_242_880)]
    public async Task<IActionResult> UploadResume(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No resume file provided." });

        var userId = _currentUser.GetRequiredUserId();
        try
        {
            await EnsureProfileAsync(userId, cancellationToken);

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

    [Authorize]
    [HttpDelete("me/resume")]
    public async Task<IActionResult> RemoveResume(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var profile = await _profileService.RemoveResumeAsync(userId, cancellationToken);
        return profile is null ? NotFound() : NoContent();
    }

    [Authorize]
    [HttpGet("me/resume")]
    public async Task<IActionResult> DownloadResume(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var opened = await _profileService.OpenResumeForUserAsync(userId, cancellationToken);
        if (opened is null)
            return NotFound(new { error = "No resume on file." });

        var (stream, contentType, fileName) = opened.Value;
        return File(stream, contentType, fileName);
    }

    [Authorize]
    [HttpGet("me/completeness")]
    public async Task<IActionResult> CheckMyCompleteness(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var existing = await _profileService.GetByUserIdAsync(userId, cancellationToken);
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

    private async Task EnsureProfileAsync(Guid userId, CancellationToken cancellationToken)
    {
        var existing = await _profileService.GetByUserIdAsync(userId, cancellationToken);
        if (existing is not null) return;

        var email = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Email)
            ?? string.Empty;
        await _profileService.EnsureForUserAsync(userId, email, cancellationToken);
    }
}
