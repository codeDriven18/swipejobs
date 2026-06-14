using SwipeJobs.Application.Common.Dtos;

namespace SwipeJobs.Application.Modules.Admin.Interfaces;

public interface IAdminSearchService
{
    Task<AdminSearchResultDto> SearchAsync(string query, CancellationToken cancellationToken = default);
}
