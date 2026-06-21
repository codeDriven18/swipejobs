using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Configurations;

public class ApplicationRecruiterTagConfiguration : IEntityTypeConfiguration<ApplicationRecruiterTag>
{
    public void Configure(EntityTypeBuilder<ApplicationRecruiterTag> builder)
    {
        builder.HasKey(t => new { t.ApplicationId, t.TagId });

        builder.HasOne(t => t.Application)
            .WithMany(a => a.RecruiterTags)
            .HasForeignKey(t => t.ApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.Tag)
            .WithMany(t => t.ApplicationTags)
            .HasForeignKey(t => t.TagId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
