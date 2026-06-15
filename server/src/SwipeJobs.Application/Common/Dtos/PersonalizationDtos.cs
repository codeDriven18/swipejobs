using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common.Dtos;

public record RecordActivityDto(
    Guid UserProfileId,
    ActivityType ActivityType,
    Guid? JobId,
    Guid? CompanyId);

public record RecordActivityMeDto(
    ActivityType ActivityType,
    Guid? JobId,
    Guid? CompanyId);

public record UserActivityDto(
    Guid Id,
    ActivityType ActivityType,
    Guid? JobId,
    Guid? CompanyId,
    DateTime OccurredAt);

public record UserInterestDto(
    IReadOnlyDictionary<string, int> PreferredCategories,
    IReadOnlyDictionary<string, int> PreferredTechnologies,
    IReadOnlyDictionary<string, int> PreferredCities,
    decimal? PreferredSalaryMin,
    decimal? PreferredSalaryMax,
    DateTime LastCalculatedAt);

public record CompanyFollowDto(
    Guid Id,
    Guid UserProfileId,
    Guid CompanyId,
    string CompanyName,
    string CompanySlug,
    DateTime FollowedAt);

public record CreateCompanyFollowDto(Guid UserProfileId, Guid CompanyId);

public record FollowCompanyDto(Guid CompanyId);

public record NotificationDto(
    Guid Id,
    NotificationType Type,
    string Title,
    string Message,
    bool IsRead,
    DateTime? ReadAt,
    Guid? RelatedJobId,
    Guid? RelatedCompanyId,
    Guid? RelatedApplicationId,
    Guid? RelatedConversationId,
    DateTime CreatedAt);

public record TrendingJobDto(
    Guid JobId,
    int ViewCount,
    int SaveCount,
    int ApplyCount,
    int TrendScore);
