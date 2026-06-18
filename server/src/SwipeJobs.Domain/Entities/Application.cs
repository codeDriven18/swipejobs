using SwipeJobs.Domain.Common;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Domain.Entities;

public class Application : BaseEntity
{
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Applied;
    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    /// <summary>Sub-state when Status is in the interview stage (requested / scheduled / completed).</summary>
    public InterviewPhase InterviewPhase { get; set; } = InterviewPhase.None;
    /// <summary>Reserved for calendar integration. Null until an interview is scheduled.</summary>
    public DateTime? InterviewScheduledAtUtc { get; set; }
    /// <summary>Number of prior applications for the same job (0 = first attempt).</summary>
    public int ReapplicationCount { get; set; }
    public string StatusHistoryJson { get; set; } = "[]";
    public string? Notes { get; set; }

    public Guid UserProfileId { get; set; }
    public UserProfile UserProfile { get; set; } = null!;

    public Guid JobId { get; set; }
    public Job Job { get; set; } = null!;
}
