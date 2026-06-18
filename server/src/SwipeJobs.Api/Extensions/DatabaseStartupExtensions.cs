using Microsoft.EntityFrameworkCore;
using SwipeJobs.Domain.Enums;
using SwipeJobs.Infrastructure.Persistence;
using SwipeJobs.Infrastructure.Persistence.Migrations;
using SwipeJobs.Infrastructure.Persistence.Seeding;

namespace SwipeJobs.Api.Extensions;

public static class DatabaseStartupExtensions
{
    public static async Task InitializeDatabaseAsync(this WebApplication app)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseStartup");
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        logger.LogWarning("Database startup: applying EF Core migrations before accepting requests...");
        Console.Error.WriteLine("[DatabaseStartup] Applying EF Core migrations before accepting requests...");

        await DatabaseMigrationRunner.ApplyPendingMigrationsAsync(dbContext, logger);

        var seeder = scope.ServiceProvider.GetRequiredService<IDataSeeder>();
        await seeder.SeedAsync();

        var showcaseSeeder = scope.ServiceProvider.GetRequiredService<ShowcaseJobSeeder>();
        await showcaseSeeder.SeedAsync();

        var pipelineDemoSeeder = scope.ServiceProvider.GetRequiredService<PipelineDemoSeeder>();
        await pipelineDemoSeeder.SeedAsync();

        if (app.Configuration.GetValue("Seed:AutoApproveCompanies", false))
        {
            var pending = await dbContext.Companies
                .Where(c => c.Status == CompanyStatus.Pending)
                .ToListAsync();
            if (pending.Count > 0)
            {
                foreach (var company in pending)
                {
                    company.Status = CompanyStatus.Approved;
                    company.IsActive = true;
                }
                await dbContext.SaveChangesAsync();
                logger.LogInformation("Auto-approved {Count} pending companies.", pending.Count);
            }
        }

        logger.LogInformation("Database startup: seed completed.");
        Console.Error.WriteLine("[DatabaseStartup] Seed completed.");
    }
}
