using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Domain.Entities;

public class ApplicationActivityEntry
{
    public RecruiterActivityType Type { get; set; }
    public DateTime OccurredAt { get; set; }
    public Guid? UserId { get; set; }
    public string? Details { get; set; }
}
