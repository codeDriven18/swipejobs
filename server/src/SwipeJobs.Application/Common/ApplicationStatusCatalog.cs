using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common;

/// <summary>
/// Maps legacy <see cref="ApplicationStatus"/> values to the seven pipeline columns.
/// </summary>
public static class ApplicationStatusCatalog
{
    public static ApplicationStatus Normalize(ApplicationStatus status) =>
        status == ApplicationStatus.Pending ? ApplicationStatus.Applied : status;

    public static PipelineStage ResolveStage(ApplicationStatus status, InterviewPhase interviewPhase)
    {
        var normalized = Normalize(status);
        return normalized switch
        {
            ApplicationStatus.Applied => PipelineStage.Applied,
            ApplicationStatus.UnderReview => PipelineStage.Reviewing,
            ApplicationStatus.Shortlisted => PipelineStage.Shortlisted,
            ApplicationStatus.InterviewInvited or ApplicationStatus.Interviewing => PipelineStage.Interview,
            ApplicationStatus.OfferSent => PipelineStage.Offer,
            ApplicationStatus.Hired => PipelineStage.Hired,
            ApplicationStatus.Rejected or ApplicationStatus.Withdrawn => PipelineStage.Rejected,
            _ => PipelineStage.Applied,
        };
    }

    public static InterviewPhase ResolveInterviewPhase(ApplicationStatus status, InterviewPhase storedPhase)
    {
        var normalized = Normalize(status);
        if (normalized is not (ApplicationStatus.InterviewInvited or ApplicationStatus.Interviewing))
            return InterviewPhase.None;

        if (storedPhase is InterviewPhase.Requested or InterviewPhase.Scheduled or InterviewPhase.Completed)
            return storedPhase;

        return normalized == ApplicationStatus.InterviewInvited
            ? InterviewPhase.Requested
            : InterviewPhase.Scheduled;
    }

    public static IReadOnlyList<ApplicationStatus> StatusesForStage(PipelineStage stage) => stage switch
    {
        PipelineStage.Applied => [ApplicationStatus.Applied],
        PipelineStage.Reviewing => [ApplicationStatus.UnderReview],
        PipelineStage.Shortlisted => [ApplicationStatus.Shortlisted],
        PipelineStage.Interview => [ApplicationStatus.InterviewInvited, ApplicationStatus.Interviewing],
        PipelineStage.Offer => [ApplicationStatus.OfferSent],
        PipelineStage.Hired => [ApplicationStatus.Hired],
        PipelineStage.Rejected => [ApplicationStatus.Rejected, ApplicationStatus.Withdrawn],
        _ => [ApplicationStatus.Applied],
    };
}
