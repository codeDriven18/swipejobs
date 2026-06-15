using Microsoft.EntityFrameworkCore;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Infrastructure.Persistence.Repositories;

public class MessageRepository : Repository<Message>, IMessageRepository
{
    public MessageRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Message>> GetByConversationIdAsync(
        Guid conversationId, int limit, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.SentAt)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public Task<Message?> GetLatestByConversationIdAsync(Guid conversationId, CancellationToken cancellationToken = default)
        => DbSet.AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.SentAt)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<int> CountUnreadForCandidateAsync(
        Guid conversationId, Guid candidateUserId, CancellationToken cancellationToken = default)
        => DbSet.CountAsync(
            m => m.ConversationId == conversationId
                && m.Type == MessageType.User
                && m.SenderUserId != null
                && m.SenderUserId != candidateUserId
                && m.ReadAt == null,
            cancellationToken);

    public async Task<int> CountUnreadForCompanyAsync(
        Guid conversationId, Guid companyId, CancellationToken cancellationToken = default)
    {
        var memberUserIds = await Context.Set<CompanyMember>()
            .Where(cm => cm.CompanyId == companyId)
            .Select(cm => cm.UserId)
            .ToListAsync(cancellationToken);

        return await DbSet.CountAsync(
            m => m.ConversationId == conversationId
                && m.Type == MessageType.User
                && m.SenderUserId.HasValue
                && m.ReadAt == null
                && !memberUserIds.Contains(m.SenderUserId.Value),
            cancellationToken);
    }

    public async Task MarkReadForConversationAsync(
        Guid conversationId, Guid readerUserId, CancellationToken cancellationToken = default)
    {
        var unread = await DbSet
            .Where(m => m.ConversationId == conversationId
                && m.Type == MessageType.User
                && m.SenderUserId != null
                && m.SenderUserId != readerUserId
                && m.ReadAt == null)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var message in unread)
        {
            message.ReadAt = now;
        }
    }

    public Task<int> CountAllAsync(CancellationToken cancellationToken = default)
        => DbSet.CountAsync(cancellationToken);

    public Task<int> CountInterviewInvitationsAsync(CancellationToken cancellationToken = default)
        => Context.Set<Domain.Entities.Application>()
            .CountAsync(a => a.Status == ApplicationStatus.InterviewInvited, cancellationToken);
}
