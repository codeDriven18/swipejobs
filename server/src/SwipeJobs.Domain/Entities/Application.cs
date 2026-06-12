using SwipeJobs.Domain.Common;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Domain.Entities;

public class Application : BaseEntity
{
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;
    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    /// <summary>Number of prior applications for the same job (0 = first attempt).</summary>
    public int ReapplicationCount { get; set; }
    public string StatusHistoryJson { get; set; } = "[]";
    public string? Notes { get; set; }

    public Guid UserProfileId { get; set; }
    public UserProfile UserProfile { get; set; } = null!;

    public Guid JobId { get; set; }
    public Job Job { get; set; } = null!;
}
