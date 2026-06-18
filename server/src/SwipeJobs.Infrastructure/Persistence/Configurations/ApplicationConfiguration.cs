using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Configurations;

public class ApplicationConfiguration : IEntityTypeConfiguration<Domain.Entities.Application>
{
    public void Configure(EntityTypeBuilder<Domain.Entities.Application> builder)
    {
        builder.HasKey(a => a.Id);

        builder.HasOne(a => a.UserProfile)
            .WithMany(u => u.Applications)
            .HasForeignKey(a => a.UserProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.Job)
            .WithMany(j => j.Applications)
            .HasForeignKey(a => a.JobId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => a.UserProfileId);
        builder.HasIndex(a => a.JobId);
        builder.HasIndex(a => new { a.UserProfileId, a.JobId });
        builder.HasIndex(a => a.Status);
        builder.HasIndex(a => new { a.JobId, a.Status });
        builder.Property(a => a.StatusHistoryJson).HasColumnType("text");
        builder.Property(a => a.ReapplicationCount).HasDefaultValue(0);
        builder.Property(a => a.InterviewPhase).HasConversion<string>().HasMaxLength(32);
        builder.Property(a => a.InterviewScheduledAtUtc);
        builder.HasIndex(a => a.InterviewScheduledAtUtc);
    }
}
