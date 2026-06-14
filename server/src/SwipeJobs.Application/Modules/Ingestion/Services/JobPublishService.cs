using System.Text.Json;
using System.Text.RegularExpressions;
using SwipeJobs.Application.Common;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Common.Mapping;
using SwipeJobs.Application.Modules.Ingestion;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

public interface IJobPublishService
{
    Task<JobDto?> PublishCandidateAsync(Guid candidateId, Guid publisherUserId, CancellationToken cancellationToken = default);
}

public class JobPublishService : IJobPublishService
{
    private readonly IJobCandidateRepository _candidateRepository;
    private readonly IJobRepository _jobRepository;
    private readonly ICompanyRepository _companyRepository;
    private readonly ISourceRepository _sourceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public JobPublishService(
        IJobCandidateRepository candidateRepository,
        IJobRepository jobRepository,
        ICompanyRepository companyRepository,
        ISourceRepository sourceRepository,
        IUnitOfWork unitOfWork)
    {
        _candidateRepository = candidateRepository;
        _jobRepository = jobRepository;
        _companyRepository = companyRepository;
        _sourceRepository = sourceRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<JobDto?> PublishCandidateAsync(
        Guid candidateId,
        Guid publisherUserId,
        CancellationToken cancellationToken = default)
    {
        var candidate = await _candidateRepository.GetByIdWithDetailsAsync(candidateId, cancellationToken)
            ?? throw new ModerationException(ModerationErrorCodes.CandidateNotFound, "Candidate not found.");

        var companyName = candidate.CompanyName?.Trim();
        if (string.IsNullOrWhiteSpace(companyName))
        {
            var sourceMeta = await _sourceRepository.GetByIdAsync(candidate.SourceId, cancellationToken);
            companyName = sourceMeta?.ChannelName ?? sourceMeta?.Name;
        }

        if (string.IsNullOrWhiteSpace(candidate.Title))
            throw new ModerationException(
                ModerationErrorCodes.ApproveMissingTitle,
                "Job title is required to publish.");

        if (string.IsNullOrWhiteSpace(companyName))
            throw new ModerationException(
                ModerationErrorCodes.ApproveMissingCompany,
                "Company name is required to publish.");

        if (candidate.PublishedJobId.HasValue)
        {
            var existing = await _jobRepository.GetByIdWithDetailsAsync(candidate.PublishedJobId.Value, cancellationToken);
            return existing is null ? null : JobMapper.ToDto(existing);
        }

        var source = await _sourceRepository.GetByIdAsync(candidate.SourceId, cancellationToken)
            ?? throw new InvalidOperationException("Source not found.");

        var company = await ResolveCompanyAsync(companyName!, cancellationToken);
        var primaryMessage = candidate.MessageLinks.FirstOrDefault(l => l.IsPrimary)?.IngestionMessage
            ?? candidate.MessageLinks.FirstOrDefault()?.IngestionMessage;

        var externalKey = primaryMessage?.ExternalSourceKey;
        var fingerprint = JobContentFingerprint.Compute(
            candidate.Title!,
            company.Id,
            candidate.City,
            candidate.SourceId,
            candidate.ApplyUrl);

        var now = DateTime.UtcNow;
        var expiresAt = now.AddDays(Math.Clamp(source.DefaultExpirationDays, 7, 90));

        var job = new Job
        {
            Title = candidate.Title!.Trim(),
            Description = candidate.Description?.Trim() ?? candidate.Title!,
            CompanyId = company.Id,
            Location = candidate.Location,
            City = candidate.City,
            Category = candidate.Category,
            Level = candidate.Level,
            IsRemote = candidate.IsRemote,
            SalaryMin = candidate.SalaryMin,
            SalaryMax = candidate.SalaryMax,
            ExternalUrl = candidate.ApplyUrl,
            ExternalSourceKey = externalKey,
            ContentFingerprint = fingerprint,
            SourceId = candidate.SourceId,
            IsActive = true,
            IsArchived = false,
            LifecycleStatus = JobLifecycleStatus.Published,
            PostedAt = primaryMessage?.PostedAt ?? now,
            ExpiresAt = expiresAt,
            CandidateJobId = candidate.Id,
            ApprovedByUserId = candidate.ApprovedByUserId ?? publisherUserId,
            PublishedByUserId = publisherUserId,
            ApprovedAt = candidate.ApprovedAt ?? now,
            PublishedAt = now,
        };

        await _jobRepository.AddAsync(job, cancellationToken);

        candidate.Status = CandidateJobStatus.Published;
        candidate.PublishedJobId = job.Id;
        candidate.PublishedByUserId = publisherUserId;
        candidate.PublishedAt = now;
        await _candidateRepository.UpdateAsync(candidate, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var created = await _jobRepository.GetByIdWithDetailsAsync(job.Id, cancellationToken);
        return created is null ? JobMapper.ToDto(job) : JobMapper.ToDto(created);
    }

    private async Task<Company> ResolveCompanyAsync(string companyName, CancellationToken cancellationToken)
    {
        var existing = await _companyRepository.FindByNameAsync(companyName, cancellationToken);
        if (existing is not null) return existing;

        var slug = Regex.Replace(companyName.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
        if (string.IsNullOrWhiteSpace(slug)) slug = "company";

        var suffix = 0;
        while (await _companyRepository.GetBySlugAsync(slug, cancellationToken) is not null)
        {
            suffix++;
            slug = $"{slug}-{suffix}";
        }

        var company = new Company
        {
            Name = companyName.Trim(),
            Slug = slug,
            Status = CompanyStatus.Approved,
            IsActive = true,
        };
        await _companyRepository.AddAsync(company, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return company;
    }
}
