using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SwipeJobs.Api.Helpers;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Modules.Messaging;
using SwipeJobs.Application.Modules.Messaging.Interfaces;
using SwipeJobs.Application.Modules.Portal.Interfaces;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Api.Controllers;

[ApiController]
[Route("api/portal")]
[Authorize]
public class CompanyPortalController : ControllerBase
{
    private readonly ICompanyPortalService _portalService;
    private readonly IMessagingService _messagingService;
    private readonly IMessageAttachmentStorage _attachmentStorage;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<CompanyPortalController> _logger;

    public CompanyPortalController(
        ICompanyPortalService portalService,
        IMessagingService messagingService,
        IMessageAttachmentStorage attachmentStorage,
        ICurrentUserService currentUser,
        ILogger<CompanyPortalController> logger)
    {
        _portalService = portalService;
        _messagingService = messagingService;
        _attachmentStorage = attachmentStorage;
        _currentUser = currentUser;
        _logger = logger;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> Stats(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        return Ok(await _portalService.GetStatsAsync(companyId, cancellationToken));
    }

    [HttpGet("jobs")]
    public async Task<IActionResult> Jobs(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        return Ok(await _portalService.GetJobsAsync(companyId, cancellationToken));
    }

    [HttpPost("jobs")]
    public async Task<IActionResult> CreateJob([FromBody] PortalCreateJobDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();

        if (!ModelState.IsValid)
        {
            var errors = ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .ToDictionary(
                    e => e.Key,
                    e => e.Value!.Errors.Select(x => x.ErrorMessage).ToArray());
            _logger.LogWarning(
                "POST /api/portal/jobs model binding failed companyId={CompanyId} errors={Errors}",
                companyId,
                errors);
            return ValidationProblem(ModelState);
        }

        _logger.LogInformation(
            "POST /api/portal/jobs companyId={CompanyId} title={Title} category={Category} level={Level} isRemote={IsRemote} hasSalary={HasSalary}",
            companyId,
            dto.Title,
            dto.Category,
            dto.Level,
            dto.IsRemote,
            dto.SalaryMin.HasValue || dto.SalaryMax.HasValue);

        try
        {
            var job = await _portalService.CreateJobAsync(companyId, dto, cancellationToken);
            return Ok(job);
        }
        catch (InvalidOperationException ex)
        {
            var code = ex.Message.Contains("approved", StringComparison.OrdinalIgnoreCase)
                ? "company_not_approved"
                : ex.Message.Contains("source", StringComparison.OrdinalIgnoreCase)
                    ? "no_job_source"
                    : "job_create_rejected";

            _logger.LogWarning(
                ex,
                "POST /api/portal/jobs rejected companyId={CompanyId} code={Code}",
                companyId,
                code);

            return BadRequest(new { error = ex.Message, code });
        }
    }

    [HttpPut("jobs/{id:guid}")]
    public async Task<IActionResult> UpdateJob(Guid id, [FromBody] PortalUpdateJobDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var job = await _portalService.UpdateJobAsync(companyId, id, dto, cancellationToken);
        return job is null ? NotFound() : Ok(job);
    }

    [HttpPost("jobs/{id:guid}/archive")]
    public async Task<IActionResult> ArchiveJob(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var ok = await _portalService.ArchiveJobAsync(companyId, id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("applications")]
    public async Task<IActionResult> Applications([FromQuery] Guid? jobId, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        return Ok(await _portalService.GetApplicationsAsync(companyId, jobId, cancellationToken));
    }

    [HttpGet("applications/{id:guid}")]
    public async Task<IActionResult> GetApplicant(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var detail = await _portalService.GetApplicantDetailAsync(companyId, id, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpPatch("applications/{id:guid}/status")]
    public async Task<IActionResult> UpdateApplicationStatus(
        Guid id,
        [FromBody] PortalUpdateApplicationStatusDto dto,
        CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();

        try
        {
            var updated = await _portalService.UpdateApplicationStatusAsync(companyId, id, dto.Status, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message, code = "invalid_status" });
        }
    }

    [HttpGet("applications/{id:guid}/resume")]
    public async Task<IActionResult> DownloadApplicantResume(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var opened = await _portalService.OpenApplicantResumeAsync(companyId, id, cancellationToken);
        if (opened is null)
            return NotFound(new { error = "Resume not available." });

        var (stream, contentType, fileName) = opened.Value;
        return File(stream, contentType, fileName);
    }

    [HttpPost("applications/{id:guid}/invite-interview")]
    public async Task<IActionResult> InviteToInterview(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();

        try
        {
            var result = await _messagingService.InviteToInterviewAsync(companyId, id, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message, code = "invalid_invite" });
        }
    }

    [HttpPost("applications/{id:guid}/shortlist")]
    public async Task<IActionResult> ShortlistApplication(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();

        try
        {
            var updated = await _messagingService.ShortlistApplicationAsync(companyId, id, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message, code = "invalid_status" });
        }
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> Conversations([FromQuery] string? filter, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        return Ok(await _messagingService.GetCompanyConversationsAsync(companyId, filter, cancellationToken));
    }

    [HttpGet("conversations/unread-count")]
    public async Task<IActionResult> ConversationUnreadCount(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var count = await _messagingService.GetCompanyUnreadCountAsync(companyId, cancellationToken);
        return Ok(new { count });
    }

    [HttpGet("conversations/{id:guid}")]
    public async Task<IActionResult> GetConversation(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var userId = _currentUser.GetRequiredUserId();
        var conversation = await _messagingService.GetConversationAsync(
            id, userId, UserRole.Company, companyId, null, cancellationToken);
        return conversation is null ? NotFound() : Ok(conversation);
    }

    [HttpGet("conversations/{id:guid}/messages")]
    public async Task<IActionResult> ConversationMessages(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var userId = _currentUser.GetRequiredUserId();
        var messages = await _messagingService.GetMessagesAsync(
            id, userId, UserRole.Company, companyId, null, cancellationToken);
        return Ok(messages);
    }

    [HttpPost("conversations/{id:guid}/messages")]
    public async Task<IActionResult> SendConversationMessage(
        Guid id,
        [FromBody] SendMessageDto? dto,
        CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var userId = _currentUser.GetRequiredUserId();

        if (!ModelState.IsValid)
            return MessagingSendResponses.ValidationFailed(ModelState);

        var bodyError = MessagingSendResponses.ValidateRequestBody(dto, out var messageText);
        if (bodyError is not null)
            return bodyError;

        _logger.LogInformation(
            "Employer message send request conversationId={ConversationId} senderId={SenderId} companyId={CompanyId}",
            id,
            userId,
            companyId);

        try
        {
            var message = await _messagingService.SendMessageAsync(
                id, userId, UserRole.Company, companyId, null, messageText, cancellationToken);
            return message is null
                ? NotFound(new { error = "Conversation not found.", code = "conversation_not_found" })
                : Ok(message);
        }
        catch (MessagingSendException ex)
        {
            return MessagingSendResponses.FromSendException(ex);
        }
    }

    [HttpPost("conversations/{id:guid}/attachments")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> SendConversationAttachment(
        Guid id,
        IFormFile file,
        [FromForm] string? messageText,
        CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "File is required." });

        var companyId = _currentUser.GetRequiredCompanyId();
        var userId = _currentUser.GetRequiredUserId();

        try
        {
            await using var stream = file.OpenReadStream();
            var message = await _messagingService.SendAttachmentAsync(
                id,
                userId,
                UserRole.Company,
                companyId,
                null,
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

    [HttpPost("conversations/{id:guid}/read")]
    public async Task<IActionResult> MarkConversationRead(Guid id, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var userId = _currentUser.GetRequiredUserId();
        await _messagingService.MarkConversationReadAsync(
            id, userId, UserRole.Company, companyId, null, cancellationToken);
        return NoContent();
    }

    [HttpGet("conversations/{id:guid}/attachments/{messageId:guid}")]
    public async Task<IActionResult> DownloadConversationAttachment(
        Guid id,
        Guid messageId,
        CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var userId = _currentUser.GetRequiredUserId();
        var messages = await _messagingService.GetMessagesAsync(
            id, userId, UserRole.Company, companyId, null, cancellationToken);
        var message = messages.FirstOrDefault(m => m.Id == messageId);
        if (message?.AttachmentUrl is null)
            return NotFound();

        var opened = await _attachmentStorage.OpenReadAsync(message.AttachmentUrl, cancellationToken);
        if (opened is null)
            return NotFound();

        var (content, contentType, fileName) = opened.Value;
        return File(content, contentType, message.AttachmentFileName ?? fileName);
    }

    [HttpGet("company")]
    public async Task<IActionResult> Company(CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var company = await _portalService.GetCompanyAsync(companyId, cancellationToken);
        return company is null ? NotFound() : Ok(company);
    }

    [HttpPut("company")]
    public async Task<IActionResult> UpdateCompany([FromBody] PortalUpdateCompanyDto dto, CancellationToken cancellationToken)
    {
        _currentUser.RequireRole(UserRole.Company, UserRole.Admin);
        var companyId = _currentUser.GetRequiredCompanyId();
        var company = await _portalService.UpdateCompanyAsync(companyId, dto, cancellationToken);
        return company is null ? NotFound() : Ok(company);
    }
}
