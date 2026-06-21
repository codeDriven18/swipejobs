using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Common.Mapping;
using SwipeJobs.Application.Modules.Messaging.Interfaces;
using SwipeJobs.Application.Modules.Personalization.Interfaces;
using SwipeJobs.Application.Modules.Portal.Interfaces;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace SwipeJobs.Application.Modules.Portal.Services;

public partial class CompanyPortalService : ICompanyPortalService
{
    private static readonly HashSet<ApplicationStatus> EmployerSettableStatuses =
    [
        ApplicationStatus.UnderReview,
        ApplicationStatus.Interviewing,
        ApplicationStatus.OfferSent,
        ApplicationStatus.Hired,
        ApplicationStatus.Rejected,
    ];

    private readonly IJobRepository _jobRepository;
    private readonly IApplicationRepository _applicationRepository;
    private readonly ICompanyRepository _companyRepository;
    private readonly ISourceRepository _sourceRepository;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationService _notificationService;
    private readonly IMessagingService _messagingService;
    private readonly IConversationRepository _conversationRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IResumeStorageService _resumeStorage;
    private readonly IRecruiterTagRepository _recruiterTagRepository;
    private readonly IApplicationRecruiterNoteRepository _recruiterNoteRepository;
    private readonly ICurrentUserService _currentUser;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CompanyPortalService> _logger;

    public CompanyPortalService(
        IJobRepository jobRepository,
        IApplicationRepository applicationRepository,
        ICompanyRepository companyRepository,
        ISourceRepository sourceRepository,
        IAuditLogService auditLogService,
        INotificationService notificationService,
        IMessagingService messagingService,
        IConversationRepository conversationRepository,
        IMessageRepository messageRepository,
        IResumeStorageService resumeStorage,
        IRecruiterTagRepository recruiterTagRepository,
        IApplicationRecruiterNoteRepository recruiterNoteRepository,
        ICurrentUserService currentUser,
        IUnitOfWork unitOfWork,
        ILogger<CompanyPortalService> logger)
    {
        _jobRepository = jobRepository;
        _applicationRepository = applicationRepository;
        _companyRepository = companyRepository;
        _sourceRepository = sourceRepository;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
        _messagingService = messagingService;
        _conversationRepository = conversationRepository;
        _messageRepository = messageRepository;
        _resumeStorage = resumeStorage;
        _recruiterTagRepository = recruiterTagRepository;
        _recruiterNoteRepository = recruiterNoteRepository;
        _currentUser = currentUser;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<CompanyPortalStatsDto> GetStatsAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        var jobs = await _jobRepository.GetByCompanyIdAsync(companyId, cancellationToken);
        var applications = await _applicationRepository.GetByCompanyIdAsync(companyId, null, cancellationToken);
        var weekAgo = DateTime.UtcNow.AddDays(-7);

        return new CompanyPortalStatsDto(
            jobs.Count,
            jobs.Count(j => j.IsActive && !j.IsArchived),
            jobs.Count(j => j.IsArchived),
            applications.Count,
            applications.Count(a => a.AppliedAt >= weekAgo),
            company?.Status ?? CompanyStatus.Pending);
    }

