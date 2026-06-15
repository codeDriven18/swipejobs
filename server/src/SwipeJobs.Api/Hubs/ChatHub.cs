using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SwipeJobs.Api.Hubs;

[Authorize]
public class ChatHub : Hub
{
    public async Task JoinConversation(string conversationId)
    {
        if (Guid.TryParse(conversationId, out var id))
            await Groups.AddToGroupAsync(Context.ConnectionId, ConversationGroup(id));
    }

    public async Task LeaveConversation(string conversationId)
    {
        if (Guid.TryParse(conversationId, out var id))
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, ConversationGroup(id));
    }

    public async Task SendTyping(string conversationId)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");
        if (!Guid.TryParse(conversationId, out var id) || string.IsNullOrWhiteSpace(userId))
            return;

        await Clients.OthersInGroup(ConversationGroup(id))
            .SendAsync("Typing", new { conversationId = id, senderUserId = userId });
    }

    public static string ConversationGroup(Guid conversationId) => $"conversation:{conversationId}";
}
