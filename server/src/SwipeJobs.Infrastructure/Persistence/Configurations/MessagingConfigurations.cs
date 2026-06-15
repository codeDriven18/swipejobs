using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Configurations;

public class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
{
    public void Configure(EntityTypeBuilder<Conversation> builder)
    {
        builder.ToTable("Conversations");
        builder.HasIndex(c => c.ApplicationId).IsUnique();
        builder.HasIndex(c => c.CandidateProfileId);
        builder.HasIndex(c => c.CompanyId);

        builder.HasOne(c => c.Application)
            .WithMany()
            .HasForeignKey(c => c.ApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.CandidateProfile)
            .WithMany()
            .HasForeignKey(c => c.CandidateProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Company)
            .WithMany()
            .HasForeignKey(c => c.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("Messages");
        builder.HasIndex(m => m.ConversationId);
        builder.HasIndex(m => new { m.ConversationId, m.SentAt });

        builder.Property(m => m.MessageText).HasMaxLength(4000);
        builder.Property(m => m.AttachmentUrl).HasMaxLength(512);
        builder.Property(m => m.AttachmentFileName).HasMaxLength(260);
        builder.Property(m => m.AttachmentContentType).HasMaxLength(128);

        builder.HasOne(m => m.Conversation)
            .WithMany(c => c.Messages)
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.User)
            .WithMany()
            .HasForeignKey(m => m.SenderUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
