using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SwipeJobs.Api.Helpers;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Modules.Messaging;
using SwipeJobs.Application.Modules.Messaging.Interfaces;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Api.Controllers;

[ApiController]
[Route("api/conversations")]
[Authorize]
public class ConversationsController : ControllerBase
{
    private static readonly HashSet<string> AllowedAttachmentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    private readonly IMessagingService _messagingService;
    private readonly IMessageAttachmentStorage _attachmentStorage;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<ConversationsController> _logger;

    public ConversationsController(
        IMessagingService messagingService,
        IMessageAttachmentStorage attachmentStorage,
        ICurrentUserService currentUser,
        ILogger<ConversationsController> logger)
    {
        _messagingService = messagingService;
        _attachmentStorage = attachmentStorage;
        _currentUser = currentUser;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.JobSeeker, UserRole.Admin);
        var profileId = _currentUser.GetRequiredProfileId();
        return Ok(await _messagingService.GetCandidateConversationsAsync(profileId, cancellationToken));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.JobSeeker, UserRole.Admin);
        var profileId = _currentUser.GetRequiredProfileId();
        var count = await _messagingService.GetCandidateUnreadCountAsync(profileId, cancellationToken);
        return Ok(new { count });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.JobSeeker, UserRole.Admin);
        var userId = _currentUser.GetRequiredUserId();
        var profileId = _currentUser.GetRequiredProfileId();
        var conversation = await _messagingService.GetConversationAsync(
            id, userId, UserRole.JobSeeker, null, profileId, cancellationToken);
        return conversation is null ? NotFound() : Ok(conversation);
    }

    [HttpGet("{id:guid}/messages")]
    public async Task<IActionResult> Messages(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.JobSeeker, UserRole.Admin);
        var userId = _currentUser.GetRequiredUserId();
        var profileId = _currentUser.GetRequiredProfileId();
        var messages = await _messagingService.GetMessagesAsync(
            id, userId, UserRole.JobSeeker, null, profileId, cancellationToken);
        return Ok(messages);
    }

    [HttpPost("{id:guid}/messages")]
    public async Task<IActionResult> Send(Guid id, [FromBody] SendMessageDto? dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.JobSeeker, UserRole.Admin);

        var contextError = MessagingSendResponses.ValidateSeekerContext(_currentUser, out var userId, out var profileId);
        if (contextError is not null)
            return contextError;

        if (!ModelState.IsValid)
            return MessagingSendResponses.ValidationFailed(ModelState);

        var bodyError = MessagingSendResponses.ValidateRequestBody(dto, out var messageText);
        if (bodyError is not null)
            return bodyError;

        _logger.LogInformation(
            "Candidate message send request conversationId={ConversationId} senderId={SenderId} applicationProfileId={ProfileId}",
            id,
            userId,
            profileId);

        try
        {
            var message = await _messagingService.SendMessageAsync(
                id, userId, UserRole.JobSeeker, null, profileId, messageText, cancellationToken);
            return message is null
                ? NotFound(new { error = "Conversation not found.", code = "conversation_not_found" })
                : Ok(message);
        }
        catch (MessagingSendException ex)
        {
            return MessagingSendResponses.FromSendException(ex);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(
                ex,
                "InvalidOperation during candidate message send conversationId={ConversationId} senderId={SenderId} profileId={ProfileId} message={Message}",
                id,
                userId,
                profileId,
                ex.Message);
            return MessagingSendResponses.FromUnexpectedException(ex, id, userId, profileId);
        }
    }

    [HttpPost("{id:guid}/attachments")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> SendAttachment(
        Guid id,
        IFormFile file,
        [FromForm] string? messageText,
        CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.JobSeeker, UserRole.Admin);
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "File is required." });

        if (!AllowedAttachmentTypes.Contains(file.ContentType))
            return BadRequest(new { error = "Only PDF and Word documents are allowed." });

        var userId = _currentUser.GetRequiredUserId();
        var profileId = _currentUser.GetRequiredProfileId();

        try
        {
            await using var stream = file.OpenReadStream();
            var message = await _messagingService.SendAttachmentAsync(
                id,
                userId,
                UserRole.JobSeeker,
                null,
                profileId,
                stream,
                file.FileName,
                file.ContentType,
                messageText,
                cancellationToken);
            return message is null ? NotFound() : Ok(message);
        }
        catch (MessagingSendException ex)
        {
            return MessagingSendResponses.FromSendException(ex);
        }
    }

    [HttpGet("{id:guid}/attachments/{messageId:guid}")]
    public async Task<IActionResult> DownloadAttachment(
        Guid id,
        Guid messageId,
        CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.JobSeeker, UserRole.Admin);
        var userId = _currentUser.GetRequiredUserId();
        var profileId = _currentUser.GetRequiredProfileId();
        var messages = await _messagingService.GetMessagesAsync(
            id, userId, UserRole.JobSeeker, null, profileId, cancellationToken);
        var message = messages.FirstOrDefault(m => m.Id == messageId);
        if (message?.AttachmentUrl is null)
            return NotFound();

        var opened = await _attachmentStorage.OpenReadAsync(message.AttachmentUrl, cancellationToken);
        if (opened is null)
            return NotFound();

        var (content, contentType, fileName) = opened.Value;
        return File(content, contentType, message.AttachmentFileName ?? fileName);
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.JobSeeker, UserRole.Admin);
        var userId = _currentUser.GetRequiredUserId();
        var profileId = _currentUser.GetRequiredProfileId();
        await _messagingService.MarkConversationReadAsync(
            id, userId, UserRole.JobSeeker, null, profileId, cancellationToken);
        return NoContent();
    }
}
