using System.Text.Json;
using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Modules.Ingestion.Models;
using SwipeJobs.Application.Modules.Ingestion.Services;
using SwipeJobs.Domain.Entities;
using ApplicationEntity = SwipeJobs.Domain.Entities.Application;

namespace SwipeJobs.Application.Common.Mapping;

public static class TagMapper
{
    public static TagDto ToDto(Tag tag) => new(tag.Id, tag.Name, tag.Slug);
}

public static class SourceMapper
{
    public static SourceDto ToDto(Source source) =>
        new(
            source.Id,
            source.Name,
            source.Type,
            source.ExternalIdentifier,
            source.LogoUrl,
            source.TrustScore,
            SourceTrustHelper.ToLevel(source.TrustScore),
            source.IsActive);
}

public static class CompanyMapper
{
    public static CompanyDto ToDto(Company company, int openJobsCount = 0) => new(
        company.Id,
        company.Name,
        company.Slug,
        company.Description,
        company.Industry,
        company.Location,
        company.CompanySize,
        company.LogoUrl,
        company.BannerUrl,
        company.Website,
        company.LinkedInUrl,
        company.Status,
        company.IsActive,
        openJobsCount,
        company.CreatedAt,
        company.UpdatedAt);
}

public static class JobMapper
{
    public static JobDto ToDto(Job job) => ToDto(job, []);

    public static JobDto ToDto(Job job, IReadOnlyList<string>? trendingBadges)
    {
        var preview = ResolveDisplayPreview(job);
        return new JobDto(
            job.Id,
            job.Title,
            job.Description,
            job.CompanyId,
            job.Company?.Name ?? string.Empty,
            job.Company?.LogoUrl,
            job.Company?.BannerUrl,
            job.Company?.Slug,
            job.Company?.Website,
            job.Company?.LinkedInUrl,
            job.Company?.Industry,
            job.Company?.CompanySize,
            job.Company?.Description,
            job.Location,
            job.City,
            job.Category,
            job.Level,
            job.IsRemote,
            job.IsActive,
            job.IsArchived,
            job.SalaryMin,
            job.SalaryMax,
            job.ExpiresAt,
            job.ExternalUrl,
            job.JobImageUrl,
            job.AiGeneratedImageUrl,
            job.SourceId,
            job.Source?.Name,
            job.Source?.LogoUrl,
            SourceTrustHelper.ToLevel(job.Source?.TrustScore ?? 0),
            job.Source?.TrustScore ?? 0,
            job.JobTags?.Select(jt => TagMapper.ToDto(jt.Tag)).ToList() ?? [],
            trendingBadges ?? [],
            preview.DisplayTitle,
            preview.DisplayCompany,
            preview.DisplaySalary,
            preview.DisplayLocation,
            preview.DisplaySkills,
            preview.DisplaySummary,
            job.CreatedAt,
            job.UpdatedAt);
    }

    private static JobPreviewResult ResolveDisplayPreview(Job job)
    {
        if (!string.IsNullOrWhiteSpace(job.DisplayTitle) && !string.IsNullOrWhiteSpace(job.DisplaySummary))
        {
            return JobPreviewTextSanitizer.EnforceLimits(new JobPreviewResult(
                job.DisplayTitle,
                job.DisplayCompany ?? JobPreviewTextSanitizer.CompanyNotSpecified,
                job.DisplaySalary ?? "Not disclosed",
                job.DisplayLocation ?? "Location not specified",
                ParseDisplaySkills(job.DisplaySkillsJson),
                job.DisplaySummary));
        }

        var tagSkills = job.JobTags?.Select(jt => jt.Tag.Name).ToList() ?? [];
        return JobPreviewFallbackGenerator.FromJobFields(
            job.Title,
            job.Description,
            job.Company?.Name ?? string.Empty,
            job.SalaryMin,
            job.SalaryMax,
            job.Category,
            job.IsRemote,
            job.City,
            job.Location,
            tagSkills);
    }

