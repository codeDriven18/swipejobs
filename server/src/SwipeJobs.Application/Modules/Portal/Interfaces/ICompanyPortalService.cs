using SwipeJobs.Application.Common.Dtos;

namespace SwipeJobs.Application.Modules.Portal.Interfaces;

public interface ICompanyPortalService
{
    Task<CompanyPortalStatsDto> GetStatsAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<JobDto>> GetJobsAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<JobDto> CreateJobAsync(Guid companyId, PortalCreateJobDto dto, CancellationToken cancellationToken = default);
    Task<JobDto?> UpdateJobAsync(Guid companyId, Guid jobId, PortalUpdateJobDto dto, CancellationToken cancellationToken = default);
    Task<bool> ArchiveJobAsync(Guid companyId, Guid jobId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PortalApplicationDto>> GetApplicationsAsync(Guid companyId, Guid? jobId, CancellationToken cancellationToken = default);
    Task<CompanyDto?> GetCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<CompanyDto?> UpdateCompanyAsync(Guid companyId, PortalUpdateCompanyDto dto, CancellationToken cancellationToken = default);
}
