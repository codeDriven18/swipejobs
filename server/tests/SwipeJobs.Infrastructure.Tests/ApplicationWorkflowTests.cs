using SwipeJobs.Application.Common;
using SwipeJobs.Domain.Enums;
using Xunit;

namespace SwipeJobs.Infrastructure.Tests;

public class ApplicationWorkflowTests
{
    [Theory]
    [InlineData(ApplicationStatus.Applied, true)]
    [InlineData(ApplicationStatus.UnderReview, true)]
    [InlineData(ApplicationStatus.Shortlisted, true)]
    [InlineData(ApplicationStatus.InterviewInvited, true)]
    [InlineData(ApplicationStatus.Interviewing, true)]
    [InlineData(ApplicationStatus.OfferSent, true)]
    [InlineData(ApplicationStatus.Hired, true)]
    [InlineData(ApplicationStatus.Rejected, false)]
    [InlineData(ApplicationStatus.Withdrawn, false)]
    public void BlocksNewApplication_OnlyForActiveStatuses(ApplicationStatus status, bool expected)
    {
        Assert.Equal(expected, ApplicationWorkflow.BlocksNewApplication(status));
    }

    [Theory]
    [InlineData(ApplicationStatus.Rejected, true)]
    [InlineData(ApplicationStatus.Withdrawn, true)]
    [InlineData(ApplicationStatus.Applied, false)]
    [InlineData(ApplicationStatus.Hired, false)]
    public void CanReapply_OnlyAfterRejectedOrWithdrawn(ApplicationStatus status, bool expected)
    {
        Assert.Equal(expected, ApplicationWorkflow.CanReapply(status));
    }

    [Theory]
    [InlineData(ApplicationStatus.InterviewInvited, true)]
    [InlineData(ApplicationStatus.Interviewing, true)]
    [InlineData(ApplicationStatus.OfferSent, true)]
    [InlineData(ApplicationStatus.Shortlisted, false)]
    [InlineData(ApplicationStatus.Rejected, false)]
    public void IsMessagingUnlocked_OnlyAfterInterviewInvite(ApplicationStatus status, bool expected)
    {
        Assert.Equal(expected, ApplicationWorkflow.IsMessagingUnlocked(status));
    }

    [Fact]
    public void ApplicationNumber_IsOneBasedFromReapplicationCount()
    {
        Assert.Equal(1, ApplicationWorkflow.ToApplicationNumber(0));
        Assert.Equal(2, ApplicationWorkflow.ToApplicationNumber(1));
    }
}
