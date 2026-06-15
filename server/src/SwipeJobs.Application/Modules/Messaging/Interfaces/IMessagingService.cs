using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Messaging.Interfaces;

public interface IMessagingService
{
    Task<IReadOnlyList<ConversationSummaryDto>> GetCandidateConversationsAsync(
        Guid profileId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ConversationSummaryDto>> GetCompanyConversationsAsync(
        Guid companyId, string? filter, CancellationToken cancellationToken = default);

    Task<ConversationDetailDto?> GetConversationAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MessageDto>> GetMessagesAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        CancellationToken cancellationToken = default);

    Task<MessageDto?> SendMessageAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        string messageText, CancellationToken cancellationToken = default);

    Task<MessageDto?> SendAttachmentAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        Stream content, string fileName, string contentType, string? messageText,
        CancellationToken cancellationToken = default);

    Task MarkConversationReadAsync(
        Guid conversationId, Guid userId, UserRole role, Guid? companyId, Guid? profileId,
        CancellationToken cancellationToken = default);

    Task<int> GetCandidateUnreadCountAsync(Guid profileId, CancellationToken cancellationToken = default);

    Task<InviteToInterviewResultDto?> InviteToInterviewAsync(
        Guid companyId, Guid applicationId, CancellationToken cancellationToken = default);

    Task<PortalApplicationDto?> ShortlistApplicationAsync(
        Guid companyId, Guid applicationId, CancellationToken cancellationToken = default);

    Task<MessagingMetricsDto> GetMetricsAsync(CancellationToken cancellationToken = default);

    Task SyncConversationStatusForApplicationAsync(
        Guid applicationId, ApplicationStatus status, CancellationToken cancellationToken = default);
}
