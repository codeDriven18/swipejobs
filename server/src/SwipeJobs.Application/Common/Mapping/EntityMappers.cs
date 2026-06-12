using SwipeJobs.Application.Common.Dtos;
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
        new(source.Id, source.Name, source.Type, source.ExternalIdentifier, source.IsActive);
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
    public static JobDto ToDto(Job job) => new(
        job.Id,
        job.Title,
        job.Description,
        job.CompanyId,
        job.Company?.Name ?? string.Empty,
        job.Company?.Slug,
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
        job.SourceId,
        job.Source?.Name,
        job.JobTags?.Select(jt => TagMapper.ToDto(jt.Tag)).ToList() ?? [],
        [],
        job.CreatedAt,
        job.UpdatedAt);

    public static JobDto ToDto(Job job, IReadOnlyList<string>? trendingBadges) => new(
        job.Id,
        job.Title,
        job.Description,
        job.CompanyId,
        job.Company?.Name ?? string.Empty,
        job.Company?.Slug,
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
        job.SourceId,
        job.Source?.Name,
        job.JobTags?.Select(jt => TagMapper.ToDto(jt.Tag)).ToList() ?? [],
        trendingBadges ?? [],
        job.CreatedAt,
        job.UpdatedAt);

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
        job.SourceId = dto.SourceId;
        job.IsActive = true;
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
        job.SourceId = dto.SourceId;
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

    public static ApplicationDto ToDto(ApplicationEntity application, JobDto? job = null) => new(
        application.Id,
        application.Status,
        application.AppliedAt,
        application.Notes,
        application.UserProfileId,
        application.JobId,
        job);

    public static SavedJobDto ToDto(SavedJob savedJob, JobDto? job = null) => new(
        savedJob.Id,
        savedJob.SavedAt,
        savedJob.UserProfileId,
        savedJob.JobId,
        job);
}
