using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Mapping;

namespace SwipeJobs.Application.Modules.Portal.Services;

public partial class CompanyPortalService
{
    private static readonly HashSet<string> AllowedImageTypes =
        ["image/jpeg", "image/png", "image/webp", "image/gif"];

    private const int MaxLogoBytes = 512 * 1024;
    private const int MaxBannerBytes = 2 * 1024 * 1024;

    public async Task<CompanyDto?> UploadCompanyLogoAsync(
        Guid companyId,
        Stream content,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company is null) return null;

        company.LogoUrl = await ReadImageDataUrlAsync(content, contentType, contentLength, MaxLogoBytes, cancellationToken);
        await _companyRepository.UpdateAsync(company, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var openJobs = await _companyRepository.CountOpenJobsAsync(companyId, cancellationToken);
        return CompanyMapper.ToDto(company, openJobs);
    }

    public async Task<CompanyDto?> UploadCompanyBannerAsync(
        Guid companyId,
        Stream content,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken = default)
    {
        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company is null) return null;

        company.BannerUrl = await ReadImageDataUrlAsync(content, contentType, contentLength, MaxBannerBytes, cancellationToken);
        await _companyRepository.UpdateAsync(company, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var openJobs = await _companyRepository.CountOpenJobsAsync(companyId, cancellationToken);
        return CompanyMapper.ToDto(company, openJobs);
    }

    private static async Task<string> ReadImageDataUrlAsync(
        Stream content,
        string contentType,
        long contentLength,
        int maxBytes,
        CancellationToken cancellationToken)
    {
        if (!AllowedImageTypes.Contains(contentType))
            throw new InvalidOperationException("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");

        if (contentLength <= 0 || contentLength > maxBytes)
            throw new InvalidOperationException($"Image must be between 1 byte and {maxBytes / 1024} KB.");

        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();
        if (bytes.Length > maxBytes)
            throw new InvalidOperationException($"Image must be at most {maxBytes / 1024} KB.");

        return $"data:{contentType};base64,{Convert.ToBase64String(bytes)}";
    }
}
