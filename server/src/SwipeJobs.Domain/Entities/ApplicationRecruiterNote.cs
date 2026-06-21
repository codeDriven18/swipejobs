using SwipeJobs.Domain.Common;

namespace SwipeJobs.Domain.Entities;

public class ApplicationRecruiterNote : BaseEntity
{
    public Guid ApplicationId { get; set; }
    public Application Application { get; set; } = null!;

    public Guid AuthorUserId { get; set; }
    public string Text { get; set; } = string.Empty;
}
