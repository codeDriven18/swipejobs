using SwipeJobs.Application.Common.Dtos;

namespace SwipeJobs.Application.Modules.Sources.Interfaces;

public interface IAdminSourceService
{
    Task<IReadOnlyList<AdminSourceDto>> GetAllWithMetricsAsync(CancellationToken cancellationToken = default);
    Task<AdminSourceDto?> GetWithMetricsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AdminSourceDto> CreateAsync(CreateAdminSourceDto dto, CancellationToken cancellationToken = default);
    Task<AdminSourceDto?> UpdateAsync(Guid id, UpdateAdminSourceDto dto, CancellationToken cancellationToken = default);
    Task<bool> SetEnabledAsync(Guid id, bool enabled, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<SourceConnectionTestResultDto> TestConnectionAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AdminDashboardIngestionDto> GetDashboardIngestionAsync(CancellationToken cancellationToken = default);
}
