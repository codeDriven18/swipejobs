using SwipeJobs.Application.Modules.Ingestion.Models;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

internal static class AiExtractionMapper
{
    /// <summary>Maps the first vacancy (or a specific one) to a JobExtractionResult for the pipeline.</summary>
    public static JobExtractionResult ToJobExtractionResult(ParsedJobCandidate ai)
    {
        var v = ai.FirstVacancy
            ?? throw new InvalidOperationException("Cannot map a non-job response to a JobExtractionResult.");
        return MapVacancy(v);
    }

    /// <summary>Maps a specific vacancy to a JobExtractionResult.</summary>
    public static JobExtractionResult VacancyToExtractionResult(ParsedVacancy v) => MapVacancy(v);

    private static JobExtractionResult MapVacancy(ParsedVacancy v)
    {
        var applyMethod = ResolveApplyMethod(v.ApplyUrl, v.Email, v.TelegramContact, v.Phone, v.ApplyMethod);
        return new JobExtractionResult(
            v.Title,
            v.Company,
            v.Description,
            v.Location,
            v.Remote == true ? "Remote" : v.Location,
            v.Remote,
            v.SalaryMin,
            v.SalaryMax,
            JobCategory.It,
            MapLevel(v.ExperienceLevel),
            v.EmploymentType,
            v.Skills,
            applyMethod,
            v.ApplyUrl,
            v.Email,
            v.TelegramContact,
            v.Phone,
            v.Confidence);
    }

    private static ApplyMethodType ResolveApplyMethod(
        string? url, string? email, string? telegram, string? phone, string? applyMethod)
    {
        if (!string.IsNullOrWhiteSpace(url)) return ApplyMethodType.Url;
        if (!string.IsNullOrWhiteSpace(email)) return ApplyMethodType.Email;
        if (!string.IsNullOrWhiteSpace(telegram)) return ApplyMethodType.Telegram;
        if (!string.IsNullOrWhiteSpace(phone)) return ApplyMethodType.Phone;

        if (string.IsNullOrWhiteSpace(applyMethod))
            return ApplyMethodType.Unknown;

        var lower = applyMethod.ToLowerInvariant();
        if (lower.Contains("url") || lower.Contains("link")) return ApplyMethodType.Url;
        if (lower.Contains("email")) return ApplyMethodType.Email;
        if (lower.Contains("telegram")) return ApplyMethodType.Telegram;
        if (lower.Contains("phone")) return ApplyMethodType.Phone;
        return ApplyMethodType.Unknown;
    }

    private static JobLevel MapLevel(string? experienceLevel)
    {
        if (string.IsNullOrWhiteSpace(experienceLevel))
            return JobLevel.NotApplicable;

        var lower = experienceLevel.ToLowerInvariant();
        if (lower.Contains("intern") || lower.Contains("graduate")) return JobLevel.Internship;
        if (lower.Contains("junior") || lower.Contains("entry")) return JobLevel.Junior;
        if (lower.Contains("mid") || lower.Contains("senior") || lower.Contains("lead"))
            return JobLevel.MidLevel;
        return JobLevel.NotApplicable;
    }
}
