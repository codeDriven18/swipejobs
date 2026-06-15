using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
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

    public MessagingService(
        IConversationRepository conversationRepository,
        IMessageRepository messageRepository,
        IApplicationRepository applicationRepository,
        IJobRepository jobRepository,
        IUserProfileRepository profileRepository,
        IMessageAttachmentStorage attachmentStorage,
        INotificationService notificationService,
        IChatPublisher chatPublisher,
        IUnitOfWork unitOfWork)
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
        var conversation = await _conversationRepository.GetByIdWithDetailsAsync(conversationId, cancellationToken);
        if (conversation is null || !CanAccess(conversation, role, companyId, profileId))
            return null;

        if (!CanSend(conversation, role))
            throw new InvalidOperationException("Messaging is not available for this application.");

        var text = messageText.Trim();
        if (string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException("Message cannot be empty.");

        var message = new Message
        {
            ConversationId = conversationId,
            SenderUserId = userId,
            MessageText = text,
            SentAt = DateTime.UtcNow,
        };

        await _messageRepository.AddAsync(message, cancellationToken);
        conversation.UpdatedAt = DateTime.UtcNow;
        await _conversationRepository.UpdateAsync(conversation, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = ToMessageDto(message, userId);
        await _chatPublisher.PublishMessageAsync(conversationId, dto, cancellationToken);
        await NotifyNewMessageAsync(conversation, userId, text, cancellationToken);

        return dto;
    }

    public async Task<MessageDto?> SendAttachmentAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        Stream content, string fileName, string contentType, string? messageText,
        CancellationToken cancellationToken = default)
    {
        var conversation = await _conversationRepository.GetByIdWithDetailsAsync(conversationId, cancellationToken);
        if (conversation is null || !CanAccess(conversation, role, companyId, profileId))
            return null;

        if (!CanSend(conversation, role))
            throw new InvalidOperationException("Messaging is not available for this application.");

        var storageKey = await _attachmentStorage.SaveAsync(
            conversationId, content, fileName, contentType, cancellationToken);

        var message = new Message
        {
            ConversationId = conversationId,
            SenderUserId = userId,
            MessageText = string.IsNullOrWhiteSpace(messageText) ? $"Shared {fileName}" : messageText.Trim(),
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
        await _chatPublisher.PublishMessageAsync(conversationId, dto, cancellationToken);
        await NotifyNewMessageAsync(conversation, userId, message.MessageText, cancellationToken);

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
        application.StatusHistoryJson = ApplicationStatusHistorySerializer.Append(
            application.StatusHistoryJson, ApplicationStatus.InterviewInvited, changedAt);
        await _applicationRepository.UpdateAsync(application, cancellationToken);

        var conversation = await EnsureConversationAsync(application, job.CompanyId, cancellationToken);
        conversation.Status = ConversationStatus.Active;
        conversation.ClosedAt = null;
        await _conversationRepository.UpdateAsync(conversation, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

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
        return refreshed is null ? null : ToPortalApplicationDto(refreshed);
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
        Guid applicationId, ApplicationStatus status, CancellationToken cancellationToken = default)
    {
        var conversation = await _conversationRepository.GetByApplicationIdTrackedAsync(
            applicationId, cancellationToken);
        if (conversation is null)
            return;

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

    private static bool CanSend(Conversation conversation, UserRole role)
    {
        if (conversation.Status != ConversationStatus.Active)
            return false;

        var appStatus = conversation.Application?.Status ?? ApplicationStatus.Applied;
        if (ApplicationWorkflow.IsConversationReadOnly(appStatus))
            return false;

        return ApplicationWorkflow.IsMessagingUnlocked(appStatus);
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
            CanSend(conversation, role));
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
            ApplicationWorkflow.IsMessagingUnlocked(appStatus) && conversation.Status == ConversationStatus.Active,
            ApplicationWorkflow.IsConversationReadOnly(appStatus) || conversation.Status != ConversationStatus.Active);
    }

    private static MessageDto ToMessageDto(Message message, Guid currentUserId) =>
        new(
            message.Id,
            message.ConversationId,
            message.SenderUserId,
            message.SenderUserId == currentUserId,
            message.MessageText,
            message.AttachmentUrl,
            message.AttachmentFileName,
            message.AttachmentContentType,
            message.SentAt,
            message.ReadAt);

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

        if (senderUserId == candidate.UserId)
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

    private static PortalApplicationDto ToPortalApplicationDto(Domain.Entities.Application a)
    {
        var profile = a.UserProfile;
        var trust = profile is null
            ? CandidateTrustLevel.None
            : CandidateTrustCalculator.Compute(profile);

        return new PortalApplicationDto(
            a.Id,
            a.Status,
            a.AppliedAt,
            a.JobId,
            a.Job?.Title ?? "Job",
            a.UserProfileId,
            $"{profile?.FirstName} {profile?.LastName}".Trim(),
            profile?.Email ?? string.Empty,
            profile?.Phone,
            profile?.ProfileImageUrl,
            a.ReapplicationCount,
            ApplicationWorkflow.ToApplicationNumber(a.ReapplicationCount),
            trust);
    }
}
