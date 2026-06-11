using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Profiles;

internal static class ProfileFieldParser
{
    public static WorkArrangement ParseWorkArrangement(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return WorkArrangement.Any;

        return Enum.TryParse<WorkArrangement>(value, true, out var parsed)
            ? parsed
            : WorkArrangement.Any;
    }

    public static ProfileVisibility ParseVisibility(string? value, ProfileVisibility fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
            return fallback;

        return Enum.TryParse<ProfileVisibility>(value, true, out var parsed)
            ? parsed
            : fallback;
    }
}
