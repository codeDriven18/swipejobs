using SwipeJobs.Infrastructure.Persistence;
using SwipeJobs.Infrastructure.Persistence.Migrations;
using Xunit;

namespace SwipeJobs.Infrastructure.Tests;

public class DatabaseMigrationDiscoveryTests
{
    [Fact]
    public void Infrastructure_assembly_contains_InitialPostgreSQL_migration_type()
    {
        var migrationType = typeof(AppDbContext).Assembly
            .GetTypes()
            .SingleOrDefault(type => type.Name == "InitialPostgreSQL");

        Assert.NotNull(migrationType);
        Assert.Equal("SwipeJobs.Infrastructure.Migrations", migrationType!.Namespace);
    }

    [Fact]
    public void InitialPostgreSQL_migration_id_is_expected()
    {
        Assert.Equal("20260607170756_InitialPostgreSQL", DatabaseMigrationRunner.InitialMigrationId);
    }
}
