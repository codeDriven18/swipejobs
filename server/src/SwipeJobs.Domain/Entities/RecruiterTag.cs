using SwipeJobs.Domain.Common;

namespace SwipeJobs.Domain.Entities;

public class RecruiterTag : BaseEntity
{
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public ICollection<ApplicationRecruiterTag> ApplicationTags { get; set; } = [];
}
