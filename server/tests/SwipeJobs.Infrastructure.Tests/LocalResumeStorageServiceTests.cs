using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SwipeJobs.Infrastructure.Storage;
using Xunit;
using Xunit.Abstractions;

namespace SwipeJobs.Infrastructure.Tests;

/// <summary>
/// Reproduces and documents the resume download 404 root cause: a resume row in the
/// database (ResumeUrl populated) whose underlying file no longer exists in storage —
/// the exact situation produced by Azure App Service's ephemeral filesystem being wiped
/// on restart/redeploy. Proves OpenReadAsync returns null and logs the file-missing reason.
/// </summary>
public class LocalResumeStorageServiceTests
{
    private readonly ITestOutputHelper _output;

    public LocalResumeStorageServiceTests(ITestOutputHelper output)
    {
        _output = output;
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<string> Entries { get; } = new();

        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
            => Entries.Add($"{logLevel}: {formatter(state, exception)}");

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }

    private static (LocalResumeStorageService Service, CapturingLogger<LocalResumeStorageService> Logger, string BasePath) Create()
    {
        var basePath = Path.Combine(Path.GetTempPath(), "swipejobs-resume-tests", Guid.NewGuid().ToString("N"));
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["ResumeStorage:BasePath"] = basePath })
            .Build();
        var logger = new CapturingLogger<LocalResumeStorageService>();
        return (new LocalResumeStorageService(config, logger), logger, basePath);
    }

    [Fact]
    public async Task OpenReadAsync_ReturnsFile_ImmediatelyAfterSave()
    {
        var (service, _, _) = Create();
        var key = await service.SaveAsync(
            Guid.NewGuid(), new MemoryStream(new byte[] { 1, 2, 3, 4 }), "Jane_Doe_Resume.pdf", "application/pdf");

        var opened = await service.OpenReadAsync(key);

        Assert.NotNull(opened);
        await opened!.Value.Content.DisposeAsync();
    }

    [Fact]
    public async Task OpenReadAsync_ReturnsNull_AndLogsFileMissing_WhenFileWipedAfterSave()
    {
        var (service, logger, basePath) = Create();

        // 1. Candidate uploads a resume — ResumeUrl (storage key) is persisted in the DB.
        const string resumeFileName = "Jane_Doe_Resume.pdf";
        var resumeUrl = await service.SaveAsync(
            Guid.NewGuid(), new MemoryStream(new byte[] { 1, 2, 3, 4 }), resumeFileName, "application/pdf");

        // 2. Azure App Service restarts/redeploys -> ephemeral filesystem wipes the file,
        //    but the DB still holds ResumeUrl/ResumeFileName.
        var resolvedPath = Path.GetFullPath(Path.Combine(basePath, resumeUrl.Replace('/', Path.DirectorySeparatorChar)));
        File.Delete(resolvedPath);

        // 3. Employer downloads -> storage lookup.
        var opened = await service.OpenReadAsync(resumeUrl);

        // ---- Branch executed: file_missing_in_storage ----
        Assert.Null(opened);
        var fileExists = File.Exists(resolvedPath);
        Assert.False(fileExists);

        _output.WriteLine("Branch: file_missing_in_storage");
        _output.WriteLine($"ResumeUrl (storage key): {resumeUrl}");
        _output.WriteLine($"ResumeFileName:          {resumeFileName}");
        _output.WriteLine($"Resolved storage path:   {resolvedPath}");
        _output.WriteLine($"File.Exists returned:    {fileExists}");
        foreach (var entry in logger.Entries)
            _output.WriteLine($"LOG -> {entry}");

        Assert.Contains(logger.Entries, e =>
            e.Contains("file does not exist", StringComparison.OrdinalIgnoreCase)
            && e.Contains(resumeUrl, StringComparison.OrdinalIgnoreCase));
    }
}
