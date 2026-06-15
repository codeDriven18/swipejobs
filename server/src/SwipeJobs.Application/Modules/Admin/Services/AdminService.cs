using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Common.Mapping;
using SwipeJobs.Application.Modules.Admin.Interfaces;
using SwipeJobs.Application.Modules.Jobs.Interfaces;
using SwipeJobs.Application.Modules.Messaging.Interfaces;
using SwipeJobs.Application.Modules.Personalization.Interfaces;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Admin.Services;

public class AdminService : IAdminService
{
    private readonly IUserRepository _userRepository;
    private readonly ICompanyRepository _companyRepository;
    private readonly IJobRepository _jobRepository;
    private readonly IJobService _jobService;
    private readonly ISourceRepository _sourceRepository;
    private readonly INotificationRepository _notificationRepository;
    private readonly IApplicationRepository _applicationRepository;
    private readonly INotificationService _notificationService;
    private readonly IAuditLogRepository _auditLogRepository;
    private readonly IAuditLogService _auditLogService;
    private readonly IMessagingService _messagingService;
    private readonly IUnitOfWork _unitOfWork;

    public AdminService(
        IUserRepository userRepository,
        ICompanyRepository companyRepository,
        IJobRepository jobRepository,
        IJobService jobService,
        ISourceRepository sourceRepository,
        INotificationRepository notificationRepository,
        IApplicationRepository applicationRepository,
        INotificationService notificationService,
        IAuditLogRepository auditLogRepository,
        IAuditLogService auditLogService,
        IMessagingService messagingService,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _companyRepository = companyRepository;
        _jobRepository = jobRepository;
        _jobService = jobService;
        _sourceRepository = sourceRepository;
        _notificationRepository = notificationRepository;
        _applicationRepository = applicationRepository;
        _notificationService = notificationService;
        _auditLogRepository = auditLogRepository;
        _auditLogService = auditLogService;
        _messagingService = messagingService;
        _unitOfWork = unitOfWork;
    }

    public async Task<AdminStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var users = await _userRepository.GetAllWithDetailsAsync(cancellationToken);
        var companies = await _companyRepository.GetAllAsync(cancellationToken);
        var jobs = await _jobRepository.GetAllWithDetailsAsync(cancellationToken);
        var notifications = await _notificationRepository.GetRecentAsync(500, cancellationToken);

        var messaging = await _messagingService.GetMetricsAsync(cancellationToken);

