using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    Guid? ProfileId { get; }
    Guid? CompanyId { get; }
    UserRole? Role { get; }
    bool IsAuthenticated { get; }
    Guid GetRequiredUserId();
    Guid GetRequiredProfileId();
    Guid GetRequiredCompanyId();
    bool TryGetUserId(out Guid userId);
    bool TryGetProfileId(out Guid profileId);
    bool TryGetCompanyId(out Guid companyId);
    void RequireRole(params UserRole[] roles);
}
