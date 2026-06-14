using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common.Configuration;
using SwipeJobs.Application.Modules.Ingestion.Interfaces;
using SwipeJobs.Application.Modules.Ingestion.Services;

namespace SwipeJobs.Application;

public static class AiDependencyInjection
{
    public static IServiceCollection AddAiExtraction(this IServiceCollection services, IConfiguration configuration)
    {
        var runtimeInfo = AiConfigurationDiagnostics.Resolve(configuration);
        services.AddSingleton(runtimeInfo);

        services.Configure<AiOptions>(configuration.GetSection(AiOptions.SectionName));

        services.AddSingleton<AiExtractionQueueMetrics>();
        services.AddSingleton<QueuedAiExtractionService>();
        services.AddSingleton<IAiExtractionService>(sp => sp.GetRequiredService<QueuedAiExtractionService>());

        services.AddHttpClient<IGeminiExtractionClient, GeminiExtractionService>(client =>
        {
            client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
            client.Timeout = TimeSpan.FromSeconds(120);
        });

        return services;
    }

    public static void LogAiConfiguration(ILogger logger, AiConfigurationRuntimeInfo runtimeInfo)
    {
        logger.LogInformation(
            "AI configuration: Provider={Provider} (source: {ProviderSource}), Model={Model} (source: {ModelSource}), ApiKeyConfigured={ApiKeyConfigured} (source: {ApiKeySource})",
            runtimeInfo.Provider,
            runtimeInfo.ProviderSource,
            runtimeInfo.IsModelConfigured ? runtimeInfo.Model : "(missing)",
            runtimeInfo.ModelSource,
            runtimeInfo.ApiKeyConfigured,
            runtimeInfo.ApiKeySource);

        if (!runtimeInfo.IsModelConfigured)
        {
            logger.LogCritical(
                "AI:Model is not configured. Set AI__Model in environment or AI:Model in appsettings. Extraction will fail.");
        }

        if (!runtimeInfo.ApiKeyConfigured)
        {
            logger.LogWarning(
                "AI:ApiKey is not configured. Set AI__ApiKey in environment or AI:ApiKey in appsettings.");
        }
    }
}
