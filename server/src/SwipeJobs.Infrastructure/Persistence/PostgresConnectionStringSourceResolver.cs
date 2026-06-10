using Microsoft.Extensions.Configuration;
using Npgsql;

namespace SwipeJobs.Infrastructure.Persistence;

public sealed class ConnectionSourceSnapshot
{
    public required string SourceName { get; init; }
    public bool IsSet { get; init; }
    public int PasswordLength { get; init; }
    public string Host { get; init; } = string.Empty;
    public string Database { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string SslMode { get; init; } = string.Empty;
    public string Fingerprint { get; init; } = string.Empty;
}

public sealed class ConnectionSourceResolution
{
    public required string WinningSourceName { get; init; }
    public required string ConnectionString { get; init; }
    public required ConnectionSourceSnapshot Winner { get; init; }
    public required IReadOnlyList<ConnectionSourceSnapshot> AllSources { get; init; }
    public bool HasConflictingSources { get; init; }
}

public static class PostgresConnectionStringSourceResolver
{
    private static readonly string[] SourceNamesInPriorityOrder =
    [
        "ConnectionStrings:DefaultConnection",
        "ConnectionStrings__DefaultConnection",
        "CUSTOMCONNSTR_DefaultConnection",
        "POSTGRESQLCONNSTR_DefaultConnection",
    ];

    public static ConnectionSourceResolution Resolve(IConfiguration configuration)
    {
        var allSources = ReadAllSources(configuration);
        LogAllSources(allSources);

        var winner = SelectWinner(allSources);
        if (winner is null)
        {
            return new ConnectionSourceResolution
            {
                WinningSourceName = "missing",
                ConnectionString = string.Empty,
                Winner = new ConnectionSourceSnapshot { SourceName = "missing" },
                AllSources = allSources,
            };
        }

        var conflicting = HasConflictingValues(allSources);
        if (conflicting)
        {
            Console.Error.WriteLine(
                "WARNING: Multiple connection string sources are set but normalized values differ (compare PasswordLength/Fingerprint above).");
        }

        Console.Error.WriteLine(
            $"WINNING connection source: {winner.SourceName}; PasswordLength={winner.PasswordLength}");

        return new ConnectionSourceResolution
        {
            WinningSourceName = winner.SourceName,
            ConnectionString = GetRawValue(configuration, winner.SourceName) ?? string.Empty,
            Winner = winner,
            AllSources = allSources,
            HasConflictingSources = conflicting,
        };
    }

    public static IReadOnlyList<ConnectionSourceSnapshot> ReadAllSources(IConfiguration configuration)
    {
        return SourceNamesInPriorityOrder
            .Select(name => CreateSnapshot(name, GetRawValue(configuration, name)))
            .ToList();
    }

    private static ConnectionSourceSnapshot? SelectWinner(IReadOnlyList<ConnectionSourceSnapshot> sources)
        => sources.FirstOrDefault(source => source.IsSet);

    private static bool HasConflictingValues(IReadOnlyList<ConnectionSourceSnapshot> sources)
    {
        var set = sources.Where(source => source.IsSet).ToList();
        if (set.Count <= 1)
            return false;

        return set.Select(source => source.Fingerprint).Distinct(StringComparer.Ordinal).Count() > 1;
    }

    private static void LogAllSources(IReadOnlyList<ConnectionSourceSnapshot> sources)
    {
        Console.Error.WriteLine("=== PostgreSQL connection source audit (password never logged) ===");
        foreach (var source in sources)
        {
            if (!source.IsSet)
            {
                Console.Error.WriteLine($"  {source.SourceName}: not set");
                continue;
            }

            Console.Error.WriteLine(
                $"  {source.SourceName}: PasswordLength={source.PasswordLength}; Host={source.Host}; Database={source.Database}; Username={source.Username}; SSL Mode={source.SslMode}; Fingerprint={source.Fingerprint}");
        }
    }

    private static string? GetRawValue(IConfiguration configuration, string sourceName)
        => sourceName switch
        {
            "ConnectionStrings:DefaultConnection" => configuration.GetConnectionString("DefaultConnection"),
            "ConnectionStrings__DefaultConnection" => Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection"),
            "CUSTOMCONNSTR_DefaultConnection" => Environment.GetEnvironmentVariable("CUSTOMCONNSTR_DefaultConnection"),
            "POSTGRESQLCONNSTR_DefaultConnection" => Environment.GetEnvironmentVariable("POSTGRESQLCONNSTR_DefaultConnection"),
            _ => null,
        };

    private static ConnectionSourceSnapshot CreateSnapshot(string sourceName, string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return new ConnectionSourceSnapshot
            {
                SourceName = sourceName,
                IsSet = false,
            };
        }

        try
        {
            var normalized = PostgresConnectionStringNormalizer.Normalize(rawValue);
            var builder = new NpgsqlConnectionStringBuilder(normalized);
            var passwordLength = builder.Password?.Length ?? 0;

            return new ConnectionSourceSnapshot
            {
                SourceName = sourceName,
                IsSet = true,
                PasswordLength = passwordLength,
                Host = builder.Host ?? string.Empty,
                Database = builder.Database ?? string.Empty,
                Username = builder.Username ?? string.Empty,
                SslMode = builder.SslMode.ToString(),
                Fingerprint = $"{builder.Host}|{builder.Database}|{builder.Username}|{passwordLength}",
            };
        }
        catch
        {
            return new ConnectionSourceSnapshot
            {
                SourceName = sourceName,
                IsSet = true,
                PasswordLength = 0,
                Fingerprint = "invalid",
            };
        }
    }
}
