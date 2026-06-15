using Microsoft.AspNetCore.SignalR;
using SwipeJobs.Api.Hubs;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;

namespace SwipeJobs.Api.Services;

public class SignalRChatPublisher : IChatPublisher
{
    private readonly IHubContext<ChatHub> _hub;

    public SignalRChatPublisher(IHubContext<ChatHub> hub)
    {
        _hub = hub;
    }

    public Task PublishMessageAsync(Guid conversationId, MessageDto message, CancellationToken cancellationToken = default)
        => _hub.Clients.Group(ChatHub.ConversationGroup(conversationId))
            .SendAsync("MessageReceived", message, cancellationToken);

    public Task PublishTypingAsync(Guid conversationId, Guid senderUserId, CancellationToken cancellationToken = default)
        => _hub.Clients.Group(ChatHub.ConversationGroup(conversationId))
            .SendAsync("Typing", new { conversationId, senderUserId }, cancellationToken);

    public Task PublishReadAsync(Guid conversationId, Guid readerUserId, CancellationToken cancellationToken = default)
        => _hub.Clients.Group(ChatHub.ConversationGroup(conversationId))
            .SendAsync("MessagesRead", new { conversationId, readerUserId }, cancellationToken);
}
