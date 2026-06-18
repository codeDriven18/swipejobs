using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;
using ApplicationEntity = SwipeJobs.Domain.Entities.Application;

namespace SwipeJobs.Application.Common.Mapping;

public static class PortalApplicationMapper
{
    public static PortalApplicationDto ToDto(ApplicationEntity application, int unreadMessageCount = 0)
    {
        var profile = application.UserProfile;
        var trust = profile is null
            ? CandidateTrustLevel.None
            : CandidateTrustCalculator.Compute(profile);

        var normalizedStatus = ApplicationStatusCatalog.Normalize(application.Status);
        var interviewPhase = ApplicationStatusCatalog.ResolveInterviewPhase(
            application.Status,
            application.InterviewPhase);

        return new PortalApplicationDto(
            application.Id,
            normalizedStatus,
            application.AppliedAt,
            application.JobId,
            application.Job?.Title ?? "Job",
            application.UserProfileId,
            $"{profile?.FirstName} {profile?.LastName}".Trim(),
            profile?.Email ?? string.Empty,
            profile?.Phone,
            profile?.ProfileImageUrl,
            application.ReapplicationCount,
            ApplicationWorkflow.ToApplicationNumber(application.ReapplicationCount),
            trust,
            ApplicationStatusCatalog.ResolveStage(application.Status, application.InterviewPhase),
            interviewPhase,
            application.InterviewScheduledAtUtc,
            HasResume(profile),
            unreadMessageCount,
            application.Status == ApplicationStatus.Withdrawn);
    }

    private static bool HasResume(UserProfile? profile) =>
        profile is not null
        && (!string.IsNullOrWhiteSpace(profile.ResumeUrl) || !string.IsNullOrWhiteSpace(profile.ResumeFileName));
}
