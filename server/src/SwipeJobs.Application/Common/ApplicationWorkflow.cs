using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common;

public static class ApplicationWorkflow
{
    public static bool CanReapply(ApplicationStatus status) =>
        status is ApplicationStatus.Rejected or ApplicationStatus.Withdrawn;

    public static bool BlocksNewApplication(ApplicationStatus status) =>
        status is ApplicationStatus.Pending
            or ApplicationStatus.Submitted
            or ApplicationStatus.UnderReview
            or ApplicationStatus.Accepted;

    public static int ToApplicationNumber(int reapplicationCount) => reapplicationCount + 1;
}
