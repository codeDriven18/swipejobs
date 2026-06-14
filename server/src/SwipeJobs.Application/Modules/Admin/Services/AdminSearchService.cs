using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Admin.Interfaces;

namespace SwipeJobs.Application.Modules.Admin.Services;

public class AdminSearchService : IAdminSearchService
{
    private const int LimitPerType = 5;

    private readonly IUserRepository _userRepository;
    private readonly ICompanyRepository _companyRepository;
    private readonly IJobRepository _jobRepository;
    private readonly ISourceRepository _sourceRepository;
    private readonly IJobCandidateRepository _candidateRepository;
    private readonly IApplicationRepository _applicationRepository;

    public AdminSearchService(
        IUserRepository userRepository,
        ICompanyRepository companyRepository,
        IJobRepository jobRepository,
        ISourceRepository sourceRepository,
        IJobCandidateRepository candidateRepository,
        IApplicationRepository applicationRepository)
    {
        _userRepository = userRepository;
        _companyRepository = companyRepository;
        _jobRepository = jobRepository;
        _sourceRepository = sourceRepository;
        _candidateRepository = candidateRepository;
        _applicationRepository = applicationRepository;
    }

    public async Task<AdminSearchResultDto> SearchAsync(string query, CancellationToken cancellationToken = default)
    {
        var q = query.Trim();
        if (q.Length < 2)
            return new AdminSearchResultDto([], 0);

        var lower = q.ToLowerInvariant();
        var results = new List<AdminSearchResultItemDto>();

        var users = await _userRepository.GetAllWithDetailsAsync(cancellationToken);
        foreach (var user in users.Where(u => u.Email.Contains(lower, StringComparison.OrdinalIgnoreCase)).Take(LimitPerType))
        {
            results.Add(new AdminSearchResultItemDto(
                user.Id.ToString(),
                "user",
                user.Email,
                user.Role.ToString(),
                $"/admin/users"));
        }

        var companies = await _companyRepository.GetAllAsync(cancellationToken);
        foreach (var company in companies.Where(c => c.Name.Contains(lower, StringComparison.OrdinalIgnoreCase)).Take(LimitPerType))
        {
            results.Add(new AdminSearchResultItemDto(
                company.Id.ToString(),
                "company",
                company.Name,
                company.Location,
                $"/admin/companies"));
        }

        var (jobs, _) = await _jobRepository.SearchAsync(new JobQueryDto(Search: q, Page: 1, PageSize: LimitPerType), cancellationToken);
        foreach (var job in jobs)
        {
            results.Add(new AdminSearchResultItemDto(
                job.Id.ToString(),
                "job",
                job.Title,
                job.Company?.Name,
                $"/admin/jobs"));
        }

        var sources = await _sourceRepository.GetAllOrderedAsync(cancellationToken);
        foreach (var source in sources.Where(s =>
            s.Name.Contains(lower, StringComparison.OrdinalIgnoreCase) ||
            (s.ChannelUrl != null && s.ChannelUrl.Contains(lower, StringComparison.OrdinalIgnoreCase))).Take(LimitPerType))
        {
            results.Add(new AdminSearchResultItemDto(
                source.Id.ToString(),
                "source",
                source.Name,
                source.ChannelUrl,
                $"/admin/sources"));
        }

        var candidates = await _candidateRepository.SearchAsync(q, LimitPerType, cancellationToken);
        foreach (var candidate in candidates)
        {
            results.Add(new AdminSearchResultItemDto(
                candidate.Id.ToString(),
                "candidate",
                candidate.Title ?? "Untitled candidate",
                candidate.CompanyName,
                $"/admin/moderation"));
        }

        var applications = await _applicationRepository.GetAllWithDetailsAsync(cancellationToken);
        foreach (var application in applications.Where(a =>
            (a.Job?.Title?.Contains(lower, StringComparison.OrdinalIgnoreCase) ?? false) ||
            (a.UserProfile?.Email?.Contains(lower, StringComparison.OrdinalIgnoreCase) ?? false)).Take(LimitPerType))
        {
            results.Add(new AdminSearchResultItemDto(
                application.Id.ToString(),
                "application",
                application.Job?.Title ?? "Application",
                application.UserProfile?.Email,
                $"/admin/applications"));
        }

        return new AdminSearchResultDto(results, results.Count);
    }
}
