using Microsoft.EntityFrameworkCore;
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
        logger.LogInformation("Database startup: seed completed.");
        Console.Error.WriteLine("[DatabaseStartup] Seed completed.");
    }
}
