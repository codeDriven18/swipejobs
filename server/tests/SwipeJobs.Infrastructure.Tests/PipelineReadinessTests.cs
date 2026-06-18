using SwipeJobs.Application.Common;
using SwipeJobs.Domain.Enums;
using Xunit;

namespace SwipeJobs.Infrastructure.Tests;

public class PipelineReadinessTests
{
    [Theory]
    [InlineData(ApplicationStatus.Applied, PipelineStage.Applied)]
    [InlineData(ApplicationStatus.Pending, PipelineStage.Applied)]
    [InlineData(ApplicationStatus.UnderReview, PipelineStage.Reviewing)]
    [InlineData(ApplicationStatus.Shortlisted, PipelineStage.Shortlisted)]
    [InlineData(ApplicationStatus.InterviewInvited, PipelineStage.Interview)]
    [InlineData(ApplicationStatus.Interviewing, PipelineStage.Interview)]
    [InlineData(ApplicationStatus.OfferSent, PipelineStage.Offer)]
    [InlineData(ApplicationStatus.Hired, PipelineStage.Hired)]
    [InlineData(ApplicationStatus.Rejected, PipelineStage.Rejected)]
    [InlineData(ApplicationStatus.Withdrawn, PipelineStage.Rejected)]
    public void Every_status_maps_to_exactly_one_pipeline_stage(ApplicationStatus status, PipelineStage expected)
    {
        var stage = ApplicationStatusCatalog.ResolveStage(status, InterviewPhase.None);
        Assert.Equal(expected, stage);
    }

    [Fact]
    public void Interview_invited_defaults_to_requested_phase()
    {
        var phase = ApplicationStatusCatalog.ResolveInterviewPhase(
            ApplicationStatus.InterviewInvited,
            InterviewPhase.None);
        Assert.Equal(InterviewPhase.Requested, phase);
    }

    [Fact]
    public void Interviewing_without_phase_defaults_to_scheduled()
    {
        var phase = ApplicationStatusCatalog.ResolveInterviewPhase(
            ApplicationStatus.Interviewing,
            InterviewPhase.None);
        Assert.Equal(InterviewPhase.Scheduled, phase);
    }

    [Fact]
    public void Normalize_pending_to_applied()
    {
        Assert.Equal(ApplicationStatus.Applied, ApplicationStatusCatalog.Normalize(ApplicationStatus.Pending));
    }
}
