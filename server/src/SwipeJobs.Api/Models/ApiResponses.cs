namespace SwipeJobs.Api.Models;

public record ApiErrorResponse(string Error, string? Code = null);

public record ApiSuccessResponse<T>(T Data);

public record ConnectionSourceHealthInfo(
    string SourceName,
    int PasswordLength,
    bool IsSet,
    bool IsWinner);

public record HealthResponse(
    string Status,
    string Service,
    string Version,
    string Database,
    DateTime CheckedAt,
    string? DatabaseHost = null,
    string? DatabaseName = null,
    string? DatabaseUser = null,
    string? SslMode = null,
    string? DatabaseError = null,
    string? ConnectionSource = null,
    int? PasswordLength = null,
    bool? HasConflictingSources = null,
    IReadOnlyList<ConnectionSourceHealthInfo>? ConnectionSources = null);
