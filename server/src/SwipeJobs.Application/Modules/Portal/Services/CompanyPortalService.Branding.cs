using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Mapping;

namespace SwipeJobs.Application.Modules.Portal.Services;

public partial class CompanyPortalService
{
    private static readonly HashSet<string> AllowedImageTypes =
        ["image/jpeg", "image/png", "image/webp", "image/gif"];

    private const int MaxLogoBytes = 512 * 1024;
    private const int MaxBannerBytes = 4 * 1024 * 1024;  // 4 MB — supports high-res sources from device

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

        // contentLength may be -1 when Content-Length header is absent — only validate when known
        if (contentLength > 0 && contentLength > maxBytes)
            throw new InvalidOperationException($"Image must be at most {maxBytes / 1024} KB.");

        // Read up to maxBytes + 1 so we can detect over-size files without loading the entire stream
        var buffer = new byte[maxBytes + 1];
        int totalRead = 0;

        int read;
        while ((read = await content.ReadAsync(buffer.AsMemory(totalRead, buffer.Length - totalRead), cancellationToken)) > 0)
        {
            totalRead += read;
            if (totalRead > maxBytes)
                throw new InvalidOperationException($"Image must be at most {maxBytes / 1024} KB.");
        }

        if (totalRead == 0)
            throw new InvalidOperationException("Uploaded file is empty.");

        var bytes = buffer[..totalRead];
        return $"data:{contentType};base64,{Convert.ToBase64String(bytes)}";
    }
}
