using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Application.Common.Interfaces.Repositories;

public interface IMessageRepository : IRepository<Message>
{
    Task<IReadOnlyList<Message>> GetByConversationIdAsync(Guid conversationId, int limit, CancellationToken cancellationToken = default);
    Task<Message?> GetLatestByConversationIdAsync(Guid conversationId, CancellationToken cancellationToken = default);
    Task<int> CountUnreadForCandidateAsync(Guid conversationId, Guid candidateUserId, CancellationToken cancellationToken = default);
    Task<int> CountUnreadForCompanyAsync(Guid conversationId, Guid companyId, CancellationToken cancellationToken = default);
    Task MarkReadForConversationAsync(Guid conversationId, Guid readerUserId, CancellationToken cancellationToken = default);
    Task<int> CountAllAsync(CancellationToken cancellationToken = default);
    Task<int> CountInterviewInvitationsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, int>> CountUnreadForCompanyByConversationIdsAsync(
        Guid companyId,
        IReadOnlyList<Guid> conversationIds,
        CancellationToken cancellationToken = default);
}
