using Microsoft.Extensions.Configuration;
using SwipeJobs.Infrastructure.Persistence;
using Xunit;

namespace SwipeJobs.Infrastructure.Tests;

public class PostgresConnectionStringSourceResolverTests
{
    [Fact]
    public void Resolve_prefers_ConnectionStrings_DefaultConnection_over_env_vars()
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", null);
        Environment.SetEnvironmentVariable("CUSTOMCONNSTR_DefaultConnection", null);
        Environment.SetEnvironmentVariable("POSTGRESQLCONNSTR_DefaultConnection", null);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=config-host;Database=configdb;Username=configuser;Password=configpass12345678",
            })
            .Build();

        var resolution = PostgresConnectionStringSourceResolver.Resolve(configuration);

        Assert.Equal("ConnectionStrings:DefaultConnection", resolution.WinningSourceName);
        Assert.Equal(18, resolution.Winner.PasswordLength);
        Assert.False(resolution.HasConflictingSources);
    }

    [Fact]
    public void Resolve_prefers_config_over_lower_priority_env_when_both_set()
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", null);
        Environment.SetEnvironmentVariable("CUSTOMCONNSTR_DefaultConnection", "Host=custom-host;Database=customdb;Username=customuser;Password=custompass99999");
        Environment.SetEnvironmentVariable("POSTGRESQLCONNSTR_DefaultConnection", null);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=config-host;Database=configdb;Username=configuser;Password=configpass12345678",
            })
            .Build();

        var resolution = PostgresConnectionStringSourceResolver.Resolve(configuration);

        Assert.Equal("ConnectionStrings:DefaultConnection", resolution.WinningSourceName);
        Assert.True(resolution.HasConflictingSources);

        Environment.SetEnvironmentVariable("CUSTOMCONNSTR_DefaultConnection", null);
    }

    [Fact]
    public void Resolve_detects_conflicting_sources()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=host-a;Database=db;Username=user;Password=short1",
            })
            .Build();

        Environment.SetEnvironmentVariable("CUSTOMCONNSTR_DefaultConnection", "Host=host-b;Database=db;Username=user;Password=longerpassword");

        var resolution = PostgresConnectionStringSourceResolver.Resolve(configuration);

        Assert.True(resolution.HasConflictingSources);
        Assert.Equal("ConnectionStrings:DefaultConnection", resolution.WinningSourceName);

        Environment.SetEnvironmentVariable("CUSTOMCONNSTR_DefaultConnection", null);
    }
}
