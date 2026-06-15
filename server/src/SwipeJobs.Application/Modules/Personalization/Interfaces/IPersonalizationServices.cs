using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Personalization.Interfaces;

public interface IActivityService
{
    Task<UserActivityDto> RecordAsync(RecordActivityDto dto, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> GetRecentViewedJobIdsAsync(Guid userProfileId, int limit, CancellationToken cancellationToken = default);
}

public interface IInterestService
{
    Task<UserInterestDto> RecalculateAsync(Guid userProfileId, CancellationToken cancellationToken = default);
    Task<UserInterestDto?> GetAsync(Guid userProfileId, CancellationToken cancellationToken = default);
}

public interface IRecommendationService
{
    Task<IReadOnlyList<JobDto>> GetRecommendedJobsAsync(Guid userProfileId, int limit, CancellationToken cancellationToken = default);
}

public interface ITrendingService
{
    Task<IReadOnlyList<JobDto>> GetTrendingJobsAsync(int limit, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, IReadOnlyList<string>>> GetTrendingBadgesAsync(IEnumerable<Guid> jobIds, CancellationToken cancellationToken = default);
}

public interface ICompanyFollowService
{
    Task<IReadOnlyList<CompanyFollowDto>> GetByUserAsync(Guid userProfileId, CancellationToken cancellationToken = default);
    Task<CompanyFollowDto> FollowAsync(CreateCompanyFollowDto dto, CancellationToken cancellationToken = default);
    Task<bool> UnfollowAsync(Guid userProfileId, Guid companyId, CancellationToken cancellationToken = default);
    Task<bool> IsFollowingAsync(Guid userProfileId, Guid companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<JobDto>> GetNewJobsFromFollowedAsync(Guid userProfileId, int limit, CancellationToken cancellationToken = default);
}

public interface INotificationService
{
    Task<IReadOnlyList<NotificationDto>> GetByUserAsync(Guid userProfileId, int limit, CancellationToken cancellationToken = default);
    Task<int> GetUnreadCountAsync(Guid userProfileId, CancellationToken cancellationToken = default);
    Task<bool> MarkReadAsync(Guid id, Guid userProfileId, CancellationToken cancellationToken = default);
    Task MarkAllReadAsync(Guid userProfileId, CancellationToken cancellationToken = default);
    Task<bool> DismissAsync(Guid id, Guid userProfileId, CancellationToken cancellationToken = default);
    Task DismissAllAsync(Guid userProfileId, CancellationToken cancellationToken = default);
    Task GenerateForDashboardAsync(Guid userProfileId, CancellationToken cancellationToken = default);
    Task<NotificationDto> CreateAsync(Guid userProfileId, string title, string message, CancellationToken cancellationToken = default);
    Task NotifyApplicationStatusChangedAsync(
        Guid userProfileId,
        Guid applicationId,
        ApplicationStatus status,
        string jobTitle,
        CancellationToken cancellationToken = default);
    Task NotifyInterviewInvitedAsync(
        Guid userProfileId,
        Guid applicationId,
        Guid conversationId,
        string jobTitle,
        string companyName,
        CancellationToken cancellationToken = default);
    Task NotifyNewMessageAsync(
        Guid userProfileId,
        Guid conversationId,
        Guid applicationId,
        string companyName,
        string preview,
        CancellationToken cancellationToken = default);
    Task NotifyNewMessageToCompanyAsync(
        Guid companyId,
        Guid conversationId,
        Guid applicationId,
        string candidateName,
        string preview,
        CancellationToken cancellationToken = default);
    Task NotifyApplicationReappliedAsync(
        Guid companyId,
        string applicantName,
        string jobTitle,
        int applicationNumber,
        CancellationToken cancellationToken = default);
}
