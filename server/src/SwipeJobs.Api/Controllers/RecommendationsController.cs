using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Personalization.Interfaces;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RecommendationsController : ControllerBase
{
    private readonly IRecommendationService _recommendationService;
    private readonly IUserProfileRepository _profileRepository;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<RecommendationsController> _logger;

    public RecommendationsController(
        IRecommendationService recommendationService,
        IUserProfileRepository profileRepository,
        ICurrentUserService currentUser,
        ILogger<RecommendationsController> logger)
    {
        _recommendationService = recommendationService;
        _profileRepository = profileRepository;
        _currentUser = currentUser;
        _logger = logger;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMine([FromQuery] int limit = 12, CancellationToken cancellationToken = default)
    {
        if (_currentUser.Role is UserRole.Company)
            return Ok(Array.Empty<object>());

        var userId = _currentUser.GetRequiredUserId();
        var sw = Stopwatch.StartNew();
        _logger.LogInformation("GET /api/recommendations/me start userId={UserId} limit={Limit}", userId, limit);

        var profileId = _currentUser.ProfileId;
        if (!profileId.HasValue)
        {
            var profile = await _profileRepository.GetByUserIdAsync(userId, cancellationToken);
            profileId = profile?.Id;
            if (profileId.HasValue)
            {
                _logger.LogInformation(
                    "GET /api/recommendations/me resolved profileId={ProfileId} from userId={UserId}",
                    profileId,
                    userId);
            }
        }

        if (!profileId.HasValue)
        {
            _logger.LogWarning(
                "GET /api/recommendations/me no profile userId={UserId} elapsedMs={ElapsedMs}",
                userId,
                sw.ElapsedMilliseconds);
            return Ok(Array.Empty<object>());
        }

        try
        {
            var jobs = await _recommendationService.GetRecommendedJobsAsync(
                profileId.Value,
                Math.Clamp(limit, 1, 24),
                cancellationToken);

            _logger.LogInformation(
                "GET /api/recommendations/me ok profileId={ProfileId} count={Count} elapsedMs={ElapsedMs}",
                profileId,
                jobs.Count,
                sw.ElapsedMilliseconds);

            return Ok(jobs);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "GET /api/recommendations/me failed profileId={ProfileId} elapsedMs={ElapsedMs}",
                profileId,
                sw.ElapsedMilliseconds);
            throw;
        }
    }
}
