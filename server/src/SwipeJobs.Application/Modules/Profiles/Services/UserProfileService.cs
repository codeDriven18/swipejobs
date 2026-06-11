using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Common.Mapping;
using SwipeJobs.Application.Modules.Profiles.Interfaces;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Application.Modules.Profiles.Services;

public class UserProfileService : IUserProfileService
{
    private const int MaxAvatarBytes = 256 * 1024;
    private static readonly HashSet<string> AllowedAvatarTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    };

    private readonly IUserProfileRepository _profileRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UserProfileService> _logger;

    public UserProfileService(
        IUserProfileRepository profileRepository,
        IUnitOfWork unitOfWork,
        ILogger<UserProfileService> logger)
    {
        _profileRepository = profileRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<UserProfileDto?> GetByExternalUserIdAsync(string externalUserId, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByExternalUserIdAsync(externalUserId, cancellationToken);
        return profile is null ? null : ProfileMapper.ToDto(profile);
    }

    public async Task<UserProfileDto?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByUserIdAsync(userId, cancellationToken);
        return profile is null ? null : ProfileMapper.ToDto(profile);
    }

    public async Task<UserProfileDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByIdWithDetailsAsync(id, cancellationToken);
        return profile is null ? null : ProfileMapper.ToDto(profile);
    }

    public async Task<UserProfileDto> CreateAsync(CreateUserProfileDto dto, CancellationToken cancellationToken = default)
    {
        var existing = dto.ExternalUserId is not null
            ? await _profileRepository.GetByExternalUserIdAsync(dto.ExternalUserId, cancellationToken)
            : null;
        if (existing is not null)
            throw new InvalidOperationException("Profile already exists for this user.");

        var profile = new UserProfile
        {
            ExternalUserId = dto.ExternalUserId,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            Bio = dto.Bio,
            Headline = dto.Headline,
            ResumeUrl = dto.ResumeUrl,
            Location = dto.Location,
            ProfileImageUrl = dto.ProfileImageUrl,
            LinkedInUrl = dto.LinkedInUrl,
            GitHubUrl = dto.GitHubUrl,
            WebsiteUrl = dto.WebsiteUrl,
            DesiredSalaryMin = dto.DesiredSalaryMin,
            DesiredSalaryMax = dto.DesiredSalaryMax,
            PreferredLocations = dto.PreferredLocations,
            WorkArrangement = ProfileFieldParser.ParseWorkArrangement(dto.WorkArrangement),
            EmailNotifications = dto.EmailNotifications ?? true,
            PushNotifications = dto.PushNotifications ?? true,
            JobAlerts = dto.JobAlerts ?? true,
            ProfileVisibility = ProfileFieldParser.ParseVisibility(dto.ProfileVisibility, Domain.Enums.ProfileVisibility.EmployersOnly),
            ContactVisibility = ProfileFieldParser.ParseVisibility(dto.ContactVisibility, Domain.Enums.ProfileVisibility.EmployersOnly),
        };

        ApplyCollections(profile, dto.Educations, dto.Skills, dto.Experiences);
        ProfileCompletenessChecker.UpdateFlag(profile, dto.Educations?.Count, dto.Skills?.Count, dto.Experiences?.Count);

        await _profileRepository.AddAsync(profile, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var created = await _profileRepository.GetByIdWithDetailsAsync(profile.Id, cancellationToken);
        return ProfileMapper.ToDto(created!);
    }

    public async Task<UserProfileDto?> UpdateForCurrentUserAsync(
        Guid userId,
        UpdateUserProfileDto dto,
        CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByUserIdForUpdateAsync(userId, cancellationToken);
        if (profile is null)
        {
            _logger.LogWarning("Profile update skipped: no profile for userId={UserId}", userId);
            return null;
        }

        return await ApplyUpdateAsync(profile, dto, cancellationToken);
    }

    public async Task<UserProfileDto?> UpdateAsync(Guid id, UpdateUserProfileDto dto, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByIdForUpdateAsync(id, cancellationToken);
        if (profile is null) return null;

        return await ApplyUpdateAsync(profile, dto, cancellationToken);
    }

    public async Task<UserProfileDto?> UploadAvatarAsync(
        Guid userId,
        Stream content,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default)
    {
        if (!AllowedAvatarTypes.Contains(contentType))
            throw new InvalidOperationException("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");

        if (contentLength <= 0 || contentLength > MaxAvatarBytes)
            throw new InvalidOperationException($"Image must be between 1 byte and {MaxAvatarBytes / 1024} KB.");

        var profile = await _profileRepository.GetByUserIdForUpdateAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("Profile not found.");

        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();
        if (bytes.Length > MaxAvatarBytes)
            throw new InvalidOperationException($"Image must be at most {MaxAvatarBytes / 1024} KB.");

        var base64 = Convert.ToBase64String(bytes);
        profile.ProfileImageUrl = $"data:{contentType};base64,{base64}";
        profile.UpdatedAt = DateTime.UtcNow;

        _logger.LogInformation(
            "Profile avatar uploaded userId={UserId} profileId={ProfileId} bytes={Bytes} contentType={ContentType}",
            userId,
            profile.Id,
            bytes.Length,
            contentType);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var updated = await _profileRepository.GetByIdWithDetailsAsync(profile.Id, cancellationToken);
        return ProfileMapper.ToDto(updated!);
    }

    public async Task<UserProfileDto?> RemoveAvatarAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByUserIdForUpdateAsync(userId, cancellationToken);
        if (profile is null) return null;

        profile.ProfileImageUrl = null;
        profile.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var updated = await _profileRepository.GetByIdWithDetailsAsync(profile.Id, cancellationToken);
        return ProfileMapper.ToDto(updated!);
    }

    public async Task<UserProfileDto?> UploadResumeAsync(
        Guid userId,
        Stream content,
        string fileName,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default)
    {
        const int maxResumeBytes = 512 * 1024;
        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };

        if (!allowed.Contains(contentType))
            throw new InvalidOperationException("Unsupported file type. Upload PDF or Word document.");

        if (contentLength <= 0 || contentLength > maxResumeBytes)
            throw new InvalidOperationException($"Resume must be between 1 byte and {maxResumeBytes / 1024} KB.");

        var profile = await _profileRepository.GetByUserIdForUpdateAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("Profile not found.");

        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();
        if (bytes.Length > maxResumeBytes)
            throw new InvalidOperationException($"Resume must be at most {maxResumeBytes / 1024} KB.");

        var safeName = Path.GetFileName(fileName);
        profile.ResumeFileName = safeName;
        profile.ResumeUploadedAt = DateTime.UtcNow;
        profile.ResumeUrl = $"data:{contentType};base64,{Convert.ToBase64String(bytes)}";
        profile.UpdatedAt = DateTime.UtcNow;

        _logger.LogInformation(
            "Resume uploaded userId={UserId} profileId={ProfileId} file={FileName} bytes={Bytes}",
            userId, profile.Id, safeName, bytes.Length);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var updated = await _profileRepository.GetByIdWithDetailsAsync(profile.Id, cancellationToken);
        return ProfileMapper.ToDto(updated!);
    }

    public async Task<UserProfileDto?> RemoveResumeAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByUserIdForUpdateAsync(userId, cancellationToken);
        if (profile is null) return null;

        profile.ResumeUrl = null;
        profile.ResumeFileName = null;
        profile.ResumeUploadedAt = null;
        profile.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var updated = await _profileRepository.GetByIdWithDetailsAsync(profile.Id, cancellationToken);
        return ProfileMapper.ToDto(updated!);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByIdAsync(id, cancellationToken);
        if (profile is null) return false;

        await _profileRepository.DeleteAsync(profile, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ProfileCompletenessDto> CheckCompletenessAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new KeyNotFoundException("Profile not found.");
        return ProfileCompletenessChecker.Check(profile);
    }

    private async Task<UserProfileDto> ApplyUpdateAsync(
        UserProfile profile,
        UpdateUserProfileDto dto,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Applying profile update profileId={ProfileId} userId={UserId} firstName={FirstName} lastName={LastName} educations={EducationCount} skills={SkillCount} experiences={ExperienceCount}",
            profile.Id,
            profile.UserId,
            dto.FirstName,
            dto.LastName,
            dto.Educations?.Count ?? -1,
            dto.Skills?.Count ?? -1,
            dto.Experiences?.Count ?? -1);

        profile.FirstName = dto.FirstName.Trim();
        profile.LastName = dto.LastName.Trim();
        profile.Email = dto.Email.Trim();
        profile.Phone = NormalizeOptional(dto.Phone);
        profile.Bio = NormalizeOptional(dto.Bio);
        profile.Headline = NormalizeOptional(dto.Headline);
        profile.ResumeUrl = NormalizeOptional(dto.ResumeUrl);
        profile.Location = NormalizeOptional(dto.Location);
        profile.LinkedInUrl = NormalizeOptional(dto.LinkedInUrl);
        profile.GitHubUrl = NormalizeOptional(dto.GitHubUrl);
        profile.WebsiteUrl = NormalizeOptional(dto.WebsiteUrl);
        profile.DesiredSalaryMin = dto.DesiredSalaryMin;
        profile.DesiredSalaryMax = dto.DesiredSalaryMax;
        profile.PreferredLocations = NormalizeOptional(dto.PreferredLocations);

        if (dto.WorkArrangement is not null)
            profile.WorkArrangement = ProfileFieldParser.ParseWorkArrangement(dto.WorkArrangement);

        if (dto.EmailNotifications.HasValue)
            profile.EmailNotifications = dto.EmailNotifications.Value;
        if (dto.PushNotifications.HasValue)
            profile.PushNotifications = dto.PushNotifications.Value;
        if (dto.JobAlerts.HasValue)
            profile.JobAlerts = dto.JobAlerts.Value;

        if (dto.ProfileVisibility is not null)
            profile.ProfileVisibility = ProfileFieldParser.ParseVisibility(dto.ProfileVisibility, profile.ProfileVisibility);
        if (dto.ContactVisibility is not null)
            profile.ContactVisibility = ProfileFieldParser.ParseVisibility(dto.ContactVisibility, profile.ContactVisibility);

        if (dto.Educations is not null)
        {
            await _profileRepository.ReplaceEducationsAsync(
                profile.Id,
                BuildEducations(dto.Educations, profile.Id),
                cancellationToken);
        }

        if (dto.Skills is not null)
        {
            await _profileRepository.ReplaceSkillsAsync(
                profile.Id,
                BuildSkills(dto.Skills, profile.Id),
                cancellationToken);
        }

        if (dto.Experiences is not null)
        {
            await _profileRepository.ReplaceExperiencesAsync(
                profile.Id,
                BuildExperiences(dto.Experiences, profile.Id),
                cancellationToken);
        }

        ProfileCompletenessChecker.UpdateFlag(
            profile,
            dto.Educations?.Count,
            dto.Skills?.Count,
            dto.Experiences?.Count);

        profile.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Profile update failed profileId={ProfileId} userId={UserId}",
                profile.Id,
                profile.UserId);
            throw;
        }

        var updated = await _profileRepository.GetByIdWithDetailsAsync(profile.Id, cancellationToken);
        _logger.LogInformation(
            "Profile update succeeded profileId={ProfileId} userId={UserId} isComplete={IsComplete}",
            profile.Id,
            profile.UserId,
            updated?.IsProfileComplete);

        return ProfileMapper.ToDto(updated!);
    }

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static List<Education> BuildEducations(IReadOnlyList<CreateEducationDto> educations, Guid profileId)
        => educations.Select(e => new Education
        {
            UserProfileId = profileId,
            Institution = e.Institution.Trim(),
            Degree = e.Degree.Trim(),
            FieldOfStudy = NormalizeOptional(e.FieldOfStudy),
            StartDate = e.StartDate,
            EndDate = e.EndDate,
            IsCurrent = e.IsCurrent,
        }).ToList();

    private static List<Skill> BuildSkills(IReadOnlyList<CreateSkillDto> skills, Guid profileId)
        => skills.Select(s => new Skill
        {
            UserProfileId = profileId,
            Name = s.Name.Trim(),
            Level = NormalizeOptional(s.Level),
        }).ToList();

    private static List<Experience> BuildExperiences(IReadOnlyList<CreateExperienceDto> experiences, Guid profileId)
        => experiences.Select(e => new Experience
        {
            UserProfileId = profileId,
            Company = e.Company.Trim(),
            Title = e.Title.Trim(),
            Description = NormalizeOptional(e.Description),
            StartDate = e.StartDate,
            EndDate = e.EndDate,
            IsCurrent = e.IsCurrent,
        }).ToList();

    private static void ApplyCollections(
        UserProfile profile,
        IReadOnlyList<CreateEducationDto>? educations,
        IReadOnlyList<CreateSkillDto>? skills,
        IReadOnlyList<CreateExperienceDto>? experiences)
    {
        if (educations is not null)
        {
            foreach (var e in educations)
            {
                profile.Educations.Add(new Education
                {
                    UserProfileId = profile.Id,
                    Institution = e.Institution,
                    Degree = e.Degree,
                    FieldOfStudy = e.FieldOfStudy,
                    StartDate = e.StartDate,
                    EndDate = e.EndDate,
                    IsCurrent = e.IsCurrent,
                });
            }
        }

        if (skills is not null)
        {
            foreach (var s in skills)
            {
                profile.Skills.Add(new Skill
                {
                    UserProfileId = profile.Id,
                    Name = s.Name,
                    Level = s.Level,
                });
            }
        }

        if (experiences is not null)
        {
            foreach (var e in experiences)
            {
                profile.Experiences.Add(new Experience
                {
                    UserProfileId = profile.Id,
                    Company = e.Company,
                    Title = e.Title,
                    Description = e.Description,
                    StartDate = e.StartDate,
                    EndDate = e.EndDate,
                    IsCurrent = e.IsCurrent,
                });
            }
        }
    }
}
