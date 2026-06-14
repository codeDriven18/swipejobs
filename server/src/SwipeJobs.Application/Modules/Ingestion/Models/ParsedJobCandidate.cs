namespace SwipeJobs.Application.Modules.Ingestion.Models;

public record ParsedJobCandidate(
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
