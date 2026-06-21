using SwipeJobs.Domain.Common;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Domain.Entities;

public class Company : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string CompanySize { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? BannerUrl { get; set; }
    public string? Website { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? TwitterUrl { get; set; }
    public string? InstagramUrl { get; set; }
    /// <summary>What it's like to work here — values, team culture, day-to-day.</summary>
    public string? Culture { get; set; }
    /// <summary>Perks and benefits offered to employees.</summary>
    public string? Benefits { get; set; }
    /// <summary>How the company approaches hiring and what they look for.</summary>
    public string? HiringPhilosophy { get; set; }
    public CompanyStatus Status { get; set; } = CompanyStatus.Pending;
    public bool IsActive { get; set; } = true;

    public ICollection<Job> Jobs { get; set; } = new List<Job>();
    public ICollection<CompanyFollow> Followers { get; set; } = new List<CompanyFollow>();
}
