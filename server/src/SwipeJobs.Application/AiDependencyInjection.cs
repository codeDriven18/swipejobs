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
        services.AddSingleton<AiExtractionDiagnosticsState>();
        services.AddSingleton<QueuedAiExtractionService>();
        services.AddSingleton<IAiExtractionService>(sp => sp.GetRequiredService<QueuedAiExtractionService>());

        services.AddHttpClient<GeminiExtractionService>(client =>
        {
            client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
            client.Timeout = TimeSpan.FromSeconds(120);
        });

        services.AddHttpClient<OpenRouterExtractionService>(client =>
        {
            client.BaseAddress = new Uri("https://openrouter.ai/api/v1/");
            client.Timeout = TimeSpan.FromSeconds(120);
        });

        services.AddSingleton<IJobExtractionProvider>(ResolveJobExtractionProvider);

        return services;
    }

    internal static IJobExtractionProvider ResolveJobExtractionProvider(IServiceProvider serviceProvider)
    {
        var runtimeInfo = serviceProvider.GetRequiredService<AiConfigurationRuntimeInfo>();
        var provider = runtimeInfo.Provider?.Trim() ?? string.Empty;

        if (provider.Equals("OpenRouter", StringComparison.OrdinalIgnoreCase))
            return serviceProvider.GetRequiredService<OpenRouterExtractionService>();

        if (provider.Equals("Gemini", StringComparison.OrdinalIgnoreCase))
            return serviceProvider.GetRequiredService<GeminiExtractionService>();

        throw new InvalidOperationException(
            string.IsNullOrWhiteSpace(provider)
                ? "AI:Provider is not configured. Set AI__Provider to Gemini or OpenRouter."
                : $"Unsupported AI provider '{provider}'. Supported providers: Gemini, OpenRouter.");
    }

    public static void LogAiConfiguration(ILogger logger, AiConfigurationRuntimeInfo runtimeInfo)
    {
        logger.LogInformation(
            "AI configuration: Provider={Provider} (source: {ProviderSource}), Model={Model} (source: {ModelSource}), ApiKeyConfigured={ApiKeyConfigured} (source: {ApiKeySource})",
            string.IsNullOrWhiteSpace(runtimeInfo.Provider) ? "(missing)" : runtimeInfo.Provider,
            runtimeInfo.ProviderSource,
            runtimeInfo.IsModelConfigured ? runtimeInfo.Model : "(missing)",
            runtimeInfo.ModelSource,
            runtimeInfo.ApiKeyConfigured,
            runtimeInfo.ApiKeySource);

        if (string.IsNullOrWhiteSpace(runtimeInfo.Provider))
        {
            logger.LogCritical(
                "AI:Provider is not configured. Set AI__Provider to Gemini or OpenRouter.");
        }

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
