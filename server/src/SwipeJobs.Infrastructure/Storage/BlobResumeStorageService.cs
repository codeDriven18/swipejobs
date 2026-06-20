using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common.Interfaces;

namespace SwipeJobs.Infrastructure.Storage;

/// <summary>
/// Durable resume storage backed by Azure Blob Storage. Survives App Service restarts,
/// redeploys, and scale-out (unlike the local filesystem). Storage keys are
/// "{profileId}/{guid}{ext}" blob names, matching the local provider's key shape so the
/// two are interchangeable and existing ResumeUrl values keep working.
/// </summary>
public class BlobResumeStorageService : IResumeStorageService
{
    private readonly BlobContainerClient _container;
    private readonly ILogger<BlobResumeStorageService> _logger;

    public BlobResumeStorageService(IConfiguration configuration, ILogger<BlobResumeStorageService> logger)
    {
        _logger = logger;

        var connectionString = configuration["ResumeStorage:AzureBlobConnectionString"]
            ?? configuration.GetConnectionString("ResumeBlobStorage")
            ?? throw new InvalidOperationException(
                "Azure Blob resume storage selected but no connection string configured " +
                "(ResumeStorage:AzureBlobConnectionString or ConnectionStrings:ResumeBlobStorage).");

        var containerName = configuration["ResumeStorage:ContainerName"]?.Trim();
        if (string.IsNullOrWhiteSpace(containerName))
            containerName = "resumes";

        _container = new BlobContainerClient(connectionString, containerName);
        _container.CreateIfNotExists();
        _logger.LogInformation("Resume storage using Azure Blob container {Container}", containerName);
    }

    public async Task<string> SaveAsync(
        Guid profileId,
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

        var storageKey = $"{profileId}/{Guid.NewGuid():N}{ext}";
        var blob = _container.GetBlobClient(storageKey);
        await blob.UploadAsync(
            content,
            new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } },
            cancellationToken);

        _logger.LogInformation("Resume uploaded to blob storageKey={StorageKey}", storageKey);
        return storageKey;
    }

    public async Task<(Stream Content, string ContentType, string FileName)?> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storageKey) || storageKey.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "Resume blob open skipped: storageKey is empty or inline data. storageKey={StorageKey}", storageKey);
            return null;
        }

        var blob = _container.GetBlobClient(storageKey);
        if (!await blob.ExistsAsync(cancellationToken))
        {
            _logger.LogWarning(
                "Resume blob open failed: blob does not exist. storageKey={StorageKey} container={Container}",
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
            _ => "application/octet-stream",
        };

        return (download.Value.Content, contentType, Path.GetFileName(storageKey));
    }

    public async Task DeleteAsync(string? storageKey, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storageKey) || storageKey.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            return;

        var blob = _container.GetBlobClient(storageKey);
        await blob.DeleteIfExistsAsync(cancellationToken: cancellationToken);
        _logger.LogInformation("Resume blob deleted storageKey={StorageKey}", storageKey);
    }
}
