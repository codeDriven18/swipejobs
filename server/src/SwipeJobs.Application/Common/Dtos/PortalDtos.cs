using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common.Dtos;

public record CompanyPortalStatsDto(
    int TotalJobs,
    int ActiveJobs,
    int ArchivedJobs,
    int TotalApplications,
    int NewApplicationsThisWeek,
    CompanyStatus CompanyStatus);

public record PortalCreateJobDto(
    string Title,
    string Description,
    string? Location,
    string? City,
    JobCategory Category,
    JobLevel Level,
    bool IsRemote,
    decimal? SalaryMin,
    decimal? SalaryMax,
    DateTime? ExpiresAt,
    string? ExternalUrl,
    string? JobImageUrl,
    IReadOnlyList<Guid>? TagIds);

public record PortalUpdateJobDto(
    string Title,
    string Description,
    string? Location,
    string? City,
    JobCategory Category,
    JobLevel Level,
    bool IsRemote,
    bool IsActive,
    decimal? SalaryMin,
    decimal? SalaryMax,
    DateTime? ExpiresAt,
    string? ExternalUrl,
    string? JobImageUrl,
    IReadOnlyList<Guid>? TagIds);

public record PortalApplicationDto(
    Guid Id,
    ApplicationStatus Status,
    DateTime AppliedAt,
    Guid JobId,
    string JobTitle,
    Guid UserProfileId,
    string ApplicantName,
    string ApplicantEmail,
    string? ApplicantPhone,
    string? ApplicantProfileImageUrl,
    int ReapplicationCount,
    int ApplicationNumber,
    CandidateTrustLevel CandidateTrustLevel,
    PipelineStage PipelineStage,
    InterviewPhase InterviewPhase,
    DateTime? InterviewScheduledAtUtc,
    string? InterviewLocation,
    string? InterviewNotes,
    bool HasResume,
    int UnreadMessageCount,
    bool IsWithdrawn,
    byte? RecruiterRating,
    bool IsFavorite,
    string? RejectionReason,
    IReadOnlyList<RecruiterTagDto> RecruiterTags,
    int RecruiterNoteCount);

public record RecruiterTagDto(Guid Id, string Name);

public record PortalRecruiterNoteDto(Guid Id, string Text, Guid AuthorUserId, DateTime CreatedAt);

public record PortalRecruiterActivityDto(
    RecruiterActivityType Type,
    DateTime OccurredAt,
    Guid? UserId,
    string? Details);

public record PortalUpdateApplicationStatusDto(ApplicationStatus Status, string? RejectionReason = null);

public record PortalScheduleInterviewDto(
    DateTime ScheduledAtUtc,
    string? Location,
    string? Notes);

public record PortalApplicationSummaryDto(
    Guid ApplicationId,
    ApplicationStatus Status,
    DateTime AppliedAt,
    int ApplicationNumber);

public record PortalApplicantDetailDto(
    Guid ApplicationId,
    ApplicationStatus Status,
    DateTime AppliedAt,
    Guid JobId,
    string JobTitle,
    Guid UserProfileId,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? Headline,
    string? Bio,
    string? Location,
    string JobSeekingStatus,
    string? ProfileImageUrl,
    string? LinkedInUrl,
    string? GitHubUrl,
    string? WebsiteUrl,
    bool HasResume,
    string? ResumeFileName,
    long? ResumeFileSize,
    DateTime? ResumeUploadedAt,
    int ReapplicationCount,
    int ApplicationNumber,
    InterviewPhase InterviewPhase,
    DateTime? InterviewScheduledAtUtc,
    string? InterviewLocation,
    string? InterviewNotes,
    IReadOnlyList<ApplicationStatusHistoryDto> StatusHistory,
    IReadOnlyList<PortalApplicationSummaryDto> ApplicationHistory,
    IReadOnlyList<SkillDto> Skills,
    IReadOnlyList<ExperienceDto> Experiences,
    IReadOnlyList<EducationDto> Educations,
    CandidateTrustLevel CandidateTrustLevel,
    int CandidateTrustSignals,
    Guid? ConversationId,
    bool MessagingUnlocked,
    byte? RecruiterRating,
    bool IsFavorite,
    string? RejectionReason,
    IReadOnlyList<RecruiterTagDto> RecruiterTags,
    IReadOnlyList<PortalRecruiterNoteDto> RecruiterNotes,
    IReadOnlyList<PortalRecruiterActivityDto> ActivityTimeline);

public record PortalAddRecruiterNoteDto(string Text);

public record PortalSetRecruiterRatingDto(byte? Rating);

public record PortalSetFavoriteDto(bool IsFavorite);

public record PortalSetApplicationTagsDto(IReadOnlyList<Guid> TagIds);

public record PortalCreateRecruiterTagDto(string Name);

public record PortalUpdateRecruiterTagDto(string Name);

public record PortalUpdateCompanyDto(
    string Description,
    string Industry,
    string Location,
    string CompanySize,
    string? LogoUrl,
    string? BannerUrl,
    string? Website,
    string? LinkedInUrl,
    string? TwitterUrl,
    string? InstagramUrl,
    string? Culture,
    string? Benefits,
    string? HiringPhilosophy);
