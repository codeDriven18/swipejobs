using System.Text.RegularExpressions;

namespace SwipeJobs.Application.Modules.Ingestion;

public static partial class TelegramChannelUrlNormalizer
{
    [GeneratedRegex(
        @"(?:https?://)?(?:t\.me|telegram\.me)/(?:s/)?(?:\+|joinchat/)?([a-zA-Z0-9_+-]+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex ChannelHandleRegex();

    /// <summary>Canonical form: https://t.me/{handle} (lowercase handle, no trailing slash).</summary>
    public static string? Normalize(string? channelUrl)
    {
        if (string.IsNullOrWhiteSpace(channelUrl))
            return null;

        var handle = ExtractHandle(channelUrl);
        return handle is null ? null : $"https://t.me/{handle.ToLowerInvariant()}";
    }

    public static string? ExtractHandle(string? channelUrl)
    {
        if (string.IsNullOrWhiteSpace(channelUrl))
            return null;

        var trimmed = channelUrl.Trim().TrimEnd('/');
        var match = ChannelHandleRegex().Match(trimmed);
        return match.Success ? match.Groups[1].Value : null;
    }

    public static bool AreEquivalent(string? left, string? right)
    {
        var a = Normalize(left);
        var b = Normalize(right);
        return a is not null && b is not null && string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
    }
}
