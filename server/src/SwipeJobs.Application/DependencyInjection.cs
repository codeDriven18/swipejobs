using Microsoft.Extensions.DependencyInjection;
using SwipeJobs.Application.Modules.Ingestion.Services;
using SwipeJobs.Application.Modules.Admin.Interfaces;
using SwipeJobs.Application.Modules.Admin.Services;
using SwipeJobs.Application.Modules.Applications.Interfaces;
using SwipeJobs.Application.Modules.Applications.Services;
using SwipeJobs.Application.Modules.Companies.Interfaces;
using SwipeJobs.Application.Modules.Companies.Services;
using SwipeJobs.Application.Modules.Dashboard.Interfaces;
using SwipeJobs.Application.Modules.Dashboard.Services;
using SwipeJobs.Application.Modules.Jobs.Interfaces;
using SwipeJobs.Application.Modules.Portal.Interfaces;
using SwipeJobs.Application.Modules.Portal.Services;
using SwipeJobs.Application.Modules.Jobs.Services;
using SwipeJobs.Application.Modules.Personalization.Interfaces;
using SwipeJobs.Application.Modules.Personalization.Services;
using SwipeJobs.Application.Modules.Profiles.Interfaces;
using SwipeJobs.Application.Modules.Profiles.Services;
using SwipeJobs.Application.Modules.SavedJobs.Interfaces;
using SwipeJobs.Application.Modules.SavedJobs.Services;
using SwipeJobs.Application.Modules.Sources.Interfaces;
using SwipeJobs.Application.Modules.Sources.Services;
using SwipeJobs.Application.Modules.Tags.Interfaces;
using SwipeJobs.Application.Modules.Tags.Services;

namespace SwipeJobs.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IActivityService, ActivityService>();
        services.AddScoped<IInterestService, InterestService>();
        services.AddScoped<IRecommendationService, RecommendationService>();
        services.AddScoped<ITrendingService, TrendingService>();
        services.AddScoped<ICompanyFollowService, CompanyFollowService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<ICompanyService, CompanyService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<IAdminSearchService, AdminSearchService>();
        services.AddScoped<ICompanyPortalService, CompanyPortalService>();
        services.AddScoped<IJobService, JobService>();
        services.AddScoped<IUserProfileService, UserProfileService>();
        services.AddScoped<IApplicationService, ApplicationService>();
        services.AddScoped<ISavedJobService, SavedJobService>();
        services.AddScoped<ITagService, TagService>();
        services.AddScoped<ISourceService, SourceService>();
        services.AddScoped<IAdminSourceService, AdminSourceService>();
        services.AddScoped<JobExtractionService>();
        services.AddScoped<JobNormalizer>();
        services.AddScoped<JobQualityScoringService>();
        services.AddScoped<IngestionPipelineService>();
        services.AddScoped<IJobPublishService, JobPublishService>();
        services.AddScoped<IModerationService, ModerationService>();
        services.AddScoped<IJobLifecycleService, JobLifecycleService>();
        services.AddScoped<JobIngestionService>();

        return services;
    }
}
