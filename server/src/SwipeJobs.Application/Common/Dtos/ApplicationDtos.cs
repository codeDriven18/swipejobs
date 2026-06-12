using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common.Dtos;

public record ApplicationStatusHistoryDto(
    ApplicationStatus Status,
    DateTime ChangedAt);

public record ApplicationDto(
    Guid Id,
    ApplicationStatus Status,
    DateTime AppliedAt,
    string? Notes,
    Guid UserProfileId,
    Guid JobId,
    JobDto? Job,
    int ReapplicationCount,
    int ApplicationNumber,
    IReadOnlyList<ApplicationStatusHistoryDto> StatusHistory);

public record CreateApplicationDto(Guid UserProfileId, Guid JobId);

public record ApplyJobDto(Guid JobId);

public record SavedJobDto(
    Guid Id,
    DateTime SavedAt,
    Guid UserProfileId,
    Guid JobId,
    JobDto? Job);

public record CreateSavedJobDto(Guid UserProfileId, Guid JobId);

public record SaveJobDto(Guid JobId);
