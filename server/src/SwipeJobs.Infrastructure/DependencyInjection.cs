using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Modules.Auth.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Infrastructure.Auth;
using SwipeJobs.Infrastructure.Persistence;
using SwipeJobs.Infrastructure.Persistence.Interceptors;
using SwipeJobs.Infrastructure.Persistence.Repositories;
using SwipeJobs.Infrastructure.Persistence.Seeding;
using SwipeJobs.Infrastructure.Storage;

namespace SwipeJobs.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var resolution = PostgresConnectionStringSourceResolver.Resolve(configuration);

        if (string.IsNullOrWhiteSpace(resolution.ConnectionString))
        {
            var message =
                "ConnectionStrings:DefaultConnection must be configured via Azure app settings " +
                "(ConnectionStrings__DefaultConnection) or connection strings (DefaultConnection).";
            Console.Error.WriteLine(message);
            throw new InvalidOperationException(message);
        }

        var connectionString = PostgresConnectionStringNormalizer.Normalize(resolution.ConnectionString);
        var runtimeInfo = new PostgresConnectionRuntimeInfo
        {
            Source = resolution.WinningSourceName,
            Host = resolution.Winner.Host,
            Database = resolution.Winner.Database,
            Username = resolution.Winner.Username,
            SslMode = resolution.Winner.SslMode,
            PasswordLength = resolution.Winner.PasswordLength,
            HasConflictingSources = resolution.HasConflictingSources,
            AllSources = resolution.AllSources,
        };

        services.AddSingleton(runtimeInfo);

        Console.Error.WriteLine(
            $"DbContext will use source={runtimeInfo.Source}; PasswordLength={runtimeInfo.PasswordLength}");

        var perfEnabled = string.Equals(
            Environment.GetEnvironmentVariable("SWIPEJOBS_PERF"),
            "1",
            StringComparison.Ordinal);

        var efInterceptors = new List<IInterceptor> { new EfCommandFailureLoggingInterceptor() };
        if (perfEnabled)
            efInterceptors.Add(new EfQueryTimingInterceptor());

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null);
                npgsql.CommandTimeout(30);
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name);
            })
            .AddInterceptors(efInterceptors.ToArray())
            .EnableDetailedErrors()
            .LogTo(
                message => Console.Error.WriteLine($"[EF SQL] {message}"),
                [DbLoggerCategory.Database.Command.Name],
                LogLevel.Information));

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
        services.AddScoped<IRecruiterTagRepository, RecruiterTagRepository>();
        services.AddScoped<IApplicationRecruiterNoteRepository, ApplicationRecruiterNoteRepository>();
        services.AddScoped<IConversationRepository, ConversationRepository>();
        services.AddScoped<IMessageRepository, MessageRepository>();
        services.AddScoped<ISavedJobRepository, SavedJobRepository>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IIngestionMessageRepository, IngestionMessageRepository>();
        services.AddScoped<IJobCandidateRepository, JobCandidateRepository>();
        services.AddScoped<IJobReportRepository, JobReportRepository>();
        services.AddScoped<ISourceIngestionLogRepository, SourceIngestionLogRepository>();
        services.AddScoped<IAuditLogService, Audit.AuditLogService>();

        // Resume storage: prefer durable Azure Blob storage when a connection string is
        // configured; otherwise fall back to local disk (dev / on-prem). Local storage on
        // Azure App Service is ephemeral and loses files on redeploy — see ResolveBasePath.
        var resumeBlobConnection = configuration["ResumeStorage:AzureBlobConnectionString"]
            ?? configuration.GetConnectionString("ResumeBlobStorage");
        if (!string.IsNullOrWhiteSpace(resumeBlobConnection))
        {
            if (perfEnabled)
            {
                services.AddScoped<Storage.BlobResumeStorageService>();
                services.AddScoped<IResumeStorageService>(sp =>
                    new Storage.TimedResumeStorageService(sp.GetRequiredService<Storage.BlobResumeStorageService>()));
            }
            else
            {
                services.AddScoped<IResumeStorageService, Storage.BlobResumeStorageService>();
            }
        }
        else if (perfEnabled)
        {
            services.AddScoped<Storage.LocalResumeStorageService>();
            services.AddScoped<IResumeStorageService>(sp =>
                new Storage.TimedResumeStorageService(sp.GetRequiredService<Storage.LocalResumeStorageService>()));
        }
        else
        {
            services.AddScoped<IResumeStorageService, Storage.LocalResumeStorageService>();
        }

        // Message-attachment storage: prefer durable Azure Blob when configured; fall back to
        // local disk for dev. Local storage on Azure App Service is ephemeral — attachments are
        // lost on redeploy or restart without blob storage.
        var attachmentBlobConnection = configuration["MessageStorage:AzureBlobConnectionString"]
            ?? configuration.GetConnectionString("MessageAttachmentBlobStorage");
        if (!string.IsNullOrWhiteSpace(attachmentBlobConnection))
        {
            if (perfEnabled)
            {
                services.AddScoped<Storage.BlobMessageAttachmentStorage>();
                services.AddScoped<IMessageAttachmentStorage>(sp =>
                    new Storage.TimedMessageAttachmentStorage(
                        sp.GetRequiredService<Storage.BlobMessageAttachmentStorage>()));
            }
            else
            {
                services.AddScoped<IMessageAttachmentStorage, Storage.BlobMessageAttachmentStorage>();
            }
        }
        else if (perfEnabled)
        {
            services.AddScoped<LocalMessageAttachmentStorage>();
            services.AddScoped<IMessageAttachmentStorage>(sp =>
                new Storage.TimedMessageAttachmentStorage(sp.GetRequiredService<LocalMessageAttachmentStorage>()));
        }
        else
        {
            services.AddScoped<IMessageAttachmentStorage, LocalMessageAttachmentStorage>();
        }
        services.AddScoped<IDataSeeder, DataSeeder>();
        services.AddScoped<ShowcaseJobSeeder>();
        services.AddScoped<PipelineDemoSeeder>();

        return services;
    }
}
