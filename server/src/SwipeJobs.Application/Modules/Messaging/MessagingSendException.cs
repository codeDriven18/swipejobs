using SwipeJobs.Application.Common.Dtos;

namespace SwipeJobs.Application.Modules.Messaging;

public sealed class MessagingSendException : Exception
{
    public MessagingSendException(string message, string code, MessageSendDiagnostics diagnostics)
        : base(message)
    {
        Code = code;
        Diagnostics = diagnostics;
    }

    public string Code { get; }
    public MessageSendDiagnostics Diagnostics { get; }
}