    private static IReadOnlyList<string> ParseDisplaySkills(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json)?
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .Take(5)
                .ToList() ?? [];
        }
        catch
        {
            return [];
        }
    }

    public static void ApplyCreate(Job job, CreateJobDto dto)
    {
        job.Title = dto.Title;
        job.Description = dto.Description;
        job.CompanyId = dto.CompanyId;
        job.Location = dto.Location;
        job.City = dto.City;
        job.Category = dto.Category;
        job.Level = dto.Level;
        job.IsRemote = dto.IsRemote;
        job.SalaryMin = dto.SalaryMin;
        job.SalaryMax = dto.SalaryMax;
        job.ExpiresAt = dto.ExpiresAt;
        job.ExternalUrl = dto.ExternalUrl;
        job.JobImageUrl = dto.JobImageUrl;
        job.AiGeneratedImageUrl = dto.AiGeneratedImageUrl;
        job.SourceId = dto.SourceId;
        job.IsActive = true;
        job.ContentFingerprint = JobContentFingerprint.Compute(
            dto.Title, dto.CompanyId, dto.City, dto.SourceId, dto.ExternalUrl);
    }

    public static void ApplyUpdate(Job job, UpdateJobDto dto)
    {
        job.Title = dto.Title;
        job.Description = dto.Description;
        job.CompanyId = dto.CompanyId;
        job.Location = dto.Location;
        job.City = dto.City;
        job.Category = dto.Category;
        job.Level = dto.Level;
        job.IsRemote = dto.IsRemote;
        job.IsActive = dto.IsActive;
        job.SalaryMin = dto.SalaryMin;
        job.SalaryMax = dto.SalaryMax;
        job.ExpiresAt = dto.ExpiresAt;
        job.ExternalUrl = dto.ExternalUrl;
        job.JobImageUrl = dto.JobImageUrl;
        job.AiGeneratedImageUrl = dto.AiGeneratedImageUrl;
        job.SourceId = dto.SourceId;
        job.ContentFingerprint = JobContentFingerprint.Compute(
            dto.Title, dto.CompanyId, dto.City, dto.SourceId, dto.ExternalUrl);
    }
}

public static class ProfileMapper
{
    public static UserProfileDto ToDto(UserProfile profile) => new(
        profile.Id,
        profile.ExternalUserId,
        profile.UserId,
        profile.FirstName,
        profile.LastName,
        profile.Email,
        profile.Phone,
        profile.Bio,
        profile.Headline,
        HasResume(profile) ? "/api/profiles/me/resume" : null,
        profile.ResumeFileName,
        profile.ResumeFileSize,
        profile.ResumeUploadedAt,
        profile.Location,
        profile.ProfileImageUrl,
        profile.BannerUrl,
        profile.LinkedInUrl,
        profile.GitHubUrl,
        profile.WebsiteUrl,
        profile.DesiredSalaryMin,
        profile.DesiredSalaryMax,
        profile.PreferredLocations,
        profile.WorkArrangement.ToString(),
        profile.EmailNotifications,
        profile.PushNotifications,
        profile.JobAlerts,
        profile.ProfileVisibility.ToString(),
        profile.ContactVisibility.ToString(),
        ProfileCompletenessChecker.IsComplete(profile),
        ProfileCompletenessChecker.CalculatePercentage(profile),
        profile.Educations.Select(e => new EducationDto(
            e.Id, e.Institution, e.Degree, e.FieldOfStudy, e.StartDate, e.EndDate, e.IsCurrent)).ToList(),
        profile.Skills.Select(s => new SkillDto(s.Id, s.Name, s.Level)).ToList(),
        profile.Experiences.Select(e => new ExperienceDto(
            e.Id, e.Company, e.Title, e.Description, e.StartDate, e.EndDate, e.IsCurrent)).ToList(),
        profile.CreatedAt,
        profile.UpdatedAt);

    private static bool HasResume(UserProfile profile) =>
        !string.IsNullOrWhiteSpace(profile.ResumeUrl) || !string.IsNullOrWhiteSpace(profile.ResumeFileName);

    public static ApplicationDto ToDto(ApplicationEntity application, JobDto? job = null, Guid? conversationId = null)
    {
        var history = ApplicationStatusHistorySerializer.Deserialize(application.StatusHistoryJson)
            .Select(h => new ApplicationStatusHistoryDto(h.Status, h.ChangedAt))
            .ToList();

        return new ApplicationDto(
            application.Id,
            application.Status,
            application.AppliedAt,
            application.Notes,
            application.UserProfileId,
            application.JobId,
            job,
            application.ReapplicationCount,
            ApplicationWorkflow.ToApplicationNumber(application.ReapplicationCount),
            history,
            conversationId);
    }

    public static SavedJobDto ToDto(SavedJob savedJob, JobDto? job = null) => new(
        savedJob.Id,
        savedJob.SavedAt,
        savedJob.UserProfileId,
        savedJob.JobId,
        job);
}
