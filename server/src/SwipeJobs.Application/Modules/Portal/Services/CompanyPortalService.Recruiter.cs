using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Mapping;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Portal.Services;

public partial class CompanyPortalService
{
    public async Task<IReadOnlyList<RecruiterTagDto>> GetRecruiterTagsAsync(
        Guid companyId, CancellationToken cancellationToken = default)
    {
        var tags = await _recruiterTagRepository.GetByCompanyIdAsync(companyId, cancellationToken);
        return tags.Select(t => new RecruiterTagDto(t.Id, t.Name)).ToList();
    }

    public async Task<RecruiterTagDto?> CreateRecruiterTagAsync(
        Guid companyId, PortalCreateRecruiterTagDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Tag name is required.");

        var existing = await _recruiterTagRepository.GetByNameForCompanyAsync(companyId, name, cancellationToken);
        if (existing is not null)
            throw new InvalidOperationException("A tag with this name already exists.");

        var tag = new RecruiterTag { CompanyId = companyId, Name = name };
        await _recruiterTagRepository.AddAsync(tag, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new RecruiterTagDto(tag.Id, tag.Name);
    }

    public async Task<RecruiterTagDto?> UpdateRecruiterTagAsync(
        Guid companyId, Guid tagId, PortalUpdateRecruiterTagDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Tag name is required.");

        var tag = await _recruiterTagRepository.GetByIdForCompanyAsync(tagId, companyId, cancellationToken);
        if (tag is null) return null;

        var duplicate = await _recruiterTagRepository.GetByNameForCompanyAsync(companyId, name, cancellationToken);
        if (duplicate is not null && duplicate.Id != tagId)
            throw new InvalidOperationException("A tag with this name already exists.");

        tag.Name = name;
        await _recruiterTagRepository.UpdateAsync(tag, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new RecruiterTagDto(tag.Id, tag.Name);
    }

    public async Task<bool> DeleteRecruiterTagAsync(
        Guid companyId, Guid tagId, CancellationToken cancellationToken = default)
    {
        var tag = await _recruiterTagRepository.GetByIdForCompanyAsync(tagId, companyId, cancellationToken);
        if (tag is null) return false;

        await _recruiterTagRepository.DeleteAsync(tag, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<PortalRecruiterNoteDto?> AddRecruiterNoteAsync(
        Guid companyId, Guid applicationId, PortalAddRecruiterNoteDto dto, CancellationToken cancellationToken = default)
    {
        var application = await EnsureApplicationForCompanyAsync(companyId, applicationId, cancellationToken);
        if (application is null) return null;

        var text = dto.Text.Trim();
        if (string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException("Note text is required.");

        var userId = _currentUser.GetRequiredUserId();
        var note = new ApplicationRecruiterNote
        {
            ApplicationId = applicationId,
            AuthorUserId = userId,
            Text = text,
        };

        await _recruiterNoteRepository.AddAsync(note, cancellationToken);
        application.ActivityLogJson = ApplicationActivityLogSerializer.Append(
            application.ActivityLogJson,
            RecruiterActivityType.NoteAdded,
            DateTime.UtcNow,
            userId,
            text.Length > 120 ? text[..120] + "…" : text);
        await _applicationRepository.UpdateAsync(application, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new PortalRecruiterNoteDto(note.Id, note.Text, note.AuthorUserId, note.CreatedAt);
    }

    public async Task<bool> DeleteRecruiterNoteAsync(
        Guid companyId, Guid applicationId, Guid noteId, CancellationToken cancellationToken = default)
    {
        if (await EnsureApplicationForCompanyAsync(companyId, applicationId, cancellationToken) is null)
            return false;

        var note = await _recruiterNoteRepository.GetByIdForApplicationAsync(noteId, applicationId, cancellationToken);
        if (note is null) return false;

        await _recruiterNoteRepository.DeleteAsync(note, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<PortalApplicationDto?> SetRecruiterRatingAsync(
        Guid companyId, Guid applicationId, PortalSetRecruiterRatingDto dto, CancellationToken cancellationToken = default)
    {
        var application = await EnsureApplicationForCompanyAsync(companyId, applicationId, cancellationToken);
        if (application is null) return null;

        if (dto.Rating.HasValue && (dto.Rating < 1 || dto.Rating > 5))
            throw new InvalidOperationException("Rating must be between 1 and 5.");

        var previous = application.RecruiterRating;
        application.RecruiterRating = dto.Rating;

        if (previous != dto.Rating)
        {
            application.ActivityLogJson = ApplicationActivityLogSerializer.Append(
                application.ActivityLogJson,
                RecruiterActivityType.RatingChanged,
                DateTime.UtcNow,
                _currentUser.GetRequiredUserId(),
                dto.Rating.HasValue ? $"{dto.Rating} stars" : "Unrated");
        }

        await _applicationRepository.UpdateAsync(application, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await RefreshApplicationDtoAsync(companyId, applicationId, cancellationToken);
    }

    public async Task<PortalApplicationDto?> SetFavoriteAsync(
        Guid companyId, Guid applicationId, PortalSetFavoriteDto dto, CancellationToken cancellationToken = default)
    {
        var application = await EnsureApplicationForCompanyAsync(companyId, applicationId, cancellationToken);
        if (application is null) return null;

        if (application.IsFavorite == dto.IsFavorite)
            return await RefreshApplicationDtoAsync(companyId, applicationId, cancellationToken);

        application.IsFavorite = dto.IsFavorite;
        application.ActivityLogJson = ApplicationActivityLogSerializer.Append(
            application.ActivityLogJson,
            dto.IsFavorite ? RecruiterActivityType.FavoriteAdded : RecruiterActivityType.FavoriteRemoved,
            DateTime.UtcNow,
            _currentUser.GetRequiredUserId());

        await _applicationRepository.UpdateAsync(application, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await RefreshApplicationDtoAsync(companyId, applicationId, cancellationToken);
    }

    public async Task<PortalApplicationDto?> SetApplicationTagsAsync(
        Guid companyId, Guid applicationId, PortalSetApplicationTagsDto dto, CancellationToken cancellationToken = default)
    {
        var application = await _applicationRepository.GetByIdWithRecruiterDataAsync(applicationId, cancellationToken);
        if (application?.Job is null || application.Job.CompanyId != companyId)
            return null;

        var desiredIds = dto.TagIds.Distinct().ToHashSet();
        var companyTags = await _recruiterTagRepository.GetByCompanyIdAsync(companyId, cancellationToken);
        var validTagIds = companyTags.Where(t => desiredIds.Contains(t.Id)).Select(t => t.Id).ToHashSet();

        if (validTagIds.Count != desiredIds.Count)
            throw new InvalidOperationException("One or more tags are invalid for this company.");

        var userId = _currentUser.GetRequiredUserId();
        var now = DateTime.UtcNow;
        var currentIds = application.RecruiterTags.Select(t => t.TagId).ToHashSet();

        foreach (var removed in currentIds.Except(validTagIds))
        {
            var link = application.RecruiterTags.First(t => t.TagId == removed);
            application.RecruiterTags.Remove(link);
            var tagName = companyTags.First(t => t.Id == removed).Name;
            application.ActivityLogJson = ApplicationActivityLogSerializer.Append(
                application.ActivityLogJson, RecruiterActivityType.TagRemoved, now, userId, tagName);
        }

        foreach (var added in validTagIds.Except(currentIds))
        {
            application.RecruiterTags.Add(new ApplicationRecruiterTag
            {
                ApplicationId = applicationId,
                TagId = added,
            });
            var tagName = companyTags.First(t => t.Id == added).Name;
            application.ActivityLogJson = ApplicationActivityLogSerializer.Append(
                application.ActivityLogJson, RecruiterActivityType.TagAdded, now, userId, tagName);
        }

        await _applicationRepository.UpdateAsync(application, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await RefreshApplicationDtoAsync(companyId, applicationId, cancellationToken);
    }

    private async Task<Domain.Entities.Application?> EnsureApplicationForCompanyAsync(
        Guid companyId, Guid applicationId, CancellationToken cancellationToken)
    {
        var application = await _applicationRepository.GetByIdAsync(applicationId, cancellationToken);
        if (application is null) return null;

        var job = await _jobRepository.GetByIdAsync(application.JobId, cancellationToken);
        if (job is null || job.CompanyId != companyId) return null;

        return application;
    }

    private async Task<PortalApplicationDto?> RefreshApplicationDtoAsync(
        Guid companyId, Guid applicationId, CancellationToken cancellationToken)
    {
        var refreshed = await _applicationRepository.GetByIdForCompanyAsync(applicationId, companyId, cancellationToken);
        return refreshed is null ? null : PortalApplicationMapper.ToDto(refreshed);
    }
}
