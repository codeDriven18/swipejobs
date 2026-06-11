using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Common.Mapping;
using SwipeJobs.Application.Modules.Portal.Interfaces;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Application.Modules.Portal.Services;

public class CompanyPortalService : ICompanyPortalService
{
    private readonly IJobRepository _jobRepository;
    private readonly IApplicationRepository _applicationRepository;
    private readonly ICompanyRepository _companyRepository;
    private readonly ISourceRepository _sourceRepository;
    private readonly IAuditLogService _auditLogService;
    private readonly IUnitOfWork _unitOfWork;

    public CompanyPortalService(
        IJobRepository jobRepository,
        IApplicationRepository applicationRepository,
        ICompanyRepository companyRepository,
        ISourceRepository sourceRepository,
        IAuditLogService auditLogService,
        IUnitOfWork unitOfWork)
    {
        _jobRepository = jobRepository;
        _applicationRepository = applicationRepository;
        _companyRepository = companyRepository;
        _sourceRepository = sourceRepository;
        _auditLogService = auditLogService;
        _unitOfWork = unitOfWork;
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
            company?.Status ?? Domain.Enums.CompanyStatus.Pending);
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

        if (company.Status != Domain.Enums.CompanyStatus.Approved)
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
            SourceId = source.Id,
            IsActive = true,
            IsArchived = false,
        };

        await _jobRepository.AddAsync(job, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            Domain.Enums.AuditAction.JobCreated,
            Domain.Enums.AuditEntityType.Job,
            job.Id,
            $"Company portal created job \"{job.Title}\"",
            cancellationToken: cancellationToken);

        if (dto.TagIds is { Count: > 0 })
        {
            await _jobRepository.SetTagsAsync(job.Id, dto.TagIds, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

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

        await _jobRepository.UpdateAsync(job, cancellationToken);
        if (dto.TagIds is not null)
            await _jobRepository.SetTagsAsync(job.Id, dto.TagIds, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            Domain.Enums.AuditAction.JobUpdated,
            Domain.Enums.AuditEntityType.Job,
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
            Domain.Enums.AuditAction.JobArchived,
            Domain.Enums.AuditEntityType.Job,
            jobId,
            $"Company portal archived job \"{job.Title}\"",
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<IReadOnlyList<PortalApplicationDto>> GetApplicationsAsync(
        Guid companyId, Guid? jobId, CancellationToken cancellationToken = default)
    {
        var applications = await _applicationRepository.GetByCompanyIdAsync(companyId, jobId, cancellationToken);
        return applications.Select(a => new PortalApplicationDto(
            a.Id,
            a.Status,
            a.AppliedAt,
            a.JobId,
            a.Job?.Title ?? "Job",
            a.UserProfileId,
            $"{a.UserProfile?.FirstName} {a.UserProfile?.LastName}".Trim(),
            a.UserProfile?.Email ?? string.Empty,
            a.UserProfile?.Phone,
            a.UserProfile?.ProfileImageUrl)).ToList();
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

        await _companyRepository.UpdateAsync(company, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var openJobs = await _companyRepository.CountOpenJobsAsync(companyId, cancellationToken);
        return CompanyMapper.ToDto(company, openJobs);
    }
}
