using Microsoft.EntityFrameworkCore;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<UserActivity> UserActivities => Set<UserActivity>();
    public DbSet<UserInterestProfile> UserInterestProfiles => Set<UserInterestProfile>();
    public DbSet<CompanyFollow> CompanyFollows => Set<CompanyFollow>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<CompanyMember> CompanyMembers => Set<CompanyMember>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<JobTag> JobTags => Set<JobTag>();
    public DbSet<Source> Sources => Set<Source>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Education> Educations => Set<Education>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<Experience> Experiences => Set<Experience>();
    public DbSet<Domain.Entities.Application> Applications => Set<Domain.Entities.Application>();
    public DbSet<SavedJob> SavedJobs => Set<SavedJob>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<IngestionMessage> IngestionMessages => Set<IngestionMessage>();
    public DbSet<JobCandidate> JobCandidates => Set<JobCandidate>();
    public DbSet<JobCandidateMessage> JobCandidateMessages => Set<JobCandidateMessage>();
    public DbSet<JobReport> JobReports => Set<JobReport>();
    public DbSet<SourceIngestionLog> SourceIngestionLogs => Set<SourceIngestionLog>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<Domain.Common.BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
