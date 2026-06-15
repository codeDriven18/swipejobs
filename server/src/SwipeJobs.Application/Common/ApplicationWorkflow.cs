using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common;

public static class ApplicationWorkflow
{
    public static bool CanReapply(ApplicationStatus status) =>
        status is ApplicationStatus.Rejected or ApplicationStatus.Withdrawn;

    public static bool BlocksNewApplication(ApplicationStatus status) =>
        status is ApplicationStatus.Pending
            or ApplicationStatus.Applied
            or ApplicationStatus.UnderReview
            or ApplicationStatus.Shortlisted
            or ApplicationStatus.InterviewInvited
            or ApplicationStatus.Interviewing
            or ApplicationStatus.OfferSent
            or ApplicationStatus.Hired;

    public static bool IsMessagingUnlocked(ApplicationStatus status) =>
        status is ApplicationStatus.InterviewInvited
            or ApplicationStatus.Interviewing
            or ApplicationStatus.OfferSent;

    public static bool IsConversationReadOnly(ApplicationStatus status) =>
        status is ApplicationStatus.Rejected
            or ApplicationStatus.Withdrawn
            or ApplicationStatus.Hired;

    public static bool CanCandidateSendMessages(ApplicationStatus status) =>
        IsMessagingUnlocked(status);

    public static int ToApplicationNumber(int reapplicationCount) => reapplicationCount + 1;
}
