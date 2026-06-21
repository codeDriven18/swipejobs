using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Configurations;

public class RecruiterTagConfiguration : IEntityTypeConfiguration<RecruiterTag>
{
    public void Configure(EntityTypeBuilder<RecruiterTag> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Name).HasMaxLength(64).IsRequired();

        builder.HasOne(t => t.Company)
            .WithMany()
            .HasForeignKey(t => t.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.CompanyId);
        builder.HasIndex(t => new { t.CompanyId, t.Name }).IsUnique();
    }
}
