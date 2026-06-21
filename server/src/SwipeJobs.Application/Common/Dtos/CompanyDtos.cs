using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Common.Dtos;

public record CompanyDto(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    string Industry,
    string Location,
    string CompanySize,
    string? LogoUrl,
    string? BannerUrl,
    string? Website,
    string? LinkedInUrl,
    string? TwitterUrl,
    string? InstagramUrl,
    string? Culture,
    string? Benefits,
    string? HiringPhilosophy,
    CompanyStatus Status,
    bool IsActive,
    int OpenJobsCount,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record CreateCompanyDto(
    string Name,
    string Slug,
    string Description,
    string Industry,
    string Location,
    string CompanySize,
    string? LogoUrl,
    string? Website);

public record UpdateCompanyDto(
    string Name,
    string Slug,
    string Description,
    string Industry,
    string Location,
    string CompanySize,
    string? LogoUrl,
    string? BannerUrl,
    string? Website,
    string? LinkedInUrl,
    bool IsActive);
