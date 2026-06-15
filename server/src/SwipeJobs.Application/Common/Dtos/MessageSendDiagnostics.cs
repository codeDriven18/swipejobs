using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common.Dtos;

public record MessageSendDiagnostics(
    Guid ConversationId,
    Guid SenderUserId,
    UserRole Role,
    Guid? ApplicationId,
    ApplicationStatus? ApplicationStatus,
    ConversationStatus? ConversationStatus,
    bool ConversationExists,
    bool SenderInConversation,
    bool RecipientExists,
    bool ConversationActive,
    bool MessagingUnlocked,
    bool MessageTextValid,
    string ValidationResult,
    bool CanSend)
{
    public static MessageSendDiagnostics Failed(
        Guid conversationId,
        Guid senderUserId,
        UserRole role,
        string validationResult,
        Guid? applicationId = null,
        ApplicationStatus? applicationStatus = null,
        ConversationStatus? conversationStatus = null,
        bool conversationExists = false,
        bool senderInConversation = false,
        bool recipientExists = false,
        bool conversationActive = false,
        bool messagingUnlocked = false,
        bool messageTextValid = false)
        => new(
            conversationId,
            senderUserId,
            role,
            applicationId,
            applicationStatus,
            conversationStatus,
            conversationExists,
            senderInConversation,
            recipientExists,
            conversationActive,
            messagingUnlocked,
            messageTextValid,
            validationResult,
            false);
}
