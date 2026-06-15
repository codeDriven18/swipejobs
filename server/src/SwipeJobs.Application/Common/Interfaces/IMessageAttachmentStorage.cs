namespace SwipeJobs.Application.Common.Interfaces;

public interface IMessageAttachmentStorage
{
    Task<string> SaveAsync(
        Guid conversationId,
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default);

    Task<(Stream Content, string ContentType, string FileName)?> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken = default);
}
