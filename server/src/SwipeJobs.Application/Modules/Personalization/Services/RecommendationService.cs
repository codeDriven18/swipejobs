using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Common.Mapping;
using SwipeJobs.Application.Common.Personalization;
using SwipeJobs.Application.Modules.Personalization.Interfaces;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Personalization.Services;

public class RecommendationService : IRecommendationService
{
    private readonly IJobRepository _jobRepository;
    private readonly IInterestService _interestService;
    private readonly IUserActivityRepository _activityRepository;
    private readonly IApplicationRepository _applicationRepository;
    private readonly ISavedJobRepository _savedJobRepository;
    private readonly ICompanyFollowRepository _companyFollowRepository;
    private readonly ITrendingService _trendingService;
    private readonly ILogger<RecommendationService> _logger;

    public RecommendationService(
        IJobRepository jobRepository,
        IInterestService interestService,
        IUserActivityRepository activityRepository,
        IApplicationRepository applicationRepository,
        ISavedJobRepository savedJobRepository,
        ICompanyFollowRepository companyFollowRepository,
        ITrendingService trendingService,
        ILogger<RecommendationService> logger)
    {
        _jobRepository = jobRepository;
        _interestService = interestService;
        _activityRepository = activityRepository;
        _applicationRepository = applicationRepository;
        _savedJobRepository = savedJobRepository;
        _companyFollowRepository = companyFollowRepository;
        _trendingService = trendingService;
        _logger = logger;
    }

    public async Task<IReadOnlyList<JobDto>> GetRecommendedJobsAsync(
        Guid userProfileId, int limit, CancellationToken cancellationToken = default)
    {
        var startedAt = DateTime.UtcNow;
        _logger.LogInformation(
            "Recommendation calculation start profileId={ProfileId} limit={Limit}",
            userProfileId,
            limit);

        try
        {
            var interests = await _interestService.GetAsync(userProfileId, cancellationToken)
                ?? await _interestService.RecalculateAsync(userProfileId, cancellationToken);

        var applications = await _applicationRepository.GetByUserProfileIdAsync(userProfileId, cancellationToken);
        var saved = await _savedJobRepository.GetByUserProfileIdAsync(userProfileId, cancellationToken);
        var skippedIds = (await _activityRepository.GetRecentByUserAndTypeAsync(
            userProfileId, ActivityType.JobSkipped, 100, cancellationToken))
            .Where(a => a.JobId.HasValue)
            .Select(a => a.JobId!.Value)
            .ToHashSet();

        var excluded = applications.Select(a => a.JobId)
            .Concat(saved.Select(s => s.JobId))
            .ToHashSet();

        var followedCompanyIds = (await _companyFollowRepository.GetFollowedCompanyIdsAsync(userProfileId, cancellationToken))
            .ToHashSet();

        var (jobs, _) = await _jobRepository.SearchAsync(new JobQueryDto(
            Search: null, Page: 1, PageSize: 50), cancellationToken);

        var categories = interests.PreferredCategories;
        var technologies = interests.PreferredTechnologies;
        var cities = interests.PreferredCities;

        var scored = jobs
            .Where(j => !excluded.Contains(j.Id))
            .Select(j => (Job: j, Score: ScoreJob(j, categories, technologies, cities, interests, skippedIds, followedCompanyIds)))
            .OrderByDescending(x => x.Score)
            .Take(limit)
            .Select(x => x.Job)
            .ToList();

        var badges = await _trendingService.GetTrendingBadgesAsync(scored.Select(j => j.Id), cancellationToken);
        var result = scored.Select(j => JobMapper.ToDto(j, badges.GetValueOrDefault(j.Id, Array.Empty<string>()))).ToList();

        _logger.LogInformation(
            "Recommendation calculation end profileId={ProfileId} count={Count} elapsedMs={ElapsedMs}",
            userProfileId,
            result.Count,
            (DateTime.UtcNow - startedAt).TotalMilliseconds);

        return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Recommendation calculation failed profileId={ProfileId} elapsedMs={ElapsedMs}",
                userProfileId,
                (DateTime.UtcNow - startedAt).TotalMilliseconds);
            throw;
        }
    }

    private static double ScoreJob(
        Job job,
        IReadOnlyDictionary<string, int> categories,
        IReadOnlyDictionary<string, int> technologies,
        IReadOnlyDictionary<string, int> cities,
        UserInterestDto interests,
        HashSet<Guid> skippedIds,
        HashSet<Guid> followedCompanyIds)
    {
        double score = 0;

        score += categories.GetValueOrDefault(job.Category.ToString()) * 2.0;

        foreach (var tag in job.JobTags)
        {
            var slug = tag.Tag.Slug ?? tag.Tag.Name;
            score += technologies.GetValueOrDefault(slug) * 1.5;
        }

        var cityKey = job.IsRemote ? "Remote" : (job.City ?? job.Location ?? "Flexible");
        score += cities.GetValueOrDefault(cityKey) * 1.2;

        if (interests.PreferredSalaryMin.HasValue && job.SalaryMax.HasValue
            && job.SalaryMax >= interests.PreferredSalaryMin)
            score += 3;

        if (interests.PreferredSalaryMax.HasValue && job.SalaryMin.HasValue
            && job.SalaryMin <= interests.PreferredSalaryMax)
            score += 2;

        if (followedCompanyIds.Contains(job.CompanyId))
            score += 8;

        if (skippedIds.Contains(job.Id))
            score -= 10;

        score += job.CreatedAt > DateTime.UtcNow.AddDays(-14) ? 1 : 0;

        return score;
    }
}
