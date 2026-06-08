using Microsoft.EntityFrameworkCore;
using SwipeJobs.Infrastructure.Persistence;
using SwipeJobs.Infrastructure.Persistence.Seeding;

namespace SwipeJobs.Api.Extensions;

public static class DatabaseStartupExtensions
{
    public static async Task InitializeDatabaseAsync(this WebApplication app)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        try
        {
            if (await dbContext.Database.CanConnectAsync())
                logger.LogInformation("Database connected.");
            else
            {
                logger.LogError("Database connection failed.");
                return;
            }

            var pending = await dbContext.Database.GetPendingMigrationsAsync();
            if (pending.Any())
            {
                await dbContext.Database.MigrateAsync();
                logger.LogInformation("Migrations applied: {Count}", pending.Count());
            }
            else
            {
                logger.LogInformation("Migrations up to date.");
            }

            var seeder = scope.ServiceProvider.GetRequiredService<IDataSeeder>();
            await seeder.SeedAsync();
            logger.LogInformation("Seed completed.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database initialization failed.");
        }
    }
}
