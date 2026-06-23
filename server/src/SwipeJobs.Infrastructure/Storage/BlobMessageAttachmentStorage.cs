using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common.Interfaces;

namespace SwipeJobs.Infrastructure.Storage;

/// <summary>
/// Durable message-attachment storage backed by Azure Blob Storage.
/// Survives App Service restarts, redeploys, and scale-out — unlike the local filesystem.
/// Storage keys remain "{conversationId}/{guid}{ext}", matching the local provider's shape
/// so existing AttachmentUrl values are interchangeable between the two implementations.
/// </summary>
public class BlobMessageAttachmentStorage : IMessageAttachmentStorage
{
    private readonly BlobContainerClient _container;
    private readonly ILogger<BlobMessageAttachmentStorage> _logger;

    public BlobMessageAttachmentStorage(
        IConfiguration configuration,
        ILogger<BlobMessageAttachmentStorage> logger)
    {
        _logger = logger;

        var connectionString = configuration["MessageStorage:AzureBlobConnectionString"]
            ?? configuration.GetConnectionString("MessageAttachmentBlobStorage")
            ?? throw new InvalidOperationException(
                "Azure Blob message-attachment storage selected but no connection string configured " +
                "(MessageStorage:AzureBlobConnectionString or ConnectionStrings:MessageAttachmentBlobStorage).");

        var containerName = configuration["MessageStorage:ContainerName"]?.Trim();
        if (string.IsNullOrWhiteSpace(containerName))
            containerName = "message-attachments";

        _container = new BlobContainerClient(connectionString, containerName);
        _container.CreateIfNotExists();
        _logger.LogInformation(
            "Message-attachment storage using Azure Blob container {Container}", containerName);
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
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/gif" => ".gif",
                "image/webp" => ".webp",
                _ => ".bin",
            };
        }

        var storageKey = $"{conversationId}/{Guid.NewGuid():N}{ext}";
        var blob = _container.GetBlobClient(storageKey);

        await blob.UploadAsync(
            content,
            new BlobUploadOptions
            {
                HttpHeaders = new BlobHttpHeaders
                {
                    ContentType = contentType,
                    ContentDisposition = $"attachment; filename=\"{Path.GetFileName(fileName)}\"",
                },
            },
            cancellationToken);

        _logger.LogInformation(
            "Message attachment uploaded to blob storageKey={StorageKey}", storageKey);
        return storageKey;
    }

    public async Task<(Stream Content, string ContentType, string FileName)?> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storageKey))
            return null;

        var blob = _container.GetBlobClient(storageKey);
        if (!await blob.ExistsAsync(cancellationToken))
        {
            _logger.LogWarning(
                "Message attachment blob does not exist. storageKey={StorageKey} container={Container}",
                storageKey, _container.Name);
            return null;
        }

        var download = await blob.DownloadStreamingAsync(cancellationToken: cancellationToken);
        var ext = Path.GetExtension(storageKey).ToLowerInvariant();
        var contentType = download.Value.Details.ContentType ?? ext switch
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

        return (download.Value.Content, contentType, Path.GetFileName(storageKey));
    }
}
