using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common.Dtos;

public record AdminStatsDto(
    int TotalUsers,
    int TotalCompanies,
    int TotalJobs,
    int ActiveJobs,
    int ArchivedJobs,
    int TotalApplications,
    int UnreadNotifications,
    MessagingMetricsDto Messaging);

public record AdminUserDto(
    Guid Id,
    string Email,
    UserRole Role,
    DateTime CreatedAt,
    DateTime? LastLoginAt,
    Guid? ProfileId,
    Guid? CompanyId,
    string? CompanyName,
    int ApplicationCount);

public record AdminNotificationDto(
    Guid Id,
    Guid UserProfileId,
    string UserEmail,
    NotificationType Type,
    string Title,
    string Message,
    bool IsRead,
    DateTime CreatedAt);

public record CreateAdminNotificationDto(
    Guid UserProfileId,
    string Title,
    string Message);

public record UpdateUserRoleDto(UserRole Role);

public record AdminCreateJobDto(
    string Title,
    string Description,
    Guid CompanyId,
    string? Location,
    string? City,
    JobCategory Category,
    JobLevel Level,
    bool IsRemote,
    decimal? SalaryMin,
    decimal? SalaryMax);

public record AdminUpdateJobDto(
    string Title,
    string Description,
    Guid CompanyId,
    string? Location,
    string? City,
    JobCategory Category,
    JobLevel Level,
    bool IsRemote,
    bool IsActive,
    decimal? SalaryMin,
    decimal? SalaryMax);

public record AuditLogDto(
    Guid Id,
    DateTime Timestamp,
    string Actor,
    AuditAction Action,
    AuditEntityType EntityType,
    Guid? EntityId,
    string? Details);

public record AuditLogQueryDto(
    string? Search,
    AuditAction? Action,
    AuditEntityType? EntityType,
    DateTime? From,
    DateTime? To,
    int Page = 1,
    int PageSize = 25);

public record PagedResultDto<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);

public record DailyCountDto(string Date, int Count);

public record NamedCountDto(string Name, int Count);

public record AdminAnalyticsDto(
    IReadOnlyList<DailyCountDto> JobsPerDay,
    IReadOnlyList<DailyCountDto> ApplicationsPerDay,
    IReadOnlyList<DailyCountDto> UsersPerDay,
    IReadOnlyList<DailyCountDto> CompaniesPerDay,
    IReadOnlyList<NamedCountDto> TopCompanies,
    IReadOnlyList<NamedCountDto> TopCities,
    IReadOnlyList<NamedCountDto> TopTags);

public record AdminSystemHealthDto(
    string ApiStatus,
    string DatabaseStatus,
    int TotalUsers,
    int TotalCompanies,
    int TotalJobs,
    int TotalApplications,
    DateTime CheckedAt);

public record UpdateCompanyStatusDto(CompanyStatus Status);
