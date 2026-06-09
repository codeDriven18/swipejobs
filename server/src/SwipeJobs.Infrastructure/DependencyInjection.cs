using Microsoft.EntityFrameworkCore;

using Microsoft.Extensions.Configuration;

using Microsoft.Extensions.DependencyInjection;

using SwipeJobs.Application.Common.Interfaces;

using SwipeJobs.Application.Modules.Auth.Interfaces;

using SwipeJobs.Application.Common.Interfaces.Repositories;

using SwipeJobs.Infrastructure.Auth;

using SwipeJobs.Infrastructure.Persistence;

using SwipeJobs.Infrastructure.Persistence.Repositories;

using SwipeJobs.Infrastructure.Persistence.Seeding;



namespace SwipeJobs.Infrastructure;



public static class DependencyInjection

{

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)

    {

        var (connectionString, source) = ResolveConnectionString(configuration);



        if (string.IsNullOrWhiteSpace(connectionString))

        {

            var message =

                "ConnectionStrings:DefaultConnection must be configured via Azure app settings " +

                "(ConnectionStrings__DefaultConnection) or connection strings (DefaultConnection).";

            Console.Error.WriteLine(message);

            throw new InvalidOperationException(message);

        }



        connectionString = PostgresConnectionStringNormalizer.Normalize(connectionString);

        var runtimeInfo = PostgresConnectionStringNormalizer.DescribeRuntime(connectionString, source);

        services.AddSingleton(runtimeInfo);



        Console.Error.WriteLine(
            $"Using PostgreSQL ({runtimeInfo.Source}): Host={runtimeInfo.Host};Database={runtimeInfo.Database};Username={runtimeInfo.Username};SSL Mode={runtimeInfo.SslMode};PasswordLength={runtimeInfo.PasswordLength}");



        services.AddDbContext<AppDbContext>(options =>

            options.UseNpgsql(connectionString, npgsql =>

            {

                npgsql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null);

                npgsql.CommandTimeout(30);

                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);

            }));



        services.AddScoped<IAuthService, AuthService>();

        services.AddScoped<ITokenService, TokenService>();

        services.AddScoped<IUnitOfWork, UnitOfWork>();

        services.AddScoped<IUserRepository, UserRepository>();

        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();

        services.AddScoped<IUserActivityRepository, UserActivityRepository>();

        services.AddScoped<IUserInterestProfileRepository, UserInterestProfileRepository>();

        services.AddScoped<ICompanyFollowRepository, CompanyFollowRepository>();

        services.AddScoped<INotificationRepository, NotificationRepository>();

        services.AddScoped<ICompanyMemberRepository, CompanyMemberRepository>();

        services.AddScoped<ICompanyRepository, CompanyRepository>();

        services.AddScoped<IJobRepository, JobRepository>();

        services.AddScoped<ITagRepository, TagRepository>();

        services.AddScoped<ISourceRepository, SourceRepository>();

        services.AddScoped<IUserProfileRepository, UserProfileRepository>();

        services.AddScoped<IApplicationRepository, ApplicationRepository>();

        services.AddScoped<ISavedJobRepository, SavedJobRepository>();

        services.AddScoped<IAuditLogRepository, AuditLogRepository>();

        services.AddScoped<IAuditLogService, Audit.AuditLogService>();

        services.AddScoped<IDataSeeder, DataSeeder>();



        return services;

    }



    private static (string? ConnectionString, string Source) ResolveConnectionString(IConfiguration configuration)

    {

        var fromConfig = configuration.GetConnectionString("DefaultConnection");

        if (!string.IsNullOrWhiteSpace(fromConfig))

        {

            Console.Error.WriteLine(
                $"Connection candidate ConnectionStrings:DefaultConnection: {PostgresConnectionStringNormalizer.DescribeForLogs(fromConfig)}");

            return (fromConfig, "ConnectionStrings:DefaultConnection");

        }



        var envKeys = new[]

        {

            "ConnectionStrings__DefaultConnection",

            "CUSTOMCONNSTR_DefaultConnection",

            "POSTGRESQLCONNSTR_DefaultConnection",

        };



        foreach (var key in envKeys)

        {

            var value = Environment.GetEnvironmentVariable(key);

            if (!string.IsNullOrWhiteSpace(value))

            {

                Console.Error.WriteLine(
                    $"Connection candidate {key}: {PostgresConnectionStringNormalizer.DescribeForLogs(value)}");

                return (value, key);

            }

        }



        return (null, "missing");

    }

}

