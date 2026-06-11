using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Common.Mapping;
using SwipeJobs.Application.Modules.Companies.Interfaces;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Companies.Services;

public class CompanyService : ICompanyService
{
    private readonly ICompanyRepository _companyRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CompanyService(ICompanyRepository companyRepository, IUnitOfWork unitOfWork)
    {
        _companyRepository = companyRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<CompanyDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var companies = await _companyRepository.GetAllActiveAsync(cancellationToken);
        var result = new List<CompanyDto>();
        foreach (var company in companies)
        {
            var count = await _companyRepository.CountOpenJobsAsync(company.Id, cancellationToken);
            result.Add(CompanyMapper.ToDto(company, count));
        }
        return result;
    }

    public async Task<CompanyDto?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var company = await _companyRepository.GetBySlugAsync(slug, cancellationToken);
        if (company is null) return null;
        var count = await _companyRepository.CountOpenJobsAsync(company.Id, cancellationToken);
        return CompanyMapper.ToDto(company, count);
    }

    public async Task<CompanyDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var company = await _companyRepository.GetByIdAsync(id, cancellationToken);
        if (company is null) return null;
        var count = await _companyRepository.CountOpenJobsAsync(company.Id, cancellationToken);
        return CompanyMapper.ToDto(company, count);
    }

    public async Task<CompanyDto> CreateAsync(CreateCompanyDto dto, CancellationToken cancellationToken = default)
    {
        var company = new Company
        {
            Name = dto.Name,
            Slug = dto.Slug,
            Description = dto.Description,
            Industry = dto.Industry,
            Location = dto.Location,
            CompanySize = dto.CompanySize,
            LogoUrl = dto.LogoUrl,
            Website = dto.Website,
            Status = CompanyStatus.Approved,
            IsActive = true,
        };
        await _companyRepository.AddAsync(company, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return CompanyMapper.ToDto(company, 0);
    }

    public async Task<CompanyDto?> UpdateAsync(Guid id, UpdateCompanyDto dto, CancellationToken cancellationToken = default)
    {
        var company = await _companyRepository.GetByIdAsync(id, cancellationToken);
        if (company is null) return null;

        company.Name = dto.Name;
        company.Slug = dto.Slug;
        company.Description = dto.Description;
        company.Industry = dto.Industry;
        company.Location = dto.Location;
        company.CompanySize = dto.CompanySize;
        company.LogoUrl = dto.LogoUrl;
        company.Website = dto.Website;
        company.IsActive = dto.IsActive;
        company.BannerUrl = dto.BannerUrl;
        company.LinkedInUrl = dto.LinkedInUrl;

        await _companyRepository.UpdateAsync(company, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var count = await _companyRepository.CountOpenJobsAsync(company.Id, cancellationToken);
        return CompanyMapper.ToDto(company, count);
    }
}
