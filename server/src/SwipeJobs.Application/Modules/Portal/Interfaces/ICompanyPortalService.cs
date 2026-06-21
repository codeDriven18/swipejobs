using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Portal.Interfaces;

public interface ICompanyPortalService
{
    Task<CompanyPortalStatsDto> GetStatsAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<JobDto>> GetJobsAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<JobDto> CreateJobAsync(Guid companyId, PortalCreateJobDto dto, CancellationToken cancellationToken = default);
    Task<JobDto?> UpdateJobAsync(Guid companyId, Guid jobId, PortalUpdateJobDto dto, CancellationToken cancellationToken = default);
    Task<bool> ArchiveJobAsync(Guid companyId, Guid jobId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PortalApplicationDto>> GetApplicationsAsync(Guid companyId, Guid? jobId, CancellationToken cancellationToken = default);
    Task<PortalApplicantDetailDto?> GetApplicantDetailAsync(Guid companyId, Guid applicationId, CancellationToken cancellationToken = default);
    Task<PortalApplicationDto?> UpdateApplicationStatusAsync(
        Guid companyId, Guid applicationId, ApplicationStatus status, string? rejectionReason = null, CancellationToken cancellationToken = default);
    Task<PortalApplicationDto?> ScheduleInterviewAsync(
        Guid companyId, Guid applicationId, PortalScheduleInterviewDto dto, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RecruiterTagDto>> GetRecruiterTagsAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<RecruiterTagDto?> CreateRecruiterTagAsync(Guid companyId, PortalCreateRecruiterTagDto dto, CancellationToken cancellationToken = default);
    Task<RecruiterTagDto?> UpdateRecruiterTagAsync(Guid companyId, Guid tagId, PortalUpdateRecruiterTagDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteRecruiterTagAsync(Guid companyId, Guid tagId, CancellationToken cancellationToken = default);
    Task<PortalRecruiterNoteDto?> AddRecruiterNoteAsync(Guid companyId, Guid applicationId, PortalAddRecruiterNoteDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteRecruiterNoteAsync(Guid companyId, Guid applicationId, Guid noteId, CancellationToken cancellationToken = default);
    Task<PortalApplicationDto?> SetRecruiterRatingAsync(Guid companyId, Guid applicationId, PortalSetRecruiterRatingDto dto, CancellationToken cancellationToken = default);
    Task<PortalApplicationDto?> SetFavoriteAsync(Guid companyId, Guid applicationId, PortalSetFavoriteDto dto, CancellationToken cancellationToken = default);
    Task<PortalApplicationDto?> SetApplicationTagsAsync(Guid companyId, Guid applicationId, PortalSetApplicationTagsDto dto, CancellationToken cancellationToken = default);
    Task<(Stream Content, string ContentType, string FileName)?> OpenApplicantResumeAsync(
        Guid companyId, Guid applicationId, CancellationToken cancellationToken = default);
    Task<CompanyDto?> GetCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<CompanyDto?> UpdateCompanyAsync(Guid companyId, PortalUpdateCompanyDto dto, CancellationToken cancellationToken = default);
    Task<CompanyDto?> UploadCompanyLogoAsync(Guid companyId, Stream content, string contentType, long contentLength, CancellationToken cancellationToken = default);
    Task<CompanyDto?> UploadCompanyBannerAsync(Guid companyId, Stream content, string contentType, long contentLength, CancellationToken cancellationToken = default);
}
