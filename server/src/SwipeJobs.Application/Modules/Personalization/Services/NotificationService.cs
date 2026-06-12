using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Personalization.Interfaces;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Personalization.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepository;
    private readonly IUserProfileRepository _profileRepository;
    private readonly ICompanyMemberRepository _companyMemberRepository;
    private readonly ICompanyFollowRepository _companyFollowRepository;
    private readonly IJobRepository _jobRepository;
    private readonly IRecommendationService _recommendationService;
    private readonly INotificationPublisher _publisher;
    private readonly IUnitOfWork _unitOfWork;

    public NotificationService(
        INotificationRepository notificationRepository,
        IUserProfileRepository profileRepository,
        ICompanyMemberRepository companyMemberRepository,
        ICompanyFollowRepository companyFollowRepository,
        IJobRepository jobRepository,
        IRecommendationService recommendationService,
        IUnitOfWork unitOfWork,
        INotificationPublisher publisher)
    {
        _notificationRepository = notificationRepository;
        _profileRepository = profileRepository;
        _companyMemberRepository = companyMemberRepository;
        _companyFollowRepository = companyFollowRepository;
        _jobRepository = jobRepository;
        _recommendationService = recommendationService;
        _unitOfWork = unitOfWork;
        _publisher = publisher;
    }

    public async Task<IReadOnlyList<NotificationDto>> GetByUserAsync(
        Guid userProfileId, int limit, CancellationToken cancellationToken = default)
    {
        var items = await _notificationRepository.GetByUserProfileIdAsync(userProfileId, limit, cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public Task<int> GetUnreadCountAsync(Guid userProfileId, CancellationToken cancellationToken = default)
        => _notificationRepository.GetUnreadCountAsync(userProfileId, cancellationToken);

    public async Task<bool> MarkReadAsync(Guid id, Guid userProfileId, CancellationToken cancellationToken = default)
    {
        var notification = await _notificationRepository.GetByIdAsync(id, cancellationToken);
        if (notification is null || notification.UserProfileId != userProfileId) return false;

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await _notificationRepository.UpdateAsync(notification, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task MarkAllReadAsync(Guid userProfileId, CancellationToken cancellationToken = default)
    {
        await _notificationRepository.MarkAllReadAsync(userProfileId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task GenerateForDashboardAsync(Guid userProfileId, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByIdWithDetailsAsync(userProfileId, cancellationToken);
        if (profile is null) return;

        var created = false;

        ProfileCompletenessChecker.UpdateFlag(profile);
        var pct = ProfileCompletenessChecker.CalculatePercentage(profile);
        if (pct < 100)
        {
            var title = "Complete your profile";
            if (!await _notificationRepository.ExistsAsync(userProfileId, title, null, cancellationToken))
            {
                var notification = new Notification
                {
                    UserProfileId = userProfileId,
                    Type = NotificationType.ProfileCompletenessReminder,
                    Title = title,
                    Message = $"You're at {pct}% — finish your profile to unlock Quick Apply everywhere.",
                    IsRead = false,
                };
                await _notificationRepository.AddAsync(notification, cancellationToken);
                await PublishIfNeededAsync(userProfileId, notification, cancellationToken);
                created = true;
            }
        }

        var followedIds = await _companyFollowRepository.GetFollowedCompanyIdsAsync(userProfileId, cancellationToken);
        foreach (var companyId in followedIds)
        {
            var (jobs, _) = await _jobRepository.SearchAsync(new JobQueryDto(
                Search: null, Page: 1, PageSize: 3,
                CompanyId: companyId, SortBy: "createdAt", SortOrder: "desc"), cancellationToken);

            foreach (var job in jobs.Where(j => j.CreatedAt > DateTime.UtcNow.AddDays(-7)))
            {
                var title = $"New job at {job.Company?.Name ?? "a followed company"}";
                if (await _notificationRepository.ExistsAsync(userProfileId, title, job.Id, cancellationToken))
                    continue;

                var notification = new Notification
                {
                    UserProfileId = userProfileId,
                    Type = NotificationType.NewJobFromFollowedCompany,
                    Title = title,
                    Message = job.Title,
                    RelatedJobId = job.Id,
                    RelatedCompanyId = companyId,
                    IsRead = false,
                };
                await _notificationRepository.AddAsync(notification, cancellationToken);
                await PublishIfNeededAsync(userProfileId, notification, cancellationToken);
                created = true;
            }
        }

        var recommended = await _recommendationService.GetRecommendedJobsAsync(userProfileId, 1, cancellationToken);
        if (recommended.Count > 0)
        {
            var job = recommended[0];
            var title = "New pick for you";
            if (!await _notificationRepository.ExistsAsync(userProfileId, title, job.Id, cancellationToken))
            {
                var notification = new Notification
                {
                    UserProfileId = userProfileId,
                    Type = NotificationType.RecommendedJob,
                    Title = title,
                    Message = $"Based on your activity: {job.Title}",
                    RelatedJobId = job.Id,
                    IsRead = false,
                };
                await _notificationRepository.AddAsync(notification, cancellationToken);
                await PublishIfNeededAsync(userProfileId, notification, cancellationToken);
                created = true;
            }
        }

        if (created)
            await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<NotificationDto> CreateAsync(
        Guid userProfileId, string title, string message, CancellationToken cancellationToken = default)
    {
        var notification = new Notification
        {
            UserProfileId = userProfileId,
            Type = NotificationType.RecommendedJob,
            Title = title.Trim(),
            Message = message.Trim(),
            IsRead = false,
        };

        await _notificationRepository.AddAsync(notification, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = ToDto(notification);
        await _publisher.PublishAsync(userProfileId, dto, cancellationToken);

        return dto;
    }

    public async Task NotifyApplicationStatusChangedAsync(
        Guid userProfileId,
        Guid applicationId,
        ApplicationStatus status,
        string jobTitle,
        CancellationToken cancellationToken = default)
    {
        if (status is not (ApplicationStatus.Rejected or ApplicationStatus.Accepted))
            return;

        var statusLabel = status switch
        {
            ApplicationStatus.Accepted => "Accepted",
            ApplicationStatus.Rejected => "Rejected",
            _ => status.ToString(),
        };

        var title = status switch
        {
            ApplicationStatus.Accepted => $"Application accepted: {jobTitle}",
            ApplicationStatus.Rejected => $"Application rejected: {jobTitle}",
            _ => $"Application update: {jobTitle}",
        };
        var message = status switch
        {
            ApplicationStatus.Rejected => $"Your application for {jobTitle} was not selected. You can update your profile and apply again when you're ready.",
            ApplicationStatus.Accepted => $"Congratulations — your application for {jobTitle} was accepted!",
            _ => $"Your application status is now {statusLabel}.",
        };

        if (await _notificationRepository.ExistsAsync(userProfileId, title, applicationId, cancellationToken))
            return;

        var notification = new Notification
        {
            UserProfileId = userProfileId,
            Type = NotificationType.ApplicationStatusChanged,
            Title = title,
            Message = message,
            RelatedJobId = applicationId,
            IsRead = false,
        };

        await _notificationRepository.AddAsync(notification, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _publisher.PublishAsync(userProfileId, ToDto(notification), cancellationToken);
    }

    public async Task NotifyApplicationReappliedAsync(
        Guid companyId,
        string applicantName,
        string jobTitle,
        int applicationNumber,
        CancellationToken cancellationToken = default)
    {
        var memberProfileIds = await _companyMemberRepository.GetMemberProfileIdsByCompanyIdAsync(
            companyId, cancellationToken);

        if (memberProfileIds.Count == 0)
            return;

        var title = $"Reapplication #{applicationNumber}: {jobTitle}";
        var message = $"{applicantName} submitted application #{applicationNumber} for {jobTitle}.";

        foreach (var profileId in memberProfileIds)
        {
            if (await _notificationRepository.ExistsAsync(profileId, title, companyId, cancellationToken))
                continue;

            var notification = new Notification
            {
                UserProfileId = profileId,
                Type = NotificationType.ApplicationReapplied,
                Title = title,
                Message = message,
                RelatedCompanyId = companyId,
                IsRead = false,
            };

            await _notificationRepository.AddAsync(notification, cancellationToken);
            await _publisher.PublishAsync(profileId, ToDto(notification), cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private Task PublishIfNeededAsync(Guid userProfileId, Notification notification, CancellationToken cancellationToken)
        => _publisher.PublishAsync(userProfileId, ToDto(notification), cancellationToken);

    private static NotificationDto ToDto(Notification n) => new(
        n.Id, n.Type, n.Title, n.Message, n.IsRead, n.ReadAt,
        n.RelatedJobId, n.RelatedCompanyId, n.CreatedAt);
}
