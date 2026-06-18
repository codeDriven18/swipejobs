using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Mapping;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Messaging;
using SwipeJobs.Application.Modules.Messaging.Interfaces;
using SwipeJobs.Application.Modules.Personalization.Interfaces;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Messaging.Services;

public class MessagingService : IMessagingService
{
    private const int MessagePageSize = 100;

    private readonly IConversationRepository _conversationRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IApplicationRepository _applicationRepository;
    private readonly IJobRepository _jobRepository;
    private readonly IUserProfileRepository _profileRepository;
    private readonly IMessageAttachmentStorage _attachmentStorage;
    private readonly INotificationService _notificationService;
    private readonly IChatPublisher _chatPublisher;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<MessagingService> _logger;

    public MessagingService(
        IConversationRepository conversationRepository,
        IMessageRepository messageRepository,
        IApplicationRepository applicationRepository,
        IJobRepository jobRepository,
        IUserProfileRepository profileRepository,
        IMessageAttachmentStorage attachmentStorage,
        INotificationService notificationService,
        IChatPublisher chatPublisher,
        IUnitOfWork unitOfWork,
        ILogger<MessagingService> logger)
    {
        _conversationRepository = conversationRepository;
        _messageRepository = messageRepository;
        _applicationRepository = applicationRepository;
        _jobRepository = jobRepository;
        _profileRepository = profileRepository;
        _attachmentStorage = attachmentStorage;
        _notificationService = notificationService;
        _chatPublisher = chatPublisher;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ConversationSummaryDto>> GetCandidateConversationsAsync(
        Guid profileId, CancellationToken cancellationToken = default)
    {
        var conversations = await _conversationRepository.GetByCandidateProfileIdAsync(profileId, cancellationToken);
        var profile = await _profileRepository.GetByIdAsync(profileId, cancellationToken);
        var userId = profile?.UserId ?? Guid.Empty;

        var results = new List<ConversationSummaryDto>();
        foreach (var conversation in conversations)
        {
            results.Add(await ToSummaryAsync(conversation, userId, UserRole.JobSeeker, null, profileId, cancellationToken));
        }

        return results;
    }

    public async Task<IReadOnlyList<ConversationSummaryDto>> GetCompanyConversationsAsync(
        Guid companyId, string? filter, CancellationToken cancellationToken = default)
    {
        var conversations = await _conversationRepository.GetByCompanyIdAsync(companyId, cancellationToken);
        var filtered = ApplyCompanyFilter(conversations, filter);

        var results = new List<ConversationSummaryDto>();
        foreach (var conversation in filtered)
        {
            results.Add(await ToSummaryAsync(conversation, Guid.Empty, UserRole.Company, companyId, null, cancellationToken));
        }

        if (string.Equals(filter, "unread", StringComparison.OrdinalIgnoreCase))
            results = results.Where(r => r.UnreadCount > 0).ToList();

        return results;
    }

    public async Task<ConversationDetailDto?> GetConversationAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        CancellationToken cancellationToken = default)
    {
        var conversation = await _conversationRepository.GetByIdWithDetailsAsync(conversationId, cancellationToken);
        if (conversation is null || !CanAccess(conversation, role, companyId, profileId))
            return null;

        return ToDetail(conversation);
    }

