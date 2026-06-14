using Microsoft.Extensions.Configuration;

namespace SwipeJobs.Application.Common.Configuration;

public sealed class AiConfigurationRuntimeInfo
{
    public required string Provider { get; init; }
    public required string ProviderSource { get; init; }
    public required string Model { get; init; }
    public required string ModelSource { get; init; }
    public required bool ApiKeyConfigured { get; init; }
    public required string ApiKeySource { get; init; }
    public bool IsModelConfigured => !string.IsNullOrWhiteSpace(Model);
}

public static class AiConfigurationDiagnostics
{
    public static AiConfigurationRuntimeInfo Resolve(IConfiguration configuration)
    {
        var provider = ResolveSetting(configuration, "Provider", out var providerSource);
        var model = ResolveSetting(configuration, "Model", out var modelSource);
        var apiKey = ResolveSetting(configuration, "ApiKey", out var apiKeySource);

        return new AiConfigurationRuntimeInfo
        {
            Provider = provider?.Trim() ?? string.Empty,
            ProviderSource = providerSource,
            Model = model?.Trim() ?? string.Empty,
            ModelSource = modelSource,
            ApiKeyConfigured = !string.IsNullOrWhiteSpace(apiKey),
            ApiKeySource = apiKeySource,
        };
    }

    private static string? ResolveSetting(IConfiguration configuration, string key, out string source)
    {
        var envKey = $"{AiOptions.SectionName}__{key}";
        var fromEnv = Environment.GetEnvironmentVariable(envKey);
        if (!string.IsNullOrWhiteSpace(fromEnv))
        {
            source = $"Environment variable {envKey}";
            return fromEnv;
        }

        var fromConfig = configuration[$"{AiOptions.SectionName}:{key}"];
        if (!string.IsNullOrWhiteSpace(fromConfig))
        {
            source = "Configuration (appsettings / Azure App Settings)";
            return fromConfig;
        }

        source = "Not configured";
        return null;
    }
}
