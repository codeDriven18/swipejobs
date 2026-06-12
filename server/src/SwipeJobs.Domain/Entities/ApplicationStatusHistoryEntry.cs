using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Domain.Entities;

public class ApplicationStatusHistoryEntry
{
    public ApplicationStatus Status { get; set; }
    public DateTime ChangedAt { get; set; }
}
