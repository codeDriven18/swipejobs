using Microsoft.EntityFrameworkCore;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Domain.Enums;
using ApplicationEntity = SwipeJobs.Domain.Entities.Application;

namespace SwipeJobs.Infrastructure.Persistence.Repositories;

public class ApplicationRepository : Repository<ApplicationEntity>, IApplicationRepository
{
    public ApplicationRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<ApplicationEntity>> GetByUserProfileIdAsync(Guid userProfileId, CancellationToken cancellationToken = default)
        => await DbSet
            .AsNoTracking()
            .Include(a => a.Job)
                .ThenInclude(j => j!.Company)
            .Where(a => a.UserProfileId == userProfileId)
            .OrderByDescending(a => a.AppliedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ApplicationEntity>> GetByUserProfileAndJobIdAsync(
        Guid userProfileId, Guid jobId, CancellationToken cancellationToken = default)
        => await DbSet
            .AsNoTracking()
            .Include(a => a.Job)
                .ThenInclude(j => j!.Company)
            .Where(a => a.UserProfileId == userProfileId && a.JobId == jobId)
            .OrderByDescending(a => a.AppliedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ApplicationEntity>> GetByCompanyIdAsync(
        Guid companyId, Guid? jobId, CancellationToken cancellationToken = default)
    {
        var q = DbSet
            .AsNoTracking()
            .Include(a => a.Job)
            .Include(a => a.UserProfile)
            .Where(a => a.Job!.CompanyId == companyId);

        if (jobId.HasValue)
            q = q.Where(a => a.JobId == jobId.Value);

        return await q.OrderByDescending(a => a.AppliedAt).ToListAsync(cancellationToken);
    }

    public async Task<ApplicationEntity?> GetByIdForCompanyAsync(
        Guid applicationId, Guid companyId, CancellationToken cancellationToken = default)
        => await DbSet
            .AsNoTracking()
            .Include(a => a.Job)
            .Include(a => a.UserProfile)
                .ThenInclude(p => p!.Educations)
            .Include(a => a.UserProfile)
                .ThenInclude(p => p!.Skills)
            .Include(a => a.UserProfile)
                .ThenInclude(p => p!.Experiences)
            .FirstOrDefaultAsync(
                a => a.Id == applicationId && a.Job!.CompanyId == companyId,
                cancellationToken);

    public Task<int> CountAsync(CancellationToken cancellationToken = default)
        => DbSet.CountAsync(cancellationToken);

    public Task<int> CountByStatusAsync(ApplicationStatus status, CancellationToken cancellationToken = default)
        => DbSet.CountAsync(a => a.Status == status, cancellationToken);

    public async Task<IReadOnlyList<ApplicationEntity>> GetAllWithDetailsAsync(CancellationToken cancellationToken = default)
        => await DbSet
            .AsNoTracking()
            .Include(a => a.Job)
                .ThenInclude(j => j!.Company)
            .Include(a => a.UserProfile)
            .OrderByDescending(a => a.AppliedAt)
            .ToListAsync(cancellationToken);
}
