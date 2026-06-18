namespace SwipeJobs.Domain.Enums;

public enum ApplicationStatus
{
    /// <summary>Deprecated — normalized to <see cref="Applied"/> for pipeline grouping.</summary>
    [Obsolete("Use Applied. Pending is normalized on read and in migrations.")]
    Pending = 0,
    Applied = 1,
    UnderReview = 2,
    Shortlisted = 3,
    /// <summary>Interview column — use <see cref="InterviewPhase.Requested"/> for card sub-label.</summary>
    InterviewInvited = 4,
    /// <summary>Interview column — pair with <see cref="InterviewPhase"/> for scheduled/completed.</summary>
    Interviewing = 5,
    OfferSent = 6,
    Hired = 7,
    Rejected = 8,
    /// <summary>Rejected column — terminal withdrawal by candidate.</summary>
    Withdrawn = 9,
}
