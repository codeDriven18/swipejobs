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
        var dto = JsonSerializer.Deserialize<JobExtractionCandidateDto>(json, JsonOptions)
            ?? throw new JsonException("AI JSON deserialized to null.");

        return new ParsedJobCandidate(
            NullIfBlank(dto.Title),
            NullIfBlank(dto.Company),
            dto.SalaryMin,
            dto.SalaryMax,
            NullIfBlank(dto.Currency),
            NullIfBlank(dto.Location),
            dto.Remote,
            NullIfBlank(dto.EmploymentType),
            NullIfBlank(dto.ExperienceLevel),
            dto.Skills?.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList()
                ?? [],
            NullIfBlank(dto.Description),
            NullIfBlank(dto.ApplyMethod),
            NullIfBlank(dto.ApplyUrl),
            NullIfBlank(dto.Email),
            NullIfBlank(dto.Phone),
            NullIfBlank(dto.TelegramContact),
            Math.Clamp(dto.Confidence ?? 0, 0, 100));
    }

    private static string NormalizeJsonPayload(string text)
    {
        var trimmed = text.Trim();
        var fenceMatch = MarkdownFenceRegex.Match(trimmed);
        if (fenceMatch.Success)
            trimmed = fenceMatch.Groups[1].Value.Trim();

        using var document = JsonDocument.Parse(trimmed);
        return trimmed;
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed class JobExtractionCandidateDto
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
