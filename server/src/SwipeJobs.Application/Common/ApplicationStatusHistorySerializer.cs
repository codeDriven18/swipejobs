using System.Text.Json;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common;

public static class ApplicationStatusHistorySerializer
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static string Serialize(IReadOnlyList<ApplicationStatusHistoryEntry> history) =>
        JsonSerializer.Serialize(history, Options);

    public static List<ApplicationStatusHistoryEntry> Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<ApplicationStatusHistoryEntry>>(json, Options) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static string Append(string? existingJson, ApplicationStatus status, DateTime changedAt)
    {
        var history = Deserialize(existingJson);
        history.Add(new ApplicationStatusHistoryEntry { Status = status, ChangedAt = changedAt });
        return Serialize(history);
    }

    public static string CreateInitial(ApplicationStatus status, DateTime appliedAt) =>
        Serialize([new ApplicationStatusHistoryEntry { Status = status, ChangedAt = appliedAt }]);
}
