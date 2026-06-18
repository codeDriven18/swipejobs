using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common;

/// <summary>
/// Canonical hiring pipeline model for employer UX. Kanban UI maps to <see cref="PipelineStage"/> columns.
/// </summary>
public static class PipelineArchitecture
{
    public static PipelineStage ResolveColumn(ApplicationStatus status, InterviewPhase interviewPhase) =>
        ApplicationStatusCatalog.ResolveStage(status, interviewPhase);

    public static InterviewPhase ResolveInterviewPhase(ApplicationStatus status, InterviewPhase storedPhase) =>
        ApplicationStatusCatalog.ResolveInterviewPhase(status, storedPhase);

    public static IReadOnlyList<PipelineStage> OrderedColumns { get; } =
    [
        PipelineStage.Applied,
        PipelineStage.Reviewing,
        PipelineStage.Shortlisted,
        PipelineStage.Interview,
        PipelineStage.Offer,
        PipelineStage.Hired,
        PipelineStage.Rejected,
    ];
}
