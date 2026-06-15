using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Common.Mapping;
using SwipeJobs.Application.Modules.Applications.Interfaces;
using SwipeJobs.Application.Modules.Personalization.Interfaces;
using SwipeJobs.Domain.Enums;
using ApplicationEntity = SwipeJobs.Domain.Entities.Application;

namespace SwipeJobs.Application.Modules.Applications.Services;

public class ApplicationService : IApplicationService
{
    private readonly IApplicationRepository _applicationRepository;
    private readonly IConversationRepository _conversationRepository;
    private readonly IUserProfileRepository _profileRepository;
    private readonly IJobRepository _jobRepository;
    private readonly IActivityService _activityService;
    private readonly INotificationService _notificationService;
    private readonly IUnitOfWork _unitOfWork;

    public ApplicationService(
        IApplicationRepository applicationRepository,
        IConversationRepository conversationRepository,
        IUserProfileRepository profileRepository,
        IJobRepository jobRepository,
        IActivityService activityService,
        INotificationService notificationService,
        IUnitOfWork unitOfWork)
    {
        _applicationRepository = applicationRepository;
        _conversationRepository = conversationRepository;
        _profileRepository = profileRepository;
        _jobRepository = jobRepository;
        _activityService = activityService;
        _notificationService = notificationService;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<ApplicationDto>> GetByUserProfileIdAsync(
        Guid userProfileId,
        CancellationToken cancellationToken = default)
    {
        var applications = await _applicationRepository.GetByUserProfileIdAsync(userProfileId, cancellationToken);
        var conversationIds = await _conversationRepository.GetConversationIdsByApplicationIdsAsync(
            applications.Select(a => a.Id), cancellationToken);

        return applications.Select(a =>
        {
            var jobDto = a.Job is not null ? JobMapper.ToDto(a.Job) : null;
            conversationIds.TryGetValue(a.Id, out var conversationId);
            return ProfileMapper.ToDto(a, jobDto, conversationId == default ? null : conversationId);
        }).ToList();
    }

    public async Task<ApplicationDto> ApplyAsync(CreateApplicationDto dto, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByIdWithDetailsAsync(dto.UserProfileId, cancellationToken)
            ?? throw new KeyNotFoundException("Profile not found.");

        ProfileCompletenessChecker.UpdateFlag(profile);
        if (!profile.IsProfileComplete)
        {
            var check = ProfileCompletenessChecker.Check(profile);
            throw new InvalidOperationException(
                $"Profile incomplete. Missing: {string.Join(", ", check.MissingFields)}");
        }

        var job = await _jobRepository.GetByIdWithDetailsAsync(dto.JobId, cancellationToken)
            ?? throw new KeyNotFoundException("Job not found.");

        if (!job.IsActive)
            throw new InvalidOperationException("Job is no longer active.");

        var priorApplications = await _applicationRepository.GetByUserProfileAndJobIdAsync(
            dto.UserProfileId, dto.JobId, cancellationToken);

        var latest = priorApplications.FirstOrDefault();
        if (latest is not null && ApplicationWorkflow.BlocksNewApplication(latest.Status))
            throw new InvalidOperationException("You have already applied to this job.");

        var isReapplication = latest is not null;
        var appliedAt = DateTime.UtcNow;
        var application = new ApplicationEntity
        {
            UserProfileId = dto.UserProfileId,
            JobId = dto.JobId,
            Status = ApplicationStatus.Applied,
            AppliedAt = appliedAt,
            ReapplicationCount = priorApplications.Count,
            StatusHistoryJson = ApplicationStatusHistorySerializer.CreateInitial(ApplicationStatus.Applied, appliedAt),
        };

        await _applicationRepository.AddAsync(application, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _activityService.RecordAsync(new RecordActivityDto(
            dto.UserProfileId, ActivityType.JobApplied, dto.JobId, job.CompanyId), cancellationToken);

        if (isReapplication)
        {
            var applicantName = $"{profile.FirstName} {profile.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(applicantName))
                applicantName = profile.Email;

            await _notificationService.NotifyApplicationReappliedAsync(
                job.CompanyId,
                applicantName,
                job.Title,
                ApplicationWorkflow.ToApplicationNumber(application.ReapplicationCount),
                cancellationToken);
        }

        return ProfileMapper.ToDto(application, JobMapper.ToDto(job));
    }

    public async Task<bool> WithdrawAsync(Guid id, Guid userProfileId, CancellationToken cancellationToken = default)
    {
        var application = await _applicationRepository.GetByIdAsync(id, cancellationToken);
        if (application is null || application.UserProfileId != userProfileId) return false;

        if (application.Status is ApplicationStatus.Withdrawn
            or ApplicationStatus.Hired
            or ApplicationStatus.Rejected)
            return false;

        var changedAt = DateTime.UtcNow;
        application.Status = ApplicationStatus.Withdrawn;
        application.StatusHistoryJson = ApplicationStatusHistorySerializer.Append(
            application.StatusHistoryJson, ApplicationStatus.Withdrawn, changedAt);

        await _applicationRepository.UpdateAsync(application, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var conversation = await _conversationRepository.GetByApplicationIdTrackedAsync(application.Id, cancellationToken);
        if (conversation is not null)
        {
            conversation.Status = Domain.Enums.ConversationStatus.ReadOnly;
            conversation.ClosedAt = changedAt;
            await _conversationRepository.UpdateAsync(conversation, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return true;
    }
}
