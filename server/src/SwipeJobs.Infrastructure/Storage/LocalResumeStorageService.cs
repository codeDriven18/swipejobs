using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common.Interfaces;

namespace SwipeJobs.Infrastructure.Storage;

public class LocalResumeStorageService : IResumeStorageService
{
    private readonly string _basePath;
    private readonly ILogger<LocalResumeStorageService> _logger;

    public LocalResumeStorageService(IConfiguration configuration, ILogger<LocalResumeStorageService> logger)
    {
        _logger = logger;
        _basePath = ResolveBasePath(configuration["ResumeStorage:BasePath"]);
        Directory.CreateDirectory(_basePath);
        _logger.LogInformation("Resume storage base path resolved to {BasePath}", _basePath);
    }

    /// <summary>
    /// Resolves the storage root to an absolute, durable path.
    /// A relative path resolves against the process working directory, which on Azure
    /// App Service is ephemeral and wiped on restart/redeploy — the cause of resume 404s.
    /// When no absolute path is configured we prefer the App Service persistent volume
    /// (%HOME%, e.g. C:\home) so uploaded resumes survive deployments.
    /// </summary>
    private static string ResolveBasePath(string? configured)
    {
        var trimmed = configured?.Trim();
        if (!string.IsNullOrWhiteSpace(trimmed))
        {
            // Allow %HOME%/$HOME style values to be set via configuration.
            var expanded = Environment.ExpandEnvironmentVariables(trimmed);
            if (Path.IsPathRooted(expanded))
                return Path.GetFullPath(expanded);

            // Relative path configured: anchor it to the persistent home dir if available.
            var homeRoot = Environment.GetEnvironmentVariable("HOME");
            return string.IsNullOrWhiteSpace(homeRoot)
                ? Path.GetFullPath(expanded)
                : Path.GetFullPath(Path.Combine(homeRoot, "site", "data", expanded));
        }

        // No configuration: use the App Service persistent volume when running on Azure.
        var home = Environment.GetEnvironmentVariable("HOME");
        if (!string.IsNullOrWhiteSpace(home))
            return Path.GetFullPath(Path.Combine(home, "data", "resumes"));

        return Path.Combine(AppContext.BaseDirectory, "App_Data", "resumes");
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
        var fullPath = GetFullPath(storageKey);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var fileStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(fileStream, cancellationToken);

        _logger.LogInformation("Resume saved storageKey={StorageKey} bytes={Bytes}", storageKey, fileStream.Length);
        return storageKey;
    }

    public Task<(Stream Content, string ContentType, string FileName)?> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storageKey) || storageKey.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "Resume storage open skipped: storageKey is empty or inline data. storageKey={StorageKey}", storageKey);
            return Task.FromResult<(Stream Content, string ContentType, string FileName)?>(null);
        }

        var fullPath = GetFullPath(storageKey);
        if (!File.Exists(fullPath))
        {
            _logger.LogWarning(
                "Resume storage open failed: file does not exist. storageKey={StorageKey} resolvedPath={ResolvedPath} basePath={BasePath}",
                storageKey, fullPath, _basePath);
            return Task.FromResult<(Stream Content, string ContentType, string FileName)?>(null);
        }

        var ext = Path.GetExtension(fullPath).ToLowerInvariant();
        var contentType = ext switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            _ => "application/octet-stream",
        };

        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var downloadName = Path.GetFileName(fullPath);
        return Task.FromResult<(Stream Content, string ContentType, string FileName)?>((stream, contentType, downloadName));
    }

    public Task DeleteAsync(string? storageKey, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storageKey) || storageKey.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            return Task.CompletedTask;

        var fullPath = GetFullPath(storageKey);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            _logger.LogInformation("Resume deleted storageKey={StorageKey}", storageKey);
        }

        return Task.CompletedTask;
    }

    private string GetFullPath(string storageKey)
    {
        var normalized = storageKey.Replace('\\', '/').TrimStart('/');
        if (normalized.Contains("..", StringComparison.Ordinal))
            throw new InvalidOperationException("Invalid storage key.");

        return Path.GetFullPath(Path.Combine(_basePath, normalized.Replace('/', Path.DirectorySeparatorChar)));
    }
}
