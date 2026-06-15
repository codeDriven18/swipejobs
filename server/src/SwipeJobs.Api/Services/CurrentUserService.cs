using System.Security.Claims;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Api.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId => ParseGuid(ClaimTypes.NameIdentifier)
        ?? ParseGuid(ClaimTypes.Name)
        ?? ParseGuid("sub");

    public Guid? ProfileId => ParseGuid("profileId");

    public Guid? CompanyId => ParseGuid("companyId");

    public UserRole? Role
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Role)
                ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("role");
            return Enum.TryParse<UserRole>(value, true, out var role) ? role : null;
        }
    }

    public bool IsAuthenticated => UserId.HasValue;

    public Guid GetRequiredUserId()
        => UserId ?? throw new UnauthorizedAccessException("Authentication required.");

    public Guid GetRequiredProfileId()
        => ProfileId ?? throw new UnauthorizedAccessException("Profile required. Complete your profile first.");

    public Guid GetRequiredCompanyId()
        => CompanyId ?? throw new UnauthorizedAccessException("Company account required.");

    public bool TryGetUserId(out Guid userId)
    {
        if (UserId.HasValue)
        {
            userId = UserId.Value;
            return true;
        }

        userId = Guid.Empty;
        return false;
    }

    public bool TryGetProfileId(out Guid profileId)
    {
        if (ProfileId.HasValue)
        {
            profileId = ProfileId.Value;
            return true;
        }

        profileId = Guid.Empty;
        return false;
    }

    public bool TryGetCompanyId(out Guid companyId)
    {
        if (CompanyId.HasValue)
        {
            companyId = CompanyId.Value;
            return true;
        }

        companyId = Guid.Empty;
        return false;
    }

    public void RequireRole(params UserRole[] roles)
    {
        if (Role is null || !roles.Contains(Role.Value))
            throw new UnauthorizedAccessException("Insufficient permissions.");
    }

    private Guid? ParseGuid(string claimType)
    {
        var value = _httpContextAccessor.HttpContext?.User?.FindFirstValue(claimType);
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
