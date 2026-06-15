using SwipeJobs.Application.Common.Dtos;

namespace SwipeJobs.Application.Common.Interfaces;

public interface IChatPublisher
{
    Task PublishMessageAsync(Guid conversationId, MessageDto message, CancellationToken cancellationToken = default);
    Task PublishTypingAsync(Guid conversationId, Guid senderUserId, CancellationToken cancellationToken = default);
    Task PublishReadAsync(Guid conversationId, Guid readerUserId, CancellationToken cancellationToken = default);
}
