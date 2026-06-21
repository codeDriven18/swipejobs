using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Configurations;

public class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Name).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Slug).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Description).HasMaxLength(4000);
        builder.Property(c => c.Industry).HasMaxLength(120);
        builder.Property(c => c.Location).HasMaxLength(200);
        builder.Property(c => c.CompanySize).HasMaxLength(80);
        builder.Property(c => c.LogoUrl).HasMaxLength(1000);
        builder.Property(c => c.BannerUrl).HasMaxLength(1000);
        builder.Property(c => c.Website).HasMaxLength(500);
        builder.Property(c => c.LinkedInUrl).HasMaxLength(500);
        builder.Property(c => c.TwitterUrl).HasMaxLength(500);
        builder.Property(c => c.InstagramUrl).HasMaxLength(500);
        builder.Property(c => c.Culture).HasColumnType("text");
        builder.Property(c => c.Benefits).HasColumnType("text");
        builder.Property(c => c.HiringPhilosophy).HasColumnType("text");

        builder.HasIndex(c => c.Slug).IsUnique();
        builder.HasIndex(c => c.Name);
        builder.HasIndex(c => c.IsActive);
        builder.HasIndex(c => c.Status);
        builder.Property(c => c.Status).HasConversion<int>();
    }
}
