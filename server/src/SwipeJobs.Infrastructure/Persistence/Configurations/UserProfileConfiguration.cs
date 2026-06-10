using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Configurations;

public class UserProfileConfiguration : IEntityTypeConfiguration<UserProfile>
{
    public void Configure(EntityTypeBuilder<UserProfile> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.ExternalUserId).HasMaxLength(128);
        builder.Property(u => u.FirstName).IsRequired().HasMaxLength(100);
        builder.Property(u => u.LastName).IsRequired().HasMaxLength(100);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(256);
        builder.Property(u => u.Phone).HasMaxLength(50);
        builder.Property(u => u.Location).HasMaxLength(200);
        builder.Property(u => u.ResumeUrl).HasMaxLength(1000);

        builder.HasIndex(u => u.ExternalUserId).IsUnique().HasFilter("\"ExternalUserId\" IS NOT NULL");
        builder.HasIndex(u => u.UserId).IsUnique().HasFilter("\"UserId\" IS NOT NULL");
        builder.HasIndex(u => u.Email);
    }
}