    public async Task<IReadOnlyList<MessageDto>> GetMessagesAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        CancellationToken cancellationToken = default)
    {
        var conversation = await _conversationRepository.GetByIdWithDetailsAsync(conversationId, cancellationToken);
        if (conversation is null || !CanAccess(conversation, role, companyId, profileId))
            return [];

        var messages = await _messageRepository.GetByConversationIdAsync(
            conversationId, MessagePageSize, cancellationToken);

        return messages.Select(m => ToMessageDto(m, userId)).ToList();
    }

    public async Task<MessageDto?> SendMessageAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        string messageText, CancellationToken cancellationToken = default)
    {
        var diagnostics = await ValidateMessageSendAsync(
            conversationId, userId, role, companyId, profileId, messageText, cancellationToken);

        LogMessageSendAttempt(diagnostics, messageText);

        if (!diagnostics.CanSend)
        {
            throw new MessagingSendException(
                diagnostics.ValidationResult,
                ResolveSendErrorCode(diagnostics),
                diagnostics);
        }

        var text = messageText.Trim();
        var message = new Message
        {
            ConversationId = conversationId,
            Type = MessageType.User,
            SenderUserId = userId,
            MessageText = text,
            SentAt = DateTime.UtcNow,
        };

        var conversation = await _conversationRepository.GetByIdWithDetailsAsync(conversationId, cancellationToken)
            ?? throw new MessagingSendException(
                "Conversation not found.",
                "conversation_not_found",
                diagnostics);

        await _messageRepository.AddAsync(message, cancellationToken);
        conversation.UpdatedAt = DateTime.UtcNow;
        await _conversationRepository.UpdateAsync(conversation, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = ToMessageDto(message, userId);
        try
        {
            await _chatPublisher.PublishMessageAsync(conversationId, dto, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Chat publish failed after message save conversationId={ConversationId} messageId={MessageId}",
                conversationId,
                message.Id);
        }

        try
        {
            await NotifyNewMessageAsync(conversation, userId, text, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Message notification failed after send conversationId={ConversationId} messageId={MessageId}",
                conversationId,
                message.Id);
        }

        _logger.LogInformation(
            "Message send succeeded conversationId={ConversationId} senderId={SenderId} applicationId={ApplicationId}",
            conversationId,
            userId,
            diagnostics.ApplicationId);

        return dto;
    }

    public async Task<MessageDto?> SendAttachmentAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        Stream content, string fileName, string contentType, string? messageText,
        CancellationToken cancellationToken = default)
    {
        var body = string.IsNullOrWhiteSpace(messageText) ? fileName : messageText;
        var diagnostics = await ValidateMessageSendAsync(
            conversationId, userId, role, companyId, profileId, body, cancellationToken);

        LogMessageSendAttempt(diagnostics, body);

        if (!diagnostics.CanSend)
        {
            throw new MessagingSendException(
                diagnostics.ValidationResult,
                ResolveSendErrorCode(diagnostics),
                diagnostics);
        }

        var conversation = await _conversationRepository.GetByIdWithDetailsAsync(conversationId, cancellationToken)
            ?? throw new MessagingSendException(
                "Conversation not found.",
                "conversation_not_found",
                diagnostics);

        var storageKey = await _attachmentStorage.SaveAsync(
            conversationId, content, fileName, contentType, cancellationToken);

        var message = new Message
        {
            ConversationId = conversationId,
            Type = MessageType.User,
            SenderUserId = userId,
            MessageText = body.Trim(),
            AttachmentUrl = storageKey,
            AttachmentFileName = fileName,
            AttachmentContentType = contentType,
            SentAt = DateTime.UtcNow,
        };

        await _messageRepository.AddAsync(message, cancellationToken);
        conversation.UpdatedAt = DateTime.UtcNow;
        await _conversationRepository.UpdateAsync(conversation, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = ToMessageDto(message, userId);
        try
        {
            await _chatPublisher.PublishMessageAsync(conversationId, dto, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Chat publish failed after attachment save conversationId={ConversationId} messageId={MessageId}",
                conversationId,
                message.Id);
        }

        try
        {
            await NotifyNewMessageAsync(conversation, userId, message.MessageText, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Attachment notification failed after send conversationId={ConversationId} messageId={MessageId}",
                conversationId,
                message.Id);
        }

        return dto;
    }

    public async Task MarkConversationReadAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        CancellationToken cancellationToken = default)
    {
        var conversation = await _conversationRepository.GetByIdWithDetailsAsync(conversationId, cancellationToken);
        if (conversation is null || !CanAccess(conversation, role, companyId, profileId))
            return;

        await _messageRepository.MarkReadForConversationAsync(conversationId, userId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _chatPublisher.PublishReadAsync(conversationId, userId, cancellationToken);
    }

    public async Task<int> GetCandidateUnreadCountAsync(Guid profileId, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByIdAsync(profileId, cancellationToken);
        if (profile is null) return 0;

        var userId = profile.UserId ?? Guid.Empty;
        if (userId == Guid.Empty) return 0;

        var conversations = await _conversationRepository.GetByCandidateProfileIdAsync(profileId, cancellationToken);
        var total = 0;
        foreach (var conversation in conversations)
        {
            total += await _messageRepository.CountUnreadForCandidateAsync(
                conversation.Id, userId, cancellationToken);
        }

        return total;
    }

    public async Task<int> GetCompanyUnreadCountAsync(Guid companyId, CancellationToken cancellationToken = default)
    {
        var conversations = await _conversationRepository.GetByCompanyIdAsync(companyId, cancellationToken);
        var total = 0;
        foreach (var conversation in conversations)
        {
            total += await _messageRepository.CountUnreadForCompanyAsync(
                conversation.Id, companyId, cancellationToken);
        }

        return total;
    }

    public async Task<bool> CanAccessConversationAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        CancellationToken cancellationToken = default)
    {
        var conversation = await _conversationRepository.GetByIdWithDetailsAsync(conversationId, cancellationToken);
        return conversation is not null && CanAccess(conversation, role, companyId, profileId);
    }

    public async Task<InviteToInterviewResultDto?> InviteToInterviewAsync(
        Guid companyId, Guid applicationId, CancellationToken cancellationToken = default)
    {
        var application = await _applicationRepository.GetByIdAsync(applicationId, cancellationToken);
        if (application is null) return null;

        var job = await _jobRepository.GetByIdWithDetailsAsync(application.JobId, cancellationToken);
        if (job is null || job.CompanyId != companyId) return null;

        if (application.Status is ApplicationStatus.Withdrawn or ApplicationStatus.Rejected)
            throw new InvalidOperationException("Cannot invite a closed application.");

        var changedAt = DateTime.UtcNow;
        application.Status = ApplicationStatus.InterviewInvited;
        application.InterviewPhase = InterviewPhase.Requested;
        application.InterviewScheduledAtUtc = null;
        application.StatusHistoryJson = ApplicationStatusHistorySerializer.Append(
            application.StatusHistoryJson, ApplicationStatus.InterviewInvited, changedAt);
        await _applicationRepository.UpdateAsync(application, cancellationToken);

        var conversation = await EnsureConversationAsync(application, job.CompanyId, cancellationToken);
        conversation.Status = ConversationStatus.Active;
        conversation.ClosedAt = null;
        await _conversationRepository.UpdateAsync(conversation, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var companyName = job.Company?.Name ?? "Company";
        await AddSystemMessageAsync(
            conversation.Id,
            BuildStatusSystemMessage(ApplicationStatus.InterviewInvited, companyName, job.Title)
            ?? $"{companyName} invited you to interview for {job.Title}.",
            cancellationToken);

        await _notificationService.NotifyInterviewInvitedAsync(
            application.UserProfileId,
            application.Id,
            conversation.Id,
            job.Title,
            job.Company?.Name ?? "Company",
            cancellationToken);

        return new InviteToInterviewResultDto(application.Id, application.Status, conversation.Id);
    }

    public async Task<PortalApplicationDto?> ShortlistApplicationAsync(
        Guid companyId, Guid applicationId, CancellationToken cancellationToken = default)
    {
        var application = await _applicationRepository.GetByIdAsync(applicationId, cancellationToken);
        if (application is null) return null;

        var job = await _jobRepository.GetByIdWithDetailsAsync(application.JobId, cancellationToken);
        if (job is null || job.CompanyId != companyId) return null;

        if (application.Status is ApplicationStatus.Withdrawn or ApplicationStatus.Rejected)
            throw new InvalidOperationException("Cannot update a closed application.");

        var changedAt = DateTime.UtcNow;
        application.Status = ApplicationStatus.Shortlisted;
        application.StatusHistoryJson = ApplicationStatusHistorySerializer.Append(
            application.StatusHistoryJson, ApplicationStatus.Shortlisted, changedAt);
        await _applicationRepository.UpdateAsync(application, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _notificationService.NotifyApplicationStatusChangedAsync(
            application.UserProfileId,
            application.Id,
            ApplicationStatus.Shortlisted,
            job.Title,
            cancellationToken);

        var refreshed = await _applicationRepository.GetByIdForCompanyAsync(applicationId, companyId, cancellationToken);
        return refreshed is null ? null : PortalApplicationMapper.ToDto(refreshed);
    }

    public async Task<MessagingMetricsDto> GetMetricsAsync(CancellationToken cancellationToken = default)
    {
        var conversations = await _conversationRepository.CountAllAsync(cancellationToken);
        var messages = await _messageRepository.CountAllAsync(cancellationToken);
        var invites = await _messageRepository.CountInterviewInvitationsAsync(cancellationToken);

        var offers = await _applicationRepository.CountByStatusAsync(ApplicationStatus.OfferSent, cancellationToken);
        var hires = await _applicationRepository.CountByStatusAsync(ApplicationStatus.Hired, cancellationToken);

        return new MessagingMetricsDto(conversations, messages, invites, offers, hires);
    }

    public async Task SyncConversationStatusForApplicationAsync(
        Guid applicationId, ApplicationStatus status, ApplicationStatus? previousStatus = null,
        CancellationToken cancellationToken = default)
    {
        var conversation = await _conversationRepository.GetByApplicationIdTrackedAsync(
            applicationId, cancellationToken);
        if (conversation is null)
            return;

        var application = conversation.Application
            ?? await _applicationRepository.GetByIdAsync(applicationId, cancellationToken);
        var job = application is not null
            ? await _jobRepository.GetByIdWithDetailsAsync(application.JobId, cancellationToken)
            : null;
        var companyName = conversation.Company?.Name ?? job?.Company?.Name ?? "Company";
        var jobTitle = job?.Title ?? "this role";

        if (ApplicationWorkflow.IsConversationReadOnly(status) || status == ApplicationStatus.Hired)
        {
            conversation.Status = ConversationStatus.ReadOnly;
            conversation.ClosedAt = DateTime.UtcNow;
        }
        else if (ApplicationWorkflow.IsMessagingUnlocked(status))
        {
            conversation.Status = ConversationStatus.Active;
            conversation.ClosedAt = null;
        }

        await _conversationRepository.UpdateAsync(conversation, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (previousStatus is null || previousStatus == status)
            return;

        var statusText = BuildStatusSystemMessage(status, companyName, jobTitle);
        if (!string.IsNullOrWhiteSpace(statusText))
        {
            await AddSystemMessageAsync(conversation.Id, statusText, cancellationToken);
        }

        if (ApplicationWorkflow.IsConversationReadOnly(status) || status == ApplicationStatus.Hired)
        {
            await AddSystemMessageAsync(
                conversation.Id,
                "This conversation is now read-only.",
                cancellationToken);
        }
    }

    private async Task<Conversation> EnsureConversationAsync(
        Domain.Entities.Application application, Guid companyId, CancellationToken cancellationToken)
    {
        var existing = await _conversationRepository.GetByApplicationIdAsync(application.Id, cancellationToken);
        if (existing is not null)
            return await _conversationRepository.GetByIdWithDetailsAsync(existing.Id, cancellationToken) ?? existing;

        var conversation = new Conversation
        {
            ApplicationId = application.Id,
            CandidateProfileId = application.UserProfileId,
            CompanyId = companyId,
            Status = ConversationStatus.Active,
        };

        await _conversationRepository.AddAsync(conversation, cancellationToken);
        return conversation;
    }

    private static bool CanAccess(Conversation conversation, UserRole role, Guid? companyId, Guid? profileId)
    {
        if (role == UserRole.Admin) return true;
        if (role == UserRole.JobSeeker) return profileId == conversation.CandidateProfileId;
        if (role == UserRole.Company) return companyId == conversation.CompanyId;
        return false;
    }

    private static bool CanSend(Conversation conversation, ApplicationStatus appStatus)
    {
        if (conversation.Status != ConversationStatus.Active)
            return false;

        if (ApplicationWorkflow.IsConversationReadOnly(appStatus))
            return false;

        return ApplicationWorkflow.IsMessagingUnlocked(appStatus);
    }

    private async Task<MessageSendDiagnostics> ValidateMessageSendAsync(
        Guid conversationId,
        Guid userId,
        UserRole role,
        Guid? companyId,
        Guid? profileId,
        string? messageText,
        CancellationToken cancellationToken)
    {
        var conversation = await _conversationRepository.GetByIdWithDetailsAsync(conversationId, cancellationToken);
        if (conversation is null)
        {
            return MessageSendDiagnostics.Failed(
                conversationId,
                userId,
                role,
                "Conversation not found.");
        }

        var application = await _applicationRepository.GetByIdAsync(conversation.ApplicationId, cancellationToken);
        var appStatus = application?.Status;
        var senderInConversation = CanAccess(conversation, role, companyId, profileId);
        var recipientExists = conversation.CandidateProfile is not null && conversation.Company is not null;
        var conversationActive = conversation.Status == ConversationStatus.Active;
        var messagingUnlocked = appStatus.HasValue
            && ApplicationWorkflow.IsMessagingUnlocked(appStatus.Value)
            && !ApplicationWorkflow.IsConversationReadOnly(appStatus.Value);
        var messageTextValid = !string.IsNullOrWhiteSpace(messageText?.Trim());

        var validationResult = ResolveValidationMessage(
            senderInConversation,
            recipientExists,
            conversationActive,
            conversation.Status,
            appStatus,
            messageTextValid);

        var canSend = senderInConversation
            && recipientExists
            && conversationActive
            && messagingUnlocked
            && messageTextValid;

        return new MessageSendDiagnostics(
            conversationId,
            userId,
            role,
            conversation.ApplicationId,
            appStatus,
            conversation.Status,
            true,
            senderInConversation,
            recipientExists,
            conversationActive,
            messagingUnlocked,
            messageTextValid,
            validationResult,
            canSend);
    }

    private static string ResolveValidationMessage(
        bool senderInConversation,
        bool recipientExists,
        bool conversationActive,
        ConversationStatus conversationStatus,
        ApplicationStatus? applicationStatus,
        bool messageTextValid)
    {
        if (!senderInConversation)
            return "Sender is not a participant in this conversation.";

        if (!recipientExists)
            return "Conversation is missing candidate or company details.";

        if (!conversationActive)
            return $"Conversation is {conversationStatus.ToString().ToLowerInvariant()} and cannot accept new messages.";

        if (applicationStatus is null)
            return "Linked application could not be loaded.";

        if (ApplicationWorkflow.IsConversationReadOnly(applicationStatus.Value))
            return $"Application status is {applicationStatus.Value} and messaging is read-only.";

        if (!ApplicationWorkflow.IsMessagingUnlocked(applicationStatus.Value))
            return $"Messaging unlocks after Interview Invited. Current application status: {applicationStatus.Value}.";

        if (!messageTextValid)
            return "Message text cannot be empty.";

        return "Valid";
    }

    private void LogMessageSendAttempt(MessageSendDiagnostics diagnostics, string? requestBody)
    {
        _logger.LogInformation(
            "Message Send Attempt conversationId={ConversationId} senderId={SenderId} role={Role} applicationId={ApplicationId} applicationStatus={ApplicationStatus} conversationStatus={ConversationStatus} validationResult={ValidationResult} requestBodyLength={RequestBodyLength}",
            diagnostics.ConversationId,
            diagnostics.SenderUserId,
            diagnostics.Role,
            diagnostics.ApplicationId,
            diagnostics.ApplicationStatus,
            diagnostics.ConversationStatus,
            diagnostics.ValidationResult,
            requestBody?.Length ?? 0);
    }

    private static string ResolveSendErrorCode(MessageSendDiagnostics diagnostics)
    {
        if (!diagnostics.ConversationExists)
            return "conversation_not_found";

        if (!diagnostics.SenderInConversation)
            return "sender_not_in_conversation";

        if (!diagnostics.RecipientExists)
            return "recipient_missing";

        if (!diagnostics.MessageTextValid)
            return "empty_message";

        if (!diagnostics.ConversationActive)
            return "conversation_inactive";

        if (!diagnostics.MessagingUnlocked)
            return "messaging_locked";

        return "send_rejected";
    }

    private async Task<ConversationSummaryDto> ToSummaryAsync(
        Conversation conversation,
        Guid userId,
        UserRole role,
        Guid? companyId,
        Guid? profileId,
        CancellationToken cancellationToken)
    {
        var latest = await _messageRepository.GetLatestByConversationIdAsync(conversation.Id, cancellationToken);
        var unread = role == UserRole.Company && companyId.HasValue
            ? await _messageRepository.CountUnreadForCompanyAsync(conversation.Id, companyId.Value, cancellationToken)
            : profileId.HasValue
                ? await _messageRepository.CountUnreadForCandidateAsync(
                    conversation.Id, userId, cancellationToken)
                : 0;

        var application = conversation.Application;
        var job = application?.Job;
        var company = conversation.Company;
        var candidate = conversation.CandidateProfile;
        var appStatus = application?.Status ?? ApplicationStatus.Applied;

        return new ConversationSummaryDto(
            conversation.Id,
            conversation.ApplicationId,
            appStatus,
            conversation.Status,
            conversation.CandidateProfileId,
            $"{candidate?.FirstName} {candidate?.LastName}".Trim(),
            conversation.CompanyId,
            company?.Name ?? "Company",
            company?.LogoUrl,
            job?.Id ?? Guid.Empty,
            job?.Title ?? "Job",
            latest?.MessageText,
            latest?.SentAt,
            unread,
            CanSend(conversation, appStatus));
    }

    private static ConversationDetailDto ToDetail(Conversation conversation)
    {
        var application = conversation.Application;
        var job = application?.Job;
        var company = conversation.Company;
        var candidate = conversation.CandidateProfile;
        var appStatus = application?.Status ?? ApplicationStatus.Applied;

        return new ConversationDetailDto(
            conversation.Id,
            conversation.ApplicationId,
            appStatus,
            conversation.Status,
            conversation.CandidateProfileId,
            $"{candidate?.FirstName} {candidate?.LastName}".Trim(),
            conversation.CompanyId,
            company?.Name ?? "Company",
            company?.LogoUrl,
            job?.Id ?? Guid.Empty,
            job?.Title ?? "Job",
            CanSend(conversation, appStatus) && conversation.Status == ConversationStatus.Active,
            ApplicationWorkflow.IsConversationReadOnly(appStatus) || conversation.Status != ConversationStatus.Active);
    }

    private static MessageDto ToMessageDto(Message message, Guid currentUserId) =>
        new(
            message.Id,
            message.ConversationId,
            message.SenderUserId,
            message.Type == MessageType.User
                && message.SenderUserId.HasValue
                && message.SenderUserId.GetValueOrDefault() == currentUserId,
            message.Type,
            message.Type == MessageType.System,
            message.MessageText,
            message.AttachmentUrl,
            message.AttachmentFileName,
            message.AttachmentContentType,
            message.SentAt,
            message.ReadAt);

    private async Task AddSystemMessageAsync(
        Guid conversationId, string messageText, CancellationToken cancellationToken)
    {
        var text = messageText.Trim();
        if (string.IsNullOrWhiteSpace(text))
            return;

        var message = new Message
        {
            ConversationId = conversationId,
            Type = MessageType.System,
            SenderUserId = null,
            MessageText = text,
            SentAt = DateTime.UtcNow,
        };

        await _messageRepository.AddAsync(message, cancellationToken);
        var conversation = await _conversationRepository.GetByIdWithDetailsAsync(conversationId, cancellationToken);
        if (conversation is not null)
        {
            conversation.UpdatedAt = DateTime.UtcNow;
            await _conversationRepository.UpdateAsync(conversation, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = new MessageDto(
            message.Id,
            message.ConversationId,
            null,
            false,
            MessageType.System,
            true,
            message.MessageText,
            null,
            null,
            null,
            message.SentAt,
            null);

        await _chatPublisher.PublishMessageAsync(conversationId, dto, cancellationToken);
    }

    private static string? BuildStatusSystemMessage(
        ApplicationStatus status, string companyName, string jobTitle) =>
        status switch
        {
            ApplicationStatus.Shortlisted =>
                $"{companyName} shortlisted your application for {jobTitle}.",
            ApplicationStatus.InterviewInvited =>
                $"{companyName} invited you to interview for {jobTitle}.",
            ApplicationStatus.Interviewing =>
                $"Interview in progress for {jobTitle}.",
            ApplicationStatus.OfferSent =>
                $"{companyName} sent an offer for {jobTitle}.",
            ApplicationStatus.Rejected =>
                $"Application for {jobTitle} was not moved forward.",
            ApplicationStatus.Withdrawn =>
                $"Application for {jobTitle} was withdrawn.",
            ApplicationStatus.Hired =>
                $"Congratulations! You were hired for {jobTitle}.",
            _ => null,
        };

    private static IEnumerable<Conversation> ApplyCompanyFilter(IReadOnlyList<Conversation> conversations, string? filter)
    {
        if (string.IsNullOrWhiteSpace(filter)) return conversations;

        return filter.ToLowerInvariant() switch
        {
            "interviewing" => conversations.Where(c => c.Application?.Status == ApplicationStatus.Interviewing),
            "offer" => conversations.Where(c => c.Application?.Status == ApplicationStatus.OfferSent),
            "unread" => conversations, // filtered per-conversation in summary; keep all for client badge
            "active" => conversations.Where(c => c.Status == ConversationStatus.Active),
            _ => conversations,
        };
    }

    private async Task NotifyNewMessageAsync(
        Conversation conversation, Guid senderUserId, string preview, CancellationToken cancellationToken)
    {
        var candidate = conversation.CandidateProfile
            ?? await _profileRepository.GetByIdAsync(conversation.CandidateProfileId, cancellationToken);
        if (candidate is null) return;

        var companyName = conversation.Company?.Name ?? "Company";
        var candidateUserId = candidate.UserId;

        if (!candidateUserId.HasValue)
        {
            _logger.LogWarning(
                "Skipping message notification because candidate user id is missing conversationId={ConversationId} candidateProfileId={CandidateProfileId}",
                conversation.Id,
                conversation.CandidateProfileId);
            return;
        }

        if (senderUserId == candidateUserId.Value)
        {
            await _notificationService.NotifyNewMessageToCompanyAsync(
                conversation.CompanyId,
                conversation.Id,
                conversation.ApplicationId,
                $"{candidate.FirstName} {candidate.LastName}".Trim(),
                preview,
                cancellationToken);
            return;
        }

        await _notificationService.NotifyNewMessageAsync(
            conversation.CandidateProfileId,
            conversation.Id,
            conversation.ApplicationId,
            companyName,
            preview,
            cancellationToken);
    }
}
