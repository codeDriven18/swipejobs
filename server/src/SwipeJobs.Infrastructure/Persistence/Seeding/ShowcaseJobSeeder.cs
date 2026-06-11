using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Infrastructure.Persistence.Seeding;

public sealed class ShowcaseJobSeeder
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ShowcaseJobSeeder> _logger;

    public ShowcaseJobSeeder(
        AppDbContext context,
        IConfiguration configuration,
        ILogger<ShowcaseJobSeeder> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (!_configuration.GetValue("Seed:ShowcaseJobs", true))
        {
            _logger.LogInformation("Showcase job seeding disabled (Seed:ShowcaseJobs=false).");
            return;
        }

        var source = await EnsureShowcaseSourceAsync(cancellationToken);
        await EnsureShowcaseCompaniesAsync(cancellationToken);
        var tags = await EnsureShowcaseTagsAsync(cancellationToken);

        var seeded = 0;
        foreach (var seed in ShowcaseJobSeedCatalog.Jobs)
        {
            var exists = await _context.Jobs
                .AnyAsync(j => j.ExternalUrl == seed.ExternalKey, cancellationToken);

            if (exists)
                continue;

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Slug == seed.CompanySlug, cancellationToken);

            if (company is null)
            {
                _logger.LogWarning(
                    "Showcase company {Slug} missing for job {Title}. Skipping.",
                    seed.CompanySlug,
                    seed.Title);
                continue;
            }

            var job = new Job
            {
                Title = seed.Title,
                Description = seed.Description.Trim(),
                CompanyId = company.Id,
                City = seed.City,
                Location = seed.Location,
                Category = seed.Category,
                Level = seed.Level,
                IsRemote = seed.IsRemote,
                SalaryMin = seed.SalaryMin,
                SalaryMax = seed.SalaryMax,
                SourceId = source.Id,
                ExternalUrl = seed.ExternalKey,
                IsActive = true,
                IsArchived = false,
            };

            _context.Jobs.Add(job);
            await _context.SaveChangesAsync(cancellationToken);
            AddTags(job.Id, tags, seed.TagSlugs);
            seeded++;
        }

        if (seeded > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Seeded {Count} showcase demo job(s).", seeded);
        }
        else
        {
            _logger.LogInformation("Showcase demo jobs already present.");
        }
    }

    private async Task<Source> EnsureShowcaseSourceAsync(CancellationToken cancellationToken)
    {
        var existing = await _context.Sources
            .FirstOrDefaultAsync(
                s => s.ExternalIdentifier == ShowcaseJobSeedCatalog.SourceExternalId,
                cancellationToken);

        if (existing is not null)
            return existing;

        var source = new Source
        {
            Name = "SwipeJobs Showcase (Demo)",
            Type = SourceType.Manual,
            ExternalIdentifier = ShowcaseJobSeedCatalog.SourceExternalId,
            IsActive = true,
        };

        _context.Sources.Add(source);
        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Created showcase job source.");
        return source;
    }

    private async Task EnsureShowcaseCompaniesAsync(CancellationToken cancellationToken)
    {
        foreach (var companySeed in ShowcaseJobSeedCatalog.Companies)
        {
            var existing = await _context.Companies
                .FirstOrDefaultAsync(c => c.Slug == companySeed.Slug, cancellationToken);

            if (existing is null)
            {
                _context.Companies.Add(new Company
                {
                    Name = companySeed.Name,
                    Slug = companySeed.Slug,
                    Description = companySeed.Description,
                    Industry = companySeed.Industry,
                    Location = companySeed.Location,
                    CompanySize = companySeed.CompanySize,
                    Website = companySeed.Website,
                    LogoUrl = companySeed.LogoUrl,
                    BannerUrl = companySeed.BannerUrl,
                    LinkedInUrl = companySeed.LinkedInUrl,
                    Status = CompanyStatus.Approved,
                    IsActive = true,
                });
                continue;
            }

            existing.Name = companySeed.Name;
            existing.Description = companySeed.Description;
            existing.Industry = companySeed.Industry;
            existing.Location = companySeed.Location;
            existing.CompanySize = companySeed.CompanySize;
            existing.Website = companySeed.Website;
            if (string.IsNullOrWhiteSpace(existing.LogoUrl)) existing.LogoUrl = companySeed.LogoUrl;
            if (string.IsNullOrWhiteSpace(existing.BannerUrl)) existing.BannerUrl = companySeed.BannerUrl;
            if (string.IsNullOrWhiteSpace(existing.LinkedInUrl)) existing.LinkedInUrl = companySeed.LinkedInUrl;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<Dictionary<string, Tag>> EnsureShowcaseTagsAsync(CancellationToken cancellationToken)
    {
        var map = await _context.Tags
            .Where(t => t.Slug != null)
            .ToDictionaryAsync(t => t.Slug!, cancellationToken);

        foreach (var (name, slug) in ShowcaseJobSeedCatalog.Tags)
        {
            if (map.ContainsKey(slug))
                continue;

            var tag = new Tag { Name = name, Slug = slug };
            _context.Tags.Add(tag);
            map[slug] = tag;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return map;
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
