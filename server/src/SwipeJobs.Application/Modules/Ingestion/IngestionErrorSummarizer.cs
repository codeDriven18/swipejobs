namespace SwipeJobs.Application.Modules.Ingestion;

public static class IngestionErrorSummarizer
{
    public static string ForDisplay(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return "Ingestion failed.";

        var lower = raw.ToLowerInvariant();
        if (lower.Contains("openrouter rate limit"))
            return "OpenRouter rate limit exceeded.";
        if (lower.Contains("gemini rate limit"))
            return "Gemini rate limit exceeded.";
        if (lower.Contains("429") || lower.Contains("quota") || lower.Contains("rate limit") || lower.Contains("resource_exhausted"))
            return "Rate limit exceeded.";
        if (lower.Contains("invalid openrouter api key"))
            return "Invalid OpenRouter API key.";
        if (lower.Contains("invalid gemini api key"))
            return "Invalid Gemini API key.";
        if (lower.Contains("model not available") || (lower.Contains("not found") && lower.Contains("model")))
            return "Model not available.";
        if (lower.Contains("provider unavailable"))
            return "AI provider unavailable.";
        if (lower.Contains("apikey") || lower.Contains("api key"))
            return "AI API key missing.";
        if (lower.Contains("401") || lower.Contains("unauthorized"))
            return "AI authentication failed.";
        if (lower.Contains("invalid ai response"))
            return "Invalid AI response.";
        if (lower.Contains("persistence"))
            return "Candidate persistence failed.";
        if (lower.Contains("openrouter"))
            return "OpenRouter extraction failed.";
        if (lower.Contains("gemini"))
            return "Gemini extraction failed.";

        return "Ingestion failed.";
    }

    public static string ForLog(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? "Ingestion failed." : raw.Trim();
}
