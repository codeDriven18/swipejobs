using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common.Interfaces;

namespace SwipeJobs.Infrastructure.Storage;

public class LocalMessageAttachmentStorage : IMessageAttachmentStorage
{
    private readonly string _basePath;
    private readonly ILogger<LocalMessageAttachmentStorage> _logger;

    public LocalMessageAttachmentStorage(IConfiguration configuration, ILogger<LocalMessageAttachmentStorage> logger)
    {
        _logger = logger;
        _basePath = configuration["MessageStorage:BasePath"]?.Trim()
            ?? Path.Combine(AppContext.BaseDirectory, "App_Data", "message-attachments");
        Directory.CreateDirectory(_basePath);
    }

    public async Task<string> SaveAsync(
        Guid conversationId,
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(Path.GetFileName(fileName));
        if (string.IsNullOrWhiteSpace(ext))
        {
            ext = contentType switch
            {
                "application/pdf" => ".pdf",
                "application/msword" => ".doc",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => ".docx",
                _ => ".bin",
            };
        }

        var storageKey = $"{conversationId}/{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(_basePath, storageKey.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var fileStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(fileStream, cancellationToken);

        _logger.LogInformation("Message attachment saved key={Key}", storageKey);
        return storageKey;
    }

    public Task<(Stream Content, string ContentType, string FileName)?> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storageKey))
            return Task.FromResult<(Stream Content, string ContentType, string FileName)?>(null);

        var fullPath = Path.Combine(_basePath, storageKey.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(fullPath))
            return Task.FromResult<(Stream Content, string ContentType, string FileName)?>(null);

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var fileName = Path.GetFileName(fullPath);
        var contentType = Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "application/octet-stream",
        };

        return Task.FromResult<(Stream Content, string ContentType, string FileName)?>(
            (stream, contentType, fileName));
    }
}
