using System.Net.Http.Headers;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

internal static class AiHttpExtractionHelpers
{
    public static int? ParseRetryAfterSeconds(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Retry-After", out var values))
            return null;

        var raw = values.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        if (int.TryParse(raw, out var seconds))
            return seconds;

        if (DateTimeOffset.TryParse(raw, out var retryAt))
        {
            var delta = retryAt - DateTimeOffset.UtcNow;
            return delta.TotalSeconds > 0 ? (int)Math.Ceiling(delta.TotalSeconds) : 0;
        }

        return null;
    }

    public static string? TryParseJsonErrorMessage(string body)
    {
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("error", out var error))
            {
                if (error.ValueKind == System.Text.Json.JsonValueKind.String)
                    return error.GetString();

                if (error.TryGetProperty("message", out var message))
                    return message.GetString();
            }
        }
        catch (System.Text.Json.JsonException)
        {
            /* ignore malformed error payloads */
        }

        return null;
    }

    public static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength] + "...";
}
