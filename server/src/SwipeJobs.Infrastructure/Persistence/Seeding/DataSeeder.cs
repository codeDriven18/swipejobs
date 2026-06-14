using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;
using SwipeJobs.Infrastructure.Auth;

namespace SwipeJobs.Infrastructure.Persistence.Seeding;

public class DataSeeder : IDataSeeder
{
    private const int TargetTotalJobs = JobSeedCatalog.TargetGigCount + JobSeedCatalog.TargetItCount;
    private const int TargetCompanyCount = 20;

    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DataSeeder> _logger;

    public DataSeeder(
        AppDbContext context,
        IConfiguration configuration,
        ILogger<DataSeeder> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (!await _context.Database.CanConnectAsync(cancellationToken))
        {
            _logger.LogWarning("Database is not available for seeding.");
            return;
        }

        await EnsureSourceAsync(cancellationToken);
        await EnsureAdminUserAsync(cancellationToken);

        var seedDemoData = _configuration.GetValue("Seed:DemoData", false);
        if (!seedDemoData)
        {
            _logger.LogInformation("Demo seed data disabled. System seed completed.");
            return;
        }

        await EnsureTagsAsync(cancellationToken);
        await EnsureCompaniesAsync(cancellationToken);

        var jobCount = await _context.Jobs.CountAsync(cancellationToken);
        var needsReseed = jobCount < TargetTotalJobs
            || await _context.Jobs.AnyAsync(j => j.CompanyId == Guid.Empty, cancellationToken);

        if (!needsReseed)
        {
            _logger.LogInformation("Seed data up to date ({Count} jobs). Skipping.", jobCount);
            return;
        }

        if (jobCount > 0)
        {
            _logger.LogInformation("Upgrading seed from {Count} to {Target} jobs.", jobCount, TargetTotalJobs);
            await ClearJobDataAsync(cancellationToken);
        }

        var source = await EnsureSourceAsync(cancellationToken);
        var tags = await EnsureTagsAsync(cancellationToken);
        var companies = await _context.Companies.ToDictionaryAsync(c => c.Slug, cancellationToken);

        foreach (var g in JobSeedCatalog.Gigs)
        {
            if (!companies.TryGetValue(g.CompanySlug, out var company))
            {
                _logger.LogWarning("Missing company slug {Slug} for gig {Title}. Skipping.", g.CompanySlug, g.Title);
                continue;
            }

            var job = new Job
            {
                Title = g.Title,
                Description = g.Description,
                CompanyId = company.Id,
                City = g.IsRemote ? null : g.City,
                Location = g.IsRemote ? "Remote" : g.City,
                Category = JobCategory.Gig,
                Level = JobLevel.NotApplicable,
                IsRemote = g.IsRemote,
                SalaryMin = g.SalaryMin,
                SalaryMax = g.SalaryMax,
                SourceId = source.Id,
                IsActive = true,
            };
            _context.Jobs.Add(job);
            await _context.SaveChangesAsync(cancellationToken);
            AddTags(job.Id, tags, g.TagSlugs);
        }

        foreach (var j in JobSeedCatalog.ItJobs)
        {
            if (!companies.TryGetValue(j.CompanySlug, out var company))
            {
                _logger.LogWarning("Missing company slug {Slug} for job {Title}. Skipping.", j.CompanySlug, j.Title);
                continue;
            }

            var job = new Job
            {
                Title = j.Title,
                Description = j.Description,
                CompanyId = company.Id,
                City = j.IsRemote ? null : (j.City == "Remote" ? null : j.City),
                Location = j.IsRemote ? "Remote" : j.City,
                Category = JobCategory.It,
                Level = j.Level,
                IsRemote = j.IsRemote,
                SalaryMin = j.SalaryMin,
                SalaryMax = j.SalaryMax,
                SourceId = source.Id,
                IsActive = true,
            };
            _context.Jobs.Add(job);
            await _context.SaveChangesAsync(cancellationToken);
            AddTags(job.Id, tags, j.TagSlugs);
        }

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation(
            "Seeded {GigCount} gigs and {ItCount} IT jobs ({Total} total) across {CompanyCount} companies.",
            JobSeedCatalog.TargetGigCount,
            JobSeedCatalog.TargetItCount,
            TargetTotalJobs,
            companies.Count);
    }