        return new AdminStatsDto(
            users.Count,
            companies.Count,
            jobs.Count,
            jobs.Count(j => j.IsActive && !j.IsArchived),
            jobs.Count(j => j.IsArchived),
            await _applicationRepository.CountAsync(cancellationToken),
            notifications.Count(n => !n.IsRead),
            messaging);
    }

    public async Task<IReadOnlyList<AdminUserDto>> GetUsersAsync(CancellationToken cancellationToken = default)
    {
        var users = await _userRepository.GetAllWithDetailsAsync(cancellationToken);
        var profileIds = users
            .Where(u => u.Profile?.Id is Guid)
            .Select(u => u.Profile!.Id)
            .ToList();
        var applicationCounts = await _applicationRepository.GetApplicationCountsByProfileIdsAsync(
            profileIds,
            cancellationToken);

        var result = new List<AdminUserDto>();
        foreach (var u in users)
        {
            var appCount = u.Profile?.Id is Guid profileId && applicationCounts.TryGetValue(profileId, out var count)
                ? count
                : 0;

            result.Add(new AdminUserDto(
                u.Id,
                u.Email,
                u.Role,
                u.CreatedAt,
                u.LastLoginAt,
                u.Profile?.Id,
                u.CompanyMembership?.CompanyId,
                u.CompanyMembership?.Company?.Name,
                appCount));
        }
        return result;
    }

    public async Task<IReadOnlyList<ApplicationDto>> GetApplicationsAsync(CancellationToken cancellationToken = default)
    {
        var applications = await _applicationRepository.GetAllWithDetailsAsync(cancellationToken);
        return applications
            .OrderByDescending(a => a.AppliedAt)
            .Select(a =>
            {
                var jobDto = a.Job is not null ? JobMapper.ToDto(a.Job) : null;
                return ProfileMapper.ToDto(a, jobDto);
            })
            .ToList();
    }

    public async Task<IReadOnlyList<CompanyDto>> GetCompaniesAsync(CancellationToken cancellationToken = default)
    {
        var companies = await _companyRepository.GetAllAsync(cancellationToken);
        var result = new List<CompanyDto>();
        foreach (var company in companies)
        {
            var count = await _companyRepository.CountOpenJobsAsync(company.Id, cancellationToken);
            result.Add(CompanyMapper.ToDto(company, count));
        }
        return result;
    }

    public async Task<IReadOnlyList<JobDto>> GetJobsAsync(CancellationToken cancellationToken = default)
    {
        var jobs = await _jobRepository.GetAllWithDetailsAsync(cancellationToken);
        return jobs.Select(JobMapper.ToDto).ToList();
    }

    public async Task<JobDto> CreateJobAsync(AdminCreateJobDto dto, CancellationToken cancellationToken = default)
    {
        var source = await _sourceRepository.GetFirstAsync(cancellationToken)
            ?? throw new InvalidOperationException("No job source configured.");

        var job = await _jobService.CreateAsync(new CreateJobDto(
            dto.Title,
            dto.Description,
            dto.CompanyId,
            dto.Location,
            dto.City,
            dto.Category,
            dto.Level,
            dto.IsRemote,
            dto.SalaryMin,
            dto.SalaryMax,
            null,
            null,
            null,
            null,
            source.Id,
            null), cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.JobCreated,
            AuditEntityType.Job,
            job.Id,
            $"Created job \"{job.Title}\"",
            cancellationToken: cancellationToken);

        return job;
    }

    public async Task<JobDto?> UpdateJobAsync(Guid id, AdminUpdateJobDto dto, CancellationToken cancellationToken = default)
    {
        var existing = await _jobRepository.GetByIdAsync(id, cancellationToken);
        if (existing is null) return null;

        var source = await _sourceRepository.GetFirstAsync(cancellationToken)
            ?? throw new InvalidOperationException("No job source configured.");

        var job = await _jobService.UpdateAsync(id, new UpdateJobDto(
            dto.Title,
            dto.Description,
            dto.CompanyId,
            dto.Location,
            dto.City,
            dto.Category,
            dto.Level,
            dto.IsRemote,
            dto.IsActive,
            dto.SalaryMin,
            dto.SalaryMax,
            null,
            null,
            null,
            null,
            source.Id,
            null), cancellationToken);

        if (job is not null)
        {
            await _auditLogService.LogAsync(
                AuditAction.JobUpdated,
                AuditEntityType.Job,
                id,
                $"Updated job \"{dto.Title}\"",
                cancellationToken: cancellationToken);
        }

        return job;
    }

    public async Task<IReadOnlyList<AdminNotificationDto>> GetNotificationsAsync(
        int limit, CancellationToken cancellationToken = default)
    {
        var items = await _notificationRepository.GetRecentAsync(limit, cancellationToken);
        return items.Select(n => new AdminNotificationDto(
            n.Id,
            n.UserProfileId,
            n.UserProfile?.Email ?? n.UserProfile?.User?.Email ?? "unknown",
            n.Type,
            n.Title,
            n.Message,
            n.IsRead,
            n.CreatedAt)).ToList();
    }

    public async Task<NotificationDto> CreateNotificationAsync(
        CreateAdminNotificationDto dto, CancellationToken cancellationToken = default)
    {
        var notification = await _notificationService.CreateAsync(
            dto.UserProfileId, dto.Title, dto.Message, cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.NotificationCreated,
            AuditEntityType.Notification,
            notification.Id,
            $"Notification \"{dto.Title}\" for profile {dto.UserProfileId}",
            cancellationToken: cancellationToken);

        return notification;
    }

    public async Task<bool> DeleteNotificationAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var notification = await _notificationRepository.GetByIdAsync(id, cancellationToken);
        if (notification is null) return false;
        await _notificationRepository.DeleteAsync(notification, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.AdminAction,
            AuditEntityType.Notification,
            id,
            "Deleted notification",
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> UpdateUserRoleAsync(
        Guid userId, UpdateUserRoleDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null) return false;

        var previousRole = user.Role;
        user.Role = dto.Role;
        await _userRepository.UpdateAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.RoleChanged,
            AuditEntityType.User,
            userId,
            $"Role changed from {previousRole} to {dto.Role}",
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> SetCompanyActiveAsync(
        Guid companyId, bool isActive, CancellationToken cancellationToken = default)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company is null) return false;

        company.IsActive = isActive;
        if (isActive && company.Status == CompanyStatus.Pending)
            company.Status = CompanyStatus.Approved;
        else if (!isActive && company.Status == CompanyStatus.Approved)
            company.Status = CompanyStatus.Suspended;

        await _companyRepository.UpdateAsync(company, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.CompanyStatusChanged,
            AuditEntityType.Company,
            companyId,
            $"Company active set to {isActive} (status: {company.Status})",
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> SetCompanyStatusAsync(
        Guid companyId, CompanyStatus status, CancellationToken cancellationToken = default)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company is null) return false;

        var previous = company.Status;
        company.Status = status;
        company.IsActive = status == CompanyStatus.Approved;

        await _companyRepository.UpdateAsync(company, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.CompanyStatusChanged,
            AuditEntityType.Company,
            companyId,
            $"Status changed from {previous} to {status}",
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> SetJobActiveAsync(
        Guid jobId, bool isActive, CancellationToken cancellationToken = default)
    {
        var job = await _jobRepository.GetByIdAsync(jobId, cancellationToken);
        if (job is null) return false;

        job.IsActive = isActive;
        if (isActive) job.IsArchived = false;

        await _jobRepository.UpdateAsync(job, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            isActive ? AuditAction.JobActivated : AuditAction.JobDeactivated,
            AuditEntityType.Job,
            jobId,
            $"Job \"{job.Title}\" {(isActive ? "activated" : "deactivated")}",
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> ArchiveJobAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        var job = await _jobRepository.GetByIdAsync(jobId, cancellationToken);
        if (job is null) return false;

        job.IsArchived = true;
        job.IsActive = false;
        await _jobRepository.UpdateAsync(job, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.JobArchived,
            AuditEntityType.Job,
            jobId,
            $"Archived job \"{job.Title}\"",
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> UnarchiveJobAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        var job = await _jobRepository.GetByIdAsync(jobId, cancellationToken);
        if (job is null) return false;

        job.IsArchived = false;
        job.IsActive = true;
        await _jobRepository.UpdateAsync(job, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.JobUnarchived,
            AuditEntityType.Job,
            jobId,
            $"Unarchived job \"{job.Title}\"",
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<PagedResultDto<AuditLogDto>> GetAuditLogsAsync(
        AuditLogQueryDto query, CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var (items, total) = await _auditLogRepository.SearchAsync(
            query.Search,
            query.Action,
            query.EntityType,
            query.From,
            query.To,
            page,
            pageSize,
            cancellationToken);

        var dtos = items.Select(l => new AuditLogDto(
            l.Id,
            l.Timestamp,
            l.Actor,
            l.Action,
            l.EntityType,
            l.EntityId,
            l.Details)).ToList();

        return new PagedResultDto<AuditLogDto>(dtos, total, page, pageSize);
    }

    public async Task<AdminAnalyticsDto> GetAnalyticsAsync(
        int days, CancellationToken cancellationToken = default)
    {
        var from = days <= 0 ? (DateTime?)null : DateTime.UtcNow.Date.AddDays(-days + 1);

        var jobs = await _jobRepository.GetAllWithDetailsAsync(cancellationToken);
        var applications = await _applicationRepository.GetAllWithDetailsAsync(cancellationToken);
        var users = await _userRepository.GetAllWithDetailsAsync(cancellationToken);
        var companies = await _companyRepository.GetAllAsync(cancellationToken);

        if (from.HasValue)
        {
            jobs = jobs.Where(j => j.CreatedAt >= from.Value).ToList();
            applications = applications.Where(a => a.AppliedAt >= from.Value).ToList();
            users = users.Where(u => u.CreatedAt >= from.Value).ToList();
            companies = companies.Where(c => c.CreatedAt >= from.Value).ToList();
        }

        var jobsPerDay = GroupByDay(jobs.Select(j => j.CreatedAt), from);
        var appsPerDay = GroupByDay(applications.Select(a => a.AppliedAt), from);
        var usersPerDay = GroupByDay(users.Select(u => u.CreatedAt), from);
        var companiesPerDay = GroupByDay(companies.Select(c => c.CreatedAt), from);

        var allJobs = await _jobRepository.GetAllWithDetailsAsync(cancellationToken);
        var topCompanies = allJobs
            .GroupBy(j => j.Company?.Name ?? "Unknown")
            .OrderByDescending(g => g.Count())
            .Take(10)
            .Select(g => new NamedCountDto(g.Key, g.Count()))
            .ToList();

        var topCities = allJobs
            .Where(j => !string.IsNullOrWhiteSpace(j.City))
            .GroupBy(j => j.City!)
            .OrderByDescending(g => g.Count())
            .Take(10)
            .Select(g => new NamedCountDto(g.Key, g.Count()))
            .ToList();

        var topTags = allJobs
            .SelectMany(j => j.JobTags ?? [])
            .GroupBy(jt => jt.Tag?.Name ?? "Unknown")
            .OrderByDescending(g => g.Count())
            .Take(10)
            .Select(g => new NamedCountDto(g.Key, g.Count()))
            .ToList();

        return new AdminAnalyticsDto(
            jobsPerDay,
            appsPerDay,
            usersPerDay,
            companiesPerDay,
            topCompanies,
            topCities,
            topTags);
    }

    public async Task<AdminSystemHealthDto> GetSystemHealthAsync(CancellationToken cancellationToken = default)
    {
        var dbStatus = "healthy";
        try
        {
            _ = await _userRepository.GetAllAsync(cancellationToken);
        }
        catch
        {
            dbStatus = "unhealthy";
        }

        return new AdminSystemHealthDto(
            "healthy",
            dbStatus,
            (await _userRepository.GetAllAsync(cancellationToken)).Count,
            (await _companyRepository.GetAllAsync(cancellationToken)).Count,
            (await _jobRepository.GetAllWithDetailsAsync(cancellationToken)).Count,
            await _applicationRepository.CountAsync(cancellationToken),
            DateTime.UtcNow);
    }

    private static IReadOnlyList<DailyCountDto> GroupByDay(IEnumerable<DateTime> dates, DateTime? from)
    {
        var grouped = dates
            .GroupBy(d => d.Date)
            .ToDictionary(g => g.Key, g => g.Count());

        if (!from.HasValue)
            return grouped
                .OrderBy(kv => kv.Key)
                .Select(kv => new DailyCountDto(kv.Key.ToString("yyyy-MM-dd"), kv.Value))
                .ToList();

        var start = from.Value.Date;
        var end = DateTime.UtcNow.Date;
        var result = new List<DailyCountDto>();
        for (var day = start; day <= end; day = day.AddDays(1))
        {
            grouped.TryGetValue(day, out var count);
            result.Add(new DailyCountDto(day.ToString("yyyy-MM-dd"), count));
        }
        return result;
    }
}
