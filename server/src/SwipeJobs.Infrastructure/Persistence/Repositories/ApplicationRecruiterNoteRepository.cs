using Microsoft.EntityFrameworkCore;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Domain.Entities;

namespace SwipeJobs.Infrastructure.Persistence.Repositories;

public class ApplicationRecruiterNoteRepository : Repository<ApplicationRecruiterNote>, IApplicationRecruiterNoteRepository
{
    public ApplicationRecruiterNoteRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<ApplicationRecruiterNote>> GetByApplicationIdAsync(
        Guid applicationId, CancellationToken cancellationToken = default)
        => await DbSet
            .AsNoTracking()
            .Where(n => n.ApplicationId == applicationId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<ApplicationRecruiterNote?> GetByIdForApplicationAsync(
        Guid noteId, Guid applicationId, CancellationToken cancellationToken = default)
        => await DbSet.FirstOrDefaultAsync(n => n.Id == noteId && n.ApplicationId == applicationId, cancellationToken);
}
