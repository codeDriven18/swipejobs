using SwipeJobs.Application.Common.Dtos;

namespace SwipeJobs.Application.Modules.Profiles.Interfaces;

public interface IUserProfileService
{
    Task<UserProfileDto?> GetByExternalUserIdAsync(string externalUserId, CancellationToken cancellationToken = default);
    Task<UserProfileDto?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<UserProfileDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<UserProfileDto> CreateAsync(CreateUserProfileDto dto, CancellationToken cancellationToken = default);
    Task<UserProfileDto?> UpdateForCurrentUserAsync(Guid userId, UpdateUserProfileDto dto, CancellationToken cancellationToken = default);
    Task<UserProfileDto?> UpdateAsync(Guid id, UpdateUserProfileDto dto, CancellationToken cancellationToken = default);
    Task<UserProfileDto?> UploadAvatarAsync(
        Guid userId,
        Stream content,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default);
    Task<UserProfileDto?> RemoveAvatarAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<UserProfileDto?> UploadResumeAsync(
        Guid userId,
        Stream content,
        string fileName,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default);
    Task<UserProfileDto?> RemoveResumeAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProfileCompletenessDto> CheckCompletenessAsync(Guid id, CancellationToken cancellationToken = default);
}
