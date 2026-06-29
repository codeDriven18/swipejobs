using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using SwipeJobs.Application.Modules.Ingestion.Models;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

internal static class JobExtractionJsonParser
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };

    private static readonly Regex MarkdownFenceRegex = new(
        @"^```(?:json)?\s*([\s\S]*?)\s*```$",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    public static ParsedJobCandidate Parse(string responseText)
    {
        var json = NormalizeJsonPayload(responseText);
        var root = JsonDocument.Parse(json).RootElement;

        // ── New multi-vacancy format ──────────────────────────────────────────
        if (root.TryGetProperty("isJobPosting", out _) || root.TryGetProperty("postType", out _))
        {
            return ParseNewFormat(root);
        }

        // ── Legacy single-vacancy format (backwards compat) ──────────────────
        return ParseLegacyFormat(root, json);
    }

    // ── New format: { postType, isJobPosting, vacancies: [...] } ─────────────
    private static ParsedJobCandidate ParseNewFormat(JsonElement root)
    {
        var postType = root.TryGetProperty("postType", out var pt) ? pt.GetString() ?? "Unknown" : "Unknown";
        var isJobPosting = root.TryGetProperty("isJobPosting", out var ijp) && ijp.GetBoolean();

        if (!isJobPosting)
            return new ParsedJobCandidate(postType, false, []);

        var vacancies = new List<ParsedVacancy>();
        if (root.TryGetProperty("vacancies", out var vacArr) && vacArr.ValueKind == JsonValueKind.Array)
        {
            foreach (var v in vacArr.EnumerateArray())
            {
                var vacancy = ParseVacancyElement(v);
                if (vacancy is not null) vacancies.Add(vacancy);
            }
        }

        // If the AI returned no vacancies despite isJobPosting=true, treat as unknown
        if (vacancies.Count == 0)
            return new ParsedJobCandidate(postType, false, []);

        return new ParsedJobCandidate(postType, true, vacancies);
    }

    private static ParsedVacancy? ParseVacancyElement(JsonElement v)
    {
        var title = NullIfBlank(v.TryGetProperty("title", out var t) ? t.GetString() : null);
        if (title is null && !v.TryGetProperty("description", out _))
            return null; // skip empty entries

        return new ParsedVacancy(
            title,
            NullIfBlank(v.TryGetProperty("company", out var co) ? co.GetString() : null),
            TryGetDecimal(v, "salaryMin"),
            TryGetDecimal(v, "salaryMax"),
            NullIfBlank(v.TryGetProperty("currency", out var cu) ? cu.GetString() : null),
            NullIfBlank(v.TryGetProperty("location", out var lo) ? lo.GetString() : null),
            v.TryGetProperty("remote", out var rem) ? (rem.ValueKind == JsonValueKind.True ? true : rem.ValueKind == JsonValueKind.False ? false : (bool?)null) : null,
            NullIfBlank(v.TryGetProperty("employmentType", out var em) ? em.GetString() : null),
            NullIfBlank(v.TryGetProperty("experienceLevel", out var el) ? el.GetString() : null),
            ParseSkills(v),
            NullIfBlank(v.TryGetProperty("description", out var desc) ? desc.GetString() : null),
            NullIfBlank(v.TryGetProperty("applyMethod", out var am) ? am.GetString() : null),
            NullIfBlank(v.TryGetProperty("applyUrl", out var au) ? au.GetString() : null),
            NullIfBlank(v.TryGetProperty("email", out var email) ? email.GetString() : null),
            NullIfBlank(v.TryGetProperty("phone", out var ph) ? ph.GetString() : null),
            NullIfBlank(v.TryGetProperty("telegramContact", out var tg) ? tg.GetString() : null),
            Math.Clamp(v.TryGetProperty("confidence", out var conf) ? (conf.TryGetInt32(out var ci) ? ci : 0) : 0, 0, 100));
    }

    // ── Legacy single-vacancy format (old prompt shape) ───────────────────────
    private static ParsedJobCandidate ParseLegacyFormat(JsonElement root, string json)
    {
        var dto = JsonSerializer.Deserialize<LegacyExtractionDto>(json, JsonOptions)
            ?? throw new JsonException("AI JSON deserialized to null.");

        var vacancy = new ParsedVacancy(
            NullIfBlank(dto.Title),
            NullIfBlank(dto.Company),
            dto.SalaryMin,
            dto.SalaryMax,
            NullIfBlank(dto.Currency),
            NullIfBlank(dto.Location),
            dto.Remote,
            NullIfBlank(dto.EmploymentType),
            NullIfBlank(dto.ExperienceLevel),
            dto.Skills?.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase).ToList() ?? [],
            NullIfBlank(dto.Description),
            NullIfBlank(dto.ApplyMethod),
            NullIfBlank(dto.ApplyUrl),
            NullIfBlank(dto.Email),
            NullIfBlank(dto.Phone),
            NullIfBlank(dto.TelegramContact),
            Math.Clamp(dto.Confidence ?? 0, 0, 100));

        // Legacy format has no classification — assume it's a job if title or description present
        var isJob = vacancy.Title is not null || vacancy.Description is not null;
        return new ParsedJobCandidate("JobOffer", isJob, isJob ? [vacancy] : []);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static IReadOnlyList<string> ParseSkills(JsonElement v)
    {
        if (!v.TryGetProperty("skills", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return [];
        return arr.EnumerateArray()
            .Select(s => s.GetString()?.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(8)
            .ToList();
    }

    private static decimal? TryGetDecimal(JsonElement parent, string propertyName)
    {
        if (!parent.TryGetProperty(propertyName, out var prop)) return null;
        if (prop.ValueKind == JsonValueKind.Number && prop.TryGetDecimal(out var d)) return d;
        if (prop.ValueKind == JsonValueKind.String && decimal.TryParse(prop.GetString(), out var ds)) return ds;
        return null;
    }

    private static string NormalizeJsonPayload(string text)
    {
        var trimmed = text.Trim();
        var fenceMatch = MarkdownFenceRegex.Match(trimmed);
        if (fenceMatch.Success)
            trimmed = fenceMatch.Groups[1].Value.Trim();
        using var _ = JsonDocument.Parse(trimmed);
        return trimmed;
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    // ── Legacy DTO (old single-vacancy shape) ─────────────────────────────────
    private sealed class LegacyExtractionDto
    {
        public string? Title { get; set; }
        public string? Company { get; set; }
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public string? Currency { get; set; }
        public string? Location { get; set; }
        public bool? Remote { get; set; }
        public string? EmploymentType { get; set; }
        public string? ExperienceLevel { get; set; }
        public List<string>? Skills { get; set; }
        public string? Description { get; set; }
        public string? ApplyMethod { get; set; }
        public string? ApplyUrl { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? TelegramContact { get; set; }
        public int? Confidence { get; set; }
    }
}
