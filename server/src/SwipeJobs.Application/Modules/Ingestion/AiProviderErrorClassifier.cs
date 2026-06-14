namespace SwipeJobs.Application.Modules.Ingestion;

public static class AiProviderErrorClassifier
{
    public static string ToFriendlyMessage(string providerName, int? statusCode, string? rawMessage)
    {
        var provider = string.IsNullOrWhiteSpace(providerName) ? "AI" : providerName.Trim();
        var lower = rawMessage?.ToLowerInvariant() ?? string.Empty;

        if (statusCode == 401 || lower.Contains("invalid api key") || lower.Contains("unauthorized"))
            return provider.Equals("OpenRouter", StringComparison.OrdinalIgnoreCase)
                ? "Invalid OpenRouter API key."
                : "Invalid Gemini API key.";

        if (statusCode == 429 || lower.Contains("rate limit") || lower.Contains("quota") || lower.Contains("resource_exhausted"))
            return provider.Equals("OpenRouter", StringComparison.OrdinalIgnoreCase)
                ? "OpenRouter rate limit exceeded."
                : "Gemini rate limit exceeded.";

        if (statusCode == 404 || (lower.Contains("not found") && lower.Contains("model")))
            return "Model not available.";

        if (statusCode is 502 or 503 or 504 || lower.Contains("unavailable"))
            return $"{provider} provider unavailable.";

        if (lower.Contains("model"))
            return "Model not available.";

        return provider.Equals("OpenRouter", StringComparison.OrdinalIgnoreCase)
            ? "OpenRouter extraction failed."
            : "Gemini extraction failed.";
    }

    public static string ToLogMessage(string providerName, int statusCode, string? apiMessage) =>
        $"{providerName} API error {statusCode}: {apiMessage ?? "Unknown error"}";
}
