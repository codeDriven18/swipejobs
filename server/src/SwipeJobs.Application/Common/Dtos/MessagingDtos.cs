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
    Guid SenderUserId,
    bool IsMine,
    string MessageText,
    string? AttachmentUrl,
    string? AttachmentFileName,
    string? AttachmentContentType,
    DateTime SentAt,
    DateTime? ReadAt);

public record SendMessageDto(string MessageText);

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
