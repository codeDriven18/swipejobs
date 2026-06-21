using System.Text.Json;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common;

public static class ApplicationActivityLogSerializer
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static List<ApplicationActivityEntry> Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<ApplicationActivityEntry>>(json, Options) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static string Serialize(IReadOnlyList<ApplicationActivityEntry> entries) =>
        JsonSerializer.Serialize(entries, Options);

    public static string Append(
        string? existingJson,
        RecruiterActivityType type,
        DateTime occurredAt,
        Guid? userId = null,
        string? details = null)
    {
        var log = Deserialize(existingJson);
        log.Add(new ApplicationActivityEntry
        {
            Type = type,
            OccurredAt = occurredAt,
            UserId = userId,
            Details = details,
        });
        return Serialize(log);
    }

    public static RecruiterActivityType? MapStatusToActivity(ApplicationStatus status) => status switch
    {
        ApplicationStatus.Applied => RecruiterActivityType.Applied,
        ApplicationStatus.UnderReview => RecruiterActivityType.Reviewed,
        ApplicationStatus.Shortlisted => RecruiterActivityType.Shortlisted,
        ApplicationStatus.InterviewInvited => RecruiterActivityType.InterviewScheduled,
        ApplicationStatus.Interviewing => RecruiterActivityType.InterviewScheduled,
        ApplicationStatus.OfferSent => RecruiterActivityType.OfferSent,
        ApplicationStatus.Hired => RecruiterActivityType.Hired,
        ApplicationStatus.Rejected => RecruiterActivityType.Rejected,
        ApplicationStatus.Withdrawn => RecruiterActivityType.Withdrawn,
        _ => null,
    };

    public static IReadOnlyList<ApplicationActivityEntry> BuildTimeline(
        string? statusHistoryJson,
        string? activityLogJson)
    {
        var statusEntries = ApplicationStatusHistorySerializer.Deserialize(statusHistoryJson)
            .Select(h => new ApplicationActivityEntry
            {
                Type = MapStatusToActivity(h.Status) ?? RecruiterActivityType.Applied,
                OccurredAt = h.ChangedAt,
            });

        var recruiterOnly = Deserialize(activityLogJson).Where(e => e.Type is
            RecruiterActivityType.NoteAdded or
            RecruiterActivityType.RatingChanged or
            RecruiterActivityType.TagAdded or
            RecruiterActivityType.TagRemoved or
            RecruiterActivityType.FavoriteAdded or
            RecruiterActivityType.FavoriteRemoved or
            RecruiterActivityType.InterviewScheduled);

        return statusEntries
            .Concat(recruiterOnly)
            .OrderByDescending(e => e.OccurredAt)
            .ToList();
    }
}
