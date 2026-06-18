namespace SwipeJobs.Domain.Enums;

/// <summary>
/// Canonical employer pipeline column — one stage per Kanban column.
/// </summary>
public enum PipelineStage
{
    Applied = 0,
    Reviewing = 1,
    Shortlisted = 2,
    Interview = 3,
    Offer = 4,
    Hired = 5,
    Rejected = 6,
}
