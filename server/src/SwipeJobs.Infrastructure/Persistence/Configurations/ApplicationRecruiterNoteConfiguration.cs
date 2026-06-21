using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Configurations;

public class ApplicationRecruiterNoteConfiguration : IEntityTypeConfiguration<ApplicationRecruiterNote>
{
    public void Configure(EntityTypeBuilder<ApplicationRecruiterNote> builder)
    {
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Text).HasMaxLength(2000).IsRequired();

        builder.HasOne(n => n.Application)
            .WithMany(a => a.RecruiterNotes)
            .HasForeignKey(n => n.ApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(n => n.ApplicationId);
        builder.HasIndex(n => new { n.ApplicationId, n.CreatedAt });
    }
}
