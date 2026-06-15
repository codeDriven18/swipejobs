using System.Text.Json.Serialization;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common.Dtos;

public record ConversationSummaryDto(
    Guid Id,
    Guid ApplicationId,
    ApplicationStatus ApplicationStatus,
    ConversationStatus ConversationStatus,
    Guid CandidateProfileId,
    string CandidateName,
    Guid CompanyId,
    string CompanyName,
    string? CompanyLogoUrl,
    Guid JobId,
    string JobTitle,
    string? LatestMessageText,
    DateTime? LatestMessageAt,
    int UnreadCount,
    bool CanSendMessages);

public record ConversationDetailDto(
    Guid Id,
    Guid ApplicationId,
    ApplicationStatus ApplicationStatus,
    ConversationStatus ConversationStatus,
    Guid CandidateProfileId,
    string CandidateName,
    Guid CompanyId,
    string CompanyName,
    string? CompanyLogoUrl,
    Guid JobId,
    string JobTitle,
    bool CanSendMessages,
    bool IsReadOnly);

public record MessageDto(
    Guid Id,
    Guid ConversationId,
    Guid? SenderUserId,
    bool IsMine,
    MessageType Type,
    bool IsSystem,
    string MessageText,
    string? AttachmentUrl,
    string? AttachmentFileName,
    string? AttachmentContentType,
    DateTime SentAt,
    DateTime? ReadAt);

public sealed class SendMessageDto
{
    [JsonPropertyName("messageText")]
    public string? MessageText { get; set; }

    /// <summary>Backward-compatible alias for older clients.</summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    public string ResolveText() => (MessageText ?? Text ?? string.Empty).Trim();
}

public record MessagingMetricsDto(
    int ConversationsCreated,
    int MessagesSent,
    int InterviewInvitations,
    int OffersSent,
    int Hires);

public record InviteToInterviewResultDto(
    Guid ApplicationId,
    ApplicationStatus Status,
    Guid ConversationId);
