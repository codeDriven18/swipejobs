namespace SwipeJobs.Infrastructure.Persistence;

public sealed class PostgresConnectionRuntimeInfo
{
    public string Source { get; init; } = "unknown";
    public string Host { get; init; } = string.Empty;
    public string Database { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string SslMode { get; init; } = string.Empty;
    public int PasswordLength { get; init; }
    public bool HasConflictingSources { get; init; }
    public IReadOnlyList<ConnectionSourceSnapshot> AllSources { get; init; } = [];
}
