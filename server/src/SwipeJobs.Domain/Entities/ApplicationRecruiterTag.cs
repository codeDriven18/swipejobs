namespace SwipeJobs.Domain.Entities;

public class ApplicationRecruiterTag
{
    public Guid ApplicationId { get; set; }
    public Application Application { get; set; } = null!;

    public Guid TagId { get; set; }
    public RecruiterTag Tag { get; set; } = null!;
}