    private async Task EnsureCompaniesAsync(CancellationToken cancellationToken)
    {
        var count = await _context.Companies.CountAsync(cancellationToken);
        if (count >= TargetCompanyCount) return;

        if (count > 0)
        {
            _logger.LogInformation("Refreshing company seed ({Count} → {Target}).", count, TargetCompanyCount);
            await ClearJobDataAsync(cancellationToken);
            _context.Companies.RemoveRange(await _context.Companies.ToListAsync(cancellationToken));
            await _context.SaveChangesAsync(cancellationToken);
        }

        foreach (var c in CompanySeedCatalog.Companies)
        {
            _context.Companies.Add(new Company
            {
                Name = c.Name,
                Slug = c.Slug,
                Description = c.Description,
                Industry = c.Industry,
                Location = c.Location,
                CompanySize = c.CompanySize,
                Website = c.Website,
                Status = CompanyStatus.Approved,
                IsActive = true,
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Seeded {Count} companies.", CompanySeedCatalog.Companies.Count);
    }

    private async Task ClearJobDataAsync(CancellationToken cancellationToken)
    {
        _context.JobTags.RemoveRange(await _context.JobTags.ToListAsync(cancellationToken));
        _context.SavedJobs.RemoveRange(await _context.SavedJobs.ToListAsync(cancellationToken));
        _context.Applications.RemoveRange(await _context.Applications.ToListAsync(cancellationToken));
        _context.Jobs.RemoveRange(await _context.Jobs.ToListAsync(cancellationToken));
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<Source> EnsureSourceAsync(CancellationToken cancellationToken)
    {
        var catalog = new (string Name, SourceType Type, string? ExternalId, string LogoPath, int Trust)[]
        {
            ("SwipeJobs", SourceType.Manual, "swipejobs", "/sources/swipejobs.svg", 95),
            ("Company Website", SourceType.Manual, "company-website", "/sources/company.svg", 85),
            ("LinkedIn", SourceType.ExternalApi, "linkedin", "/sources/linkedin.svg", 80),
            ("HeadHunter", SourceType.ExternalApi, "hh", "/sources/headhunter.svg", 75),
            ("EPAM Careers", SourceType.ExternalApi, "epam", "/sources/epam.svg", 90),
            ("Telegram Jobs", SourceType.Telegram, "telegram-jobs", "/sources/telegram.svg", 40),
        };

        Source? primary = null;
        foreach (var entry in catalog)
        {
            var existing = await _context.Sources
                .FirstOrDefaultAsync(s => s.ExternalIdentifier == entry.ExternalId, cancellationToken);

            if (existing is null)
            {
                existing = new Source
                {
                    Name = entry.Name,
                    Type = entry.Type,
                    ExternalIdentifier = entry.ExternalId,
                    LogoUrl = entry.LogoPath,
                    TrustScore = entry.Trust,
                    IsActive = true,
                };
                _context.Sources.Add(existing);
            }
            else
            {
                existing.Name = entry.Name;
                existing.LogoUrl = entry.LogoPath;
                existing.TrustScore = entry.Trust;
            }

            primary ??= existing;
        }

        await _context.SaveChangesAsync(cancellationToken);
        primary ??= await _context.Sources.FirstAsync(cancellationToken);
        return primary;
    }

    private async Task<Dictionary<string, Tag>> EnsureTagsAsync(CancellationToken cancellationToken)
    {
        var existing = await _context.Tags.ToListAsync(cancellationToken);
        var map = existing
            .Where(t => t.Slug is not null)
            .ToDictionary(t => t.Slug!, t => t);

        foreach (var (name, slug) in JobSeedCatalog.Tags)
        {
            if (!map.ContainsKey(slug))
            {
                var tag = new Tag { Name = name, Slug = slug };
                _context.Tags.Add(tag);
                map[slug] = tag;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return map;
    }

    private async Task EnsureAdminUserAsync(CancellationToken cancellationToken)
    {
        await ConfiguredAdminUserEnsurer.EnsureAsync(
            _context.Users,
            _configuration,
            _logger,
            () => _context.SaveChangesAsync(cancellationToken),
            cancellationToken);
    }

    private void AddTags(Guid jobId, Dictionary<string, Tag> tags, string[] slugs)
    {
        foreach (var slug in slugs.Distinct())
        {
            if (tags.TryGetValue(slug, out var tag))
            {
                _context.JobTags.Add(new JobTag { JobId = jobId, TagId = tag.Id });
            }
        }
    }
}
