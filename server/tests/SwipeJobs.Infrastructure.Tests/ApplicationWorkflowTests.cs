using SwipeJobs.Application.Common;
using SwipeJobs.Domain.Enums;
using Xunit;

namespace SwipeJobs.Infrastructure.Tests;

public class ApplicationWorkflowTests
{
    [Theory]
    [InlineData(ApplicationStatus.Submitted, true)]
    [InlineData(ApplicationStatus.UnderReview, true)]
    [InlineData(ApplicationStatus.Accepted, true)]
    [InlineData(ApplicationStatus.Rejected, false)]
    [InlineData(ApplicationStatus.Withdrawn, false)]
    public void BlocksNewApplication_OnlyForActiveStatuses(ApplicationStatus status, bool expected)
    {
        Assert.Equal(expected, ApplicationWorkflow.BlocksNewApplication(status));
    }

    [Theory]
    [InlineData(ApplicationStatus.Rejected, true)]
    [InlineData(ApplicationStatus.Withdrawn, true)]
    [InlineData(ApplicationStatus.Submitted, false)]
    [InlineData(ApplicationStatus.Accepted, false)]
    public void CanReapply_OnlyAfterRejectedOrWithdrawn(ApplicationStatus status, bool expected)
    {
        Assert.Equal(expected, ApplicationWorkflow.CanReapply(status));
    }

    [Fact]
    public void ApplicationNumber_IsOneBasedFromReapplicationCount()
    {
        Assert.Equal(1, ApplicationWorkflow.ToApplicationNumber(0));
        Assert.Equal(2, ApplicationWorkflow.ToApplicationNumber(1));
    }
}
