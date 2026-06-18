using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Configurations;

public class JobConfiguration : IEntityTypeConfiguration<Job>
{
    public void Configure(EntityTypeBuilder<Job> builder)
    {
        builder.HasKey(j => j.Id);
        builder.Property(j => j.Title).IsRequired().HasMaxLength(300);
        builder.Property(j => j.DisplayTitle).HasMaxLength(60);
        builder.Property(j => j.DisplayCompany).HasMaxLength(120);
        builder.Property(j => j.DisplaySalary).HasMaxLength(80);
        builder.Property(j => j.DisplayLocation).HasMaxLength(80);
        builder.Property(j => j.DisplaySkillsJson).HasMaxLength(500);
        builder.Property(j => j.DisplaySummary).HasMaxLength(180);
        builder.Property(j => j.Location).HasMaxLength(200);
        builder.Property(j => j.City).HasMaxLength(100);
        builder.Property(j => j.SalaryMin).HasPrecision(18, 2);
        builder.Property(j => j.SalaryMax).HasPrecision(18, 2);
        builder.Property(j => j.ExternalUrl).HasMaxLength(1000);
        builder.Property(j => j.JobImageUrl).HasMaxLength(1000);
        builder.Property(j => j.AiGeneratedImageUrl).HasMaxLength(1000);
        builder.Property(j => j.ContentFingerprint).HasMaxLength(64);
        builder.Property(j => j.ExternalSourceKey).HasMaxLength(500);

        builder.Property(j => j.LifecycleStatus).HasConversion<int>();
        builder.HasIndex(j => j.LifecycleStatus);
        builder.HasIndex(j => j.PostedAt);
        builder.HasIndex(j => j.ExpiresAt);

        builder.HasIndex(j => j.ContentFingerprint);
        builder.HasIndex(j => new { j.SourceId, j.ExternalSourceKey });

        builder.HasOne(j => j.Company)
            .WithMany(c => c.Jobs)
            .HasForeignKey(j => j.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(j => j.CompanyId);

        builder.HasOne(j => j.Source)
            .WithMany(s => s.Jobs)
            .HasForeignKey(j => j.SourceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(j => j.Category);
        builder.HasIndex(j => j.IsActive);
        builder.HasIndex(j => j.CreatedAt);
        builder.HasIndex(j => j.City);
    }
}