    public async Task<IReadOnlyList<JobDto>> GetJobsAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        var jobs = await _jobRepository.GetByCompanyIdAsync(companyId, cancellationToken);
        return jobs.Select(JobMapper.ToDto).ToList();
    }

    public async Task<JobDto> CreateJobAsync(
        Guid companyId, PortalCreateJobDto dto, CancellationToken cancellationToken = default)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken)
            ?? throw new InvalidOperationException("Company not found.");

        _logger.LogInformation(
            "Portal job create companyId={CompanyId} companyStatus={CompanyStatus} title={Title}",
            companyId,
            company.Status,
            dto.Title);

        if (company.Status != CompanyStatus.Approved)
            throw new InvalidOperationException("Company must be approved before publishing jobs.");

        var source = await _sourceRepository.GetFirstAsync(cancellationToken)
            ?? throw new InvalidOperationException("No job source configured.");

        var job = new Job
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            CompanyId = companyId,
            Location = dto.Location,
            City = dto.City,
            Category = dto.Category,
            Level = dto.Level,
            IsRemote = dto.IsRemote,
            SalaryMin = dto.SalaryMin,
            SalaryMax = dto.SalaryMax,
            ExpiresAt = dto.ExpiresAt,
            ExternalUrl = dto.ExternalUrl,
            JobImageUrl = string.IsNullOrWhiteSpace(dto.JobImageUrl)
                ? JobBrandingDefaults.ResolveDefaultJobImageUrl(dto.Category, dto.Title.Trim())
                : dto.JobImageUrl.Trim(),
            SourceId = source.Id,
            IsActive = true,
            IsArchived = false,
            ContentFingerprint = JobContentFingerprint.Compute(
                dto.Title.Trim(), companyId, dto.City, source.Id, dto.ExternalUrl),
        };

        await _jobRepository.AddAsync(job, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.JobCreated,
            AuditEntityType.Job,
            job.Id,
            $"Company portal created job \"{job.Title}\"",
            cancellationToken: cancellationToken);

        if (dto.TagIds is { Count: > 0 })
        {
            await _jobRepository.SetTagsAsync(job.Id, dto.TagIds, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation("Portal job created companyId={CompanyId} jobId={JobId}", companyId, job.Id);

        return (await _jobRepository.GetByIdWithDetailsAsync(job.Id, cancellationToken) is { } created
            ? JobMapper.ToDto(created)
            : JobMapper.ToDto(job));
    }

    public async Task<JobDto?> UpdateJobAsync(
        Guid companyId, Guid jobId, PortalUpdateJobDto dto, CancellationToken cancellationToken = default)
    {
        var job = await _jobRepository.GetByIdAsync(jobId, cancellationToken);
        if (job is null || job.CompanyId != companyId) return null;

        job.Title = dto.Title.Trim();
        job.Description = dto.Description.Trim();
        job.Location = dto.Location;
        job.City = dto.City;
        job.Category = dto.Category;
        job.Level = dto.Level;
        job.IsRemote = dto.IsRemote;
        job.IsActive = dto.IsActive;
        job.SalaryMin = dto.SalaryMin;
        job.SalaryMax = dto.SalaryMax;
        job.ExpiresAt = dto.ExpiresAt;
        job.ExternalUrl = dto.ExternalUrl;
        job.JobImageUrl = dto.JobImageUrl;
        job.ContentFingerprint = JobContentFingerprint.Compute(
            dto.Title.Trim(), companyId, dto.City, job.SourceId, dto.ExternalUrl);

        await _jobRepository.UpdateAsync(job, cancellationToken);
        if (dto.TagIds is not null)
            await _jobRepository.SetTagsAsync(job.Id, dto.TagIds, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.JobUpdated,
            AuditEntityType.Job,
            jobId,
            $"Company portal updated job \"{job.Title}\"",
            cancellationToken: cancellationToken);

        var updated = await _jobRepository.GetByIdWithDetailsAsync(jobId, cancellationToken);
        return updated is null ? null : JobMapper.ToDto(updated);
    }

    public async Task<bool> ArchiveJobAsync(Guid companyId, Guid jobId, CancellationToken cancellationToken = default)
    {
        var job = await _jobRepository.GetByIdAsync(jobId, cancellationToken);
        if (job is null || job.CompanyId != companyId) return false;

        job.IsArchived = true;
        job.IsActive = false;
        await _jobRepository.UpdateAsync(job, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.JobArchived,
            AuditEntityType.Job,
            jobId,
            $"Company portal archived job \"{job.Title}\"",
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<IReadOnlyList<PortalApplicationDto>> GetApplicationsAsync(
        Guid companyId, Guid? jobId, CancellationToken cancellationToken = default)
    {
        var applications = await _applicationRepository.GetByCompanyIdAsync(companyId, jobId, cancellationToken);
        if (applications.Count == 0)
            return [];

        var applicationIds = applications.Select(a => a.Id).ToList();
        var conversationIdsByApplication = await _conversationRepository
            .GetConversationIdsByApplicationIdsAsync(applicationIds, cancellationToken);
        var unreadByConversation = await _messageRepository.CountUnreadForCompanyByConversationIdsAsync(
            companyId,
            conversationIdsByApplication.Values.ToList(),
            cancellationToken);

        return applications.Select(application =>
        {
            var unread = 0;
            if (conversationIdsByApplication.TryGetValue(application.Id, out var conversationId)
                && unreadByConversation.TryGetValue(conversationId, out var count))
            {
                unread = count;
            }

            return PortalApplicationMapper.ToDto(application, unread);
        }).ToList();
    }

    public async Task<PortalApplicantDetailDto?> GetApplicantDetailAsync(
        Guid companyId, Guid applicationId, CancellationToken cancellationToken = default)
    {
        var application = await _applicationRepository.GetByIdForCompanyAsync(applicationId, companyId, cancellationToken);
        if (application?.UserProfile is null) return null;

        var profile = application.UserProfile;
        var history = await _applicationRepository.GetByUserProfileAndJobIdAsync(
            profile.Id, application.JobId, cancellationToken);

        var statusHistory = ApplicationStatusHistorySerializer.Deserialize(application.StatusHistoryJson)
            .Select(h => new ApplicationStatusHistoryDto(h.Status, h.ChangedAt))
            .ToList();

        var applicationHistory = history
            .OrderBy(a => a.AppliedAt)
            .Select(a => new PortalApplicationSummaryDto(
                a.Id,
                a.Status,
                a.AppliedAt,
                ApplicationWorkflow.ToApplicationNumber(a.ReapplicationCount)))
            .ToList();

        var conversation = await _conversationRepository.GetByApplicationIdAsync(application.Id, cancellationToken);
        var messagingUnlocked = ApplicationWorkflow.IsMessagingUnlocked(application.Status)
            && conversation?.Status == ConversationStatus.Active;

        return new PortalApplicantDetailDto(
            application.Id,
            application.Status,
            application.AppliedAt,
            application.JobId,
            application.Job?.Title ?? "Job",
            profile.Id,
            profile.FirstName,
            profile.LastName,
            profile.Email,
            profile.Phone,
            profile.Headline,
            profile.Bio,
            profile.Location,
            profile.JobSeekingStatus.ToString(),
            profile.ProfileImageUrl,
            profile.LinkedInUrl,
            profile.GitHubUrl,
            profile.WebsiteUrl,
            !string.IsNullOrWhiteSpace(profile.ResumeUrl) || !string.IsNullOrWhiteSpace(profile.ResumeFileName),
            profile.ResumeFileName,
            profile.ResumeFileSize,
            profile.ResumeUploadedAt,
            application.ReapplicationCount,
            ApplicationWorkflow.ToApplicationNumber(application.ReapplicationCount),
            ApplicationStatusCatalog.ResolveInterviewPhase(application.Status, application.InterviewPhase),
            application.InterviewScheduledAtUtc,
            application.InterviewLocation,
            application.InterviewNotes,
            statusHistory,
            applicationHistory,
            profile.Skills.Select(s => new SkillDto(s.Id, s.Name, s.Level)).ToList(),
            profile.Experiences.Select(e => new ExperienceDto(
                e.Id, e.Company, e.Title, e.Description, e.StartDate, e.EndDate, e.IsCurrent)).ToList(),
            profile.Educations.Select(e => new EducationDto(
                e.Id, e.Institution, e.Degree, e.FieldOfStudy, e.StartDate, e.EndDate, e.IsCurrent)).ToList(),
            CandidateTrustCalculator.Compute(profile),
            CandidateTrustCalculator.CountSignals(profile),
            conversation?.Id,
            messagingUnlocked,
            application.RecruiterRating,
            application.IsFavorite,
            application.RejectionReason,
            application.RecruiterTags
                .Select(t => new RecruiterTagDto(t.TagId, t.Tag?.Name ?? string.Empty))
                .OrderBy(t => t.Name)
                .ToList(),
            application.RecruiterNotes
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new PortalRecruiterNoteDto(n.Id, n.Text, n.AuthorUserId, n.CreatedAt))
                .ToList(),
            ApplicationActivityLogSerializer.BuildTimeline(application.StatusHistoryJson, application.ActivityLogJson)
                .Select(e => new PortalRecruiterActivityDto(e.Type, e.OccurredAt, e.UserId, e.Details))
                .ToList());
    }

    public async Task<PortalApplicationDto?> UpdateApplicationStatusAsync(
        Guid companyId, Guid applicationId, ApplicationStatus status, string? rejectionReason = null, CancellationToken cancellationToken = default)
    {
        if (!EmployerSettableStatuses.Contains(status))
            throw new InvalidOperationException("Invalid application status for employer update.");

        var application = await _applicationRepository.GetByIdAsync(applicationId, cancellationToken);
        if (application is null) return null;

        var job = await _jobRepository.GetByIdAsync(application.JobId, cancellationToken);
        if (job is null || job.CompanyId != companyId) return null;

        if (application.Status == ApplicationStatus.Withdrawn)
            throw new InvalidOperationException("Cannot update a withdrawn application.");

        var previous = application.Status;
        var changedAt = DateTime.UtcNow;
        application.Status = status;
        SyncInterviewPhaseForStatus(application, status);
        if (status == ApplicationStatus.Rejected)
        {
            application.RejectionReason = string.IsNullOrWhiteSpace(rejectionReason)
                ? null
                : rejectionReason.Trim();
            application.ActivityLogJson = ApplicationActivityLogSerializer.Append(
                application.ActivityLogJson,
                RecruiterActivityType.Rejected,
                changedAt,
                _currentUser.GetRequiredUserId(),
                application.RejectionReason);
        }
        else if (status != ApplicationStatus.Rejected)
        {
            application.RejectionReason = null;
        }

        application.StatusHistoryJson = ApplicationStatusHistorySerializer.Append(
            application.StatusHistoryJson, status, changedAt);
        await _applicationRepository.UpdateAsync(application, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _messagingService.SyncConversationStatusForApplicationAsync(
            applicationId, status, previous, cancellationToken);

        _logger.LogInformation(
            "Application status updated applicationId={ApplicationId} companyId={CompanyId} from={Previous} to={Status}",
            applicationId,
            companyId,
            previous,
            status);

        await _auditLogService.LogAsync(
            AuditAction.AdminAction,
            AuditEntityType.Application,
            applicationId,
            $"Status changed from {previous} to {status}",
            cancellationToken: cancellationToken);

        var jobTitle = job.Title;
        await _notificationService.NotifyApplicationStatusChangedAsync(
            application.UserProfileId,
            applicationId,
            status,
            jobTitle,
            cancellationToken);

        var refreshed = await _applicationRepository.GetByIdForCompanyAsync(applicationId, companyId, cancellationToken);
        return refreshed is null ? null : PortalApplicationMapper.ToDto(refreshed);
    }

    public async Task<PortalApplicationDto?> ScheduleInterviewAsync(
        Guid companyId, Guid applicationId, PortalScheduleInterviewDto dto, CancellationToken cancellationToken = default)
    {
        var application = await _applicationRepository.GetByIdAsync(applicationId, cancellationToken);
        if (application is null) return null;

        var job = await _jobRepository.GetByIdAsync(application.JobId, cancellationToken);
        if (job is null || job.CompanyId != companyId) return null;

        if (application.Status is ApplicationStatus.Withdrawn or ApplicationStatus.Rejected or ApplicationStatus.Hired)
            throw new InvalidOperationException("Cannot schedule an interview for a closed application.");

        var previous = application.Status;
        var changedAt = DateTime.UtcNow;

        application.InterviewScheduledAtUtc = DateTime.SpecifyKind(dto.ScheduledAtUtc, DateTimeKind.Utc);
        application.InterviewLocation = string.IsNullOrWhiteSpace(dto.Location) ? null : dto.Location.Trim();
        application.InterviewNotes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
        application.InterviewPhase = InterviewPhase.Scheduled;
        application.Status = ApplicationStatus.Interviewing;

        if (previous != ApplicationStatus.Interviewing)
        {
            application.StatusHistoryJson = ApplicationStatusHistorySerializer.Append(
                application.StatusHistoryJson, ApplicationStatus.Interviewing, changedAt);
        }

        var scheduleDetails = $"{application.InterviewScheduledAtUtc:u}";
        if (!string.IsNullOrWhiteSpace(application.InterviewLocation))
            scheduleDetails += $" · {application.InterviewLocation}";
        application.ActivityLogJson = ApplicationActivityLogSerializer.Append(
            application.ActivityLogJson,
            RecruiterActivityType.InterviewScheduled,
            changedAt,
            _currentUser.GetRequiredUserId(),
            scheduleDetails);

        await _applicationRepository.UpdateAsync(application, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _messagingService.SyncConversationStatusForApplicationAsync(
            applicationId, ApplicationStatus.Interviewing, previous, cancellationToken);

        _logger.LogInformation(
            "Interview scheduled applicationId={ApplicationId} companyId={CompanyId} scheduledAt={ScheduledAt}",
            applicationId,
            companyId,
            application.InterviewScheduledAtUtc);

        await _auditLogService.LogAsync(
            AuditAction.AdminAction,
            AuditEntityType.Application,
            applicationId,
            $"Interview scheduled for {application.InterviewScheduledAtUtc:u}",
            cancellationToken: cancellationToken);

        if (previous != ApplicationStatus.Interviewing)
        {
            await _notificationService.NotifyApplicationStatusChangedAsync(
                application.UserProfileId,
                applicationId,
                ApplicationStatus.Interviewing,
                job.Title,
                cancellationToken);
        }

        var refreshed = await _applicationRepository.GetByIdForCompanyAsync(applicationId, companyId, cancellationToken);
        return refreshed is null ? null : PortalApplicationMapper.ToDto(refreshed);
    }

    private static void SyncInterviewPhaseForStatus(Domain.Entities.Application application, ApplicationStatus status)
    {
        switch (status)
        {
            case ApplicationStatus.InterviewInvited:
                application.InterviewPhase = InterviewPhase.Requested;
                application.InterviewScheduledAtUtc = null;
                break;
            case ApplicationStatus.Interviewing:
                application.InterviewPhase = application.InterviewPhase == InterviewPhase.None
                    ? InterviewPhase.Scheduled
                    : application.InterviewPhase;
                break;
            case ApplicationStatus.OfferSent:
            case ApplicationStatus.Hired:
            case ApplicationStatus.Rejected:
                application.InterviewPhase = InterviewPhase.Completed;
                break;
            case ApplicationStatus.UnderReview:
            case ApplicationStatus.Shortlisted:
            case ApplicationStatus.Applied:
                application.InterviewPhase = InterviewPhase.None;
                application.InterviewScheduledAtUtc = null;
                break;
        }
    }

    public async Task<(Stream Content, string ContentType, string FileName)?> OpenApplicantResumeAsync(
        Guid companyId, Guid applicationId, CancellationToken cancellationToken = default)
    {
        var application = await _applicationRepository.GetByIdForCompanyAsync(applicationId, companyId, cancellationToken);

        if (application is null)
        {
            _logger.LogWarning(
                "Resume download 404: application not found or not owned by company. applicationId={ApplicationId} companyId={CompanyId} reason=application_not_found",
                applicationId, companyId);
            return null;
        }

        var profile = application.UserProfile;
        if (profile is null)
        {
            _logger.LogWarning(
                "Resume download 404: application has no UserProfile loaded. applicationId={ApplicationId} companyId={CompanyId} userProfileId={UserProfileId} reason=profile_null",
                applicationId, companyId, application.UserProfileId);
            return null;
        }

        _logger.LogInformation(
            "Resume download attempt applicationId={ApplicationId} companyId={CompanyId} userProfileId={UserProfileId} status={Status} resumeUrl={ResumeUrl} resumeFileName={ResumeFileName} resumeUploadedAt={ResumeUploadedAt}",
            applicationId, companyId, profile.Id, application.Status,
            profile.ResumeUrl ?? "(null)", profile.ResumeFileName ?? "(null)", profile.ResumeUploadedAt);

        if (string.IsNullOrWhiteSpace(profile.ResumeUrl))
        {
            _logger.LogWarning(
                "Resume download 404: ResumeUrl is empty. applicationId={ApplicationId} userProfileId={UserProfileId} resumeFileName={ResumeFileName} reason=resume_url_empty",
                applicationId, profile.Id, profile.ResumeFileName ?? "(null)");
            return null;
        }

        var opened = await _resumeStorage.OpenReadAsync(profile.ResumeUrl, cancellationToken);
        if (opened is null)
        {
            _logger.LogWarning(
                "Resume download 404: stored file not found in resume storage. applicationId={ApplicationId} userProfileId={UserProfileId} resumeUrl={ResumeUrl} reason=file_missing_in_storage",
                applicationId, profile.Id, profile.ResumeUrl);
            return null;
        }

        var fileName = profile.ResumeFileName ?? opened.Value.FileName;
        _logger.LogInformation(
            "Resume download success applicationId={ApplicationId} userProfileId={UserProfileId} fileName={FileName}",
            applicationId, profile.Id, fileName);
        return (opened.Value.Content, opened.Value.ContentType, fileName);
    }

    public async Task<CompanyDto?> GetCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company is null) return null;
        var openJobs = await _companyRepository.CountOpenJobsAsync(companyId, cancellationToken);
        return CompanyMapper.ToDto(company, openJobs);
    }

    public async Task<CompanyDto?> UpdateCompanyAsync(
        Guid companyId, PortalUpdateCompanyDto dto, CancellationToken cancellationToken = default)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company is null) return null;

        company.Description = dto.Description.Trim();
        company.Industry = dto.Industry.Trim();
        company.Location = dto.Location.Trim();
        company.CompanySize = dto.CompanySize.Trim();
        company.LogoUrl = string.IsNullOrWhiteSpace(dto.LogoUrl) ? company.LogoUrl : dto.LogoUrl.Trim();
        company.BannerUrl = string.IsNullOrWhiteSpace(dto.BannerUrl) ? company.BannerUrl : dto.BannerUrl.Trim();
        company.Website = string.IsNullOrWhiteSpace(dto.Website) ? null : dto.Website.Trim();
        company.LinkedInUrl = string.IsNullOrWhiteSpace(dto.LinkedInUrl) ? null : dto.LinkedInUrl.Trim();
        company.TwitterUrl = string.IsNullOrWhiteSpace(dto.TwitterUrl) ? null : dto.TwitterUrl.Trim();
        company.InstagramUrl = string.IsNullOrWhiteSpace(dto.InstagramUrl) ? null : dto.InstagramUrl.Trim();
        company.Culture = string.IsNullOrWhiteSpace(dto.Culture) ? null : dto.Culture.Trim();
        company.Benefits = string.IsNullOrWhiteSpace(dto.Benefits) ? null : dto.Benefits.Trim();
        company.HiringPhilosophy = string.IsNullOrWhiteSpace(dto.HiringPhilosophy) ? null : dto.HiringPhilosophy.Trim();

        await _companyRepository.UpdateAsync(company, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var openJobs = await _companyRepository.CountOpenJobsAsync(companyId, cancellationToken);
        return CompanyMapper.ToDto(company, openJobs);
    }
}
