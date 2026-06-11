using SwipeJobs.Domain.Common;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Domain.Entities;

public class UserProfile : BaseEntity
{
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    public string? ExternalUserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Bio { get; set; }
    public string? Headline { get; set; }
    public string? ResumeUrl { get; set; }
    public string? ResumeFileName { get; set; }
    public DateTime? ResumeUploadedAt { get; set; }
    public string? Location { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? GitHubUrl { get; set; }
    public string? WebsiteUrl { get; set; }
    public decimal? DesiredSalaryMin { get; set; }
    public decimal? DesiredSalaryMax { get; set; }
    public string? PreferredLocations { get; set; }
    public WorkArrangement WorkArrangement { get; set; } = WorkArrangement.Any;
    public bool EmailNotifications { get; set; } = true;
    public bool PushNotifications { get; set; } = true;
    public bool JobAlerts { get; set; } = true;
    public ProfileVisibility ProfileVisibility { get; set; } = ProfileVisibility.EmployersOnly;
    public ProfileVisibility ContactVisibility { get; set; } = ProfileVisibility.EmployersOnly;
    public bool IsProfileComplete { get; set; }

    public ICollection<Education> Educations { get; set; } = new List<Education>();
    public ICollection<Skill> Skills { get; set; } = new List<Skill>();
    public ICollection<Experience> Experiences { get; set; } = new List<Experience>();
    public ICollection<Application> Applications { get; set; } = new List<Application>();
    public ICollection<SavedJob> SavedJobs { get; set; } = new List<SavedJob>();
    public ICollection<UserActivity> Activities { get; set; } = new List<UserActivity>();
    public UserInterestProfile? InterestProfile { get; set; }
    public ICollection<CompanyFollow> CompanyFollows { get; set; } = new List<CompanyFollow>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
