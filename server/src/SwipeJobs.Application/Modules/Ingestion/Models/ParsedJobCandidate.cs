namespace SwipeJobs.Application.Modules.Ingestion.Models;

/// <summary>A single extracted vacancy from a Telegram post.</summary>
public record ParsedVacancy(
    string? Title,
    string? Company,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string? Currency,
    string? Location,
    bool? Remote,
    string? EmploymentType,
    string? ExperienceLevel,
    IReadOnlyList<string> Skills,
    string? Description,
    string? ApplyMethod,
    string? ApplyUrl,
    string? Email,
    string? Phone,
    string? TelegramContact,
    int Confidence);

/// <summary>Top-level AI response — includes classification and one or more vacancies.</summary>
public record ParsedJobCandidate(
    /// <summary>Classification: JobOffer | Internship | Freelance | Advertisement | Course | Announcement | News | Giveaway | Event | Spam</summary>
    string PostType,
    /// <summary>True only when the post is genuinely recruiting someone.</summary>
    bool IsJobPosting,
    /// <summary>Extracted vacancies. Empty when IsJobPosting is false.</summary>
    IReadOnlyList<ParsedVacancy> Vacancies)
{
    // ── Backwards-compat property: first vacancy or null ──────────────────
    public ParsedVacancy? FirstVacancy => Vacancies.Count > 0 ? Vacancies[0] : null;

    // Legacy shim — callers that still expect top-level fields get them from the first vacancy.
    public string? Title            => FirstVacancy?.Title;
    public string? Company          => FirstVacancy?.Company;
    public decimal? SalaryMin       => FirstVacancy?.SalaryMin;
    public decimal? SalaryMax       => FirstVacancy?.SalaryMax;
    public string? Location         => FirstVacancy?.Location;
    public bool? Remote             => FirstVacancy?.Remote;
    public string? EmploymentType   => FirstVacancy?.EmploymentType;
    public string? ExperienceLevel  => FirstVacancy?.ExperienceLevel;
    public IReadOnlyList<string> Skills => FirstVacancy?.Skills ?? [];
    public string? Description      => FirstVacancy?.Description;
    public string? ApplyMethod      => FirstVacancy?.ApplyMethod;
    public string? ApplyUrl         => FirstVacancy?.ApplyUrl;
    public string? Email            => FirstVacancy?.Email;
    public string? Phone            => FirstVacancy?.Phone;
    public string? TelegramContact  => FirstVacancy?.TelegramContact;
    public int Confidence           => FirstVacancy?.Confidence ?? 0;
}

public record AiExtractionResponse(
    ParsedJobCandidate? Result,
    string Provider,
    string Model,
    string ExtractionSource,
    bool Success,
    string? ErrorMessage,
    long ProcessingTimeMs,
    int? HttpStatusCode = null,
    bool IsRateLimited = false,
    int? RetryAfterSeconds = null);
