using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SwipeJobs.Application.Common.Configuration;
using SwipeJobs.Application.Modules.Ingestion.Models;

using SwipeJobs.Application.Modules.Ingestion;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

public sealed class OpenRouterExtractionService : IJobExtractionProvider
{
    private const string Provider = "OpenRouter";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };

    private readonly HttpClient _httpClient;
    private readonly AiOptions _options;
    private readonly AiConfigurationRuntimeInfo _runtimeInfo;
    private readonly ILogger<OpenRouterExtractionService> _logger;

    public OpenRouterExtractionService(
        HttpClient httpClient,
        IOptions<AiOptions> options,
        AiConfigurationRuntimeInfo runtimeInfo,
        ILogger<OpenRouterExtractionService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _runtimeInfo = runtimeInfo;
        _logger = logger;
    }

    public string ProviderName => Provider;

    public async Task<AiExtractionResponse> ExtractJobAsync(string rawMessage, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var model = RequireConfiguredModel();

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            const string message = "AI:ApiKey is not configured.";
            _logger.LogError("{Provider} extraction blocked: {Message}", Provider, message);
            return Failed(model, message, stopwatch.ElapsedMilliseconds);
        }

        if (string.IsNullOrWhiteSpace(rawMessage))
            return Failed(model, "Raw message is empty.", stopwatch.ElapsedMilliseconds);

        AiExtractionResponse? lastResult = null;

        for (var attempt = 1; attempt <= 2; attempt++)
        {
            try
            {
                var (responseText, statusCode, requestBytes) =
                    await CallOpenRouterAsync(rawMessage, model, cancellationToken);

                var parsed = JobExtractionJsonParser.Parse(responseText);

                stopwatch.Stop();
                _logger.LogInformation(
                    "{Provider} extraction succeeded. Model={Model}, RequestBytes={RequestBytes}, Status={Status}, DurationMs={DurationMs}, ParseTitle={Title}, ParseConfidence={Confidence}",
                    Provider,
                    model,
                    requestBytes,
                    statusCode,
                    stopwatch.ElapsedMilliseconds,
                    parsed.Title ?? "(null)",
                    parsed.Confidence);

                return new AiExtractionResponse(
                    parsed,
                    _options.Provider,
                    model,
                    Provider,
                    true,
                    null,
                    stopwatch.ElapsedMilliseconds,
                    statusCode);
            }
            catch (AiProviderExtractionException ex)
            {
                stopwatch.Stop();
                var friendly = AiProviderErrorClassifier.ToFriendlyMessage(Provider, ex.StatusCode, ex.Message);
                var retryAfter = ex.RetryAfter.HasValue ? (int?)Math.Ceiling(ex.RetryAfter.Value.TotalSeconds) : null;

                _logger.LogWarning(
                    ex,
                    "{Provider} API call failed. Model={Model}, Status={Status}, DurationMs={DurationMs}, RetryAfterSeconds={RetryAfterSeconds}, Body={Body}",
                    Provider,
                    model,
                    ex.StatusCode,
                    stopwatch.ElapsedMilliseconds,
                    retryAfter,
                    AiHttpExtractionHelpers.Truncate(ex.ResponseBody, 2000));

                lastResult = new AiExtractionResponse(
                    null,
                    _options.Provider,
                    model,
                    Provider,
                    false,
                    friendly,
                    stopwatch.ElapsedMilliseconds,
                    ex.StatusCode,
                    ex.IsRateLimited,
                    retryAfter);

                if (ex.IsRateLimited || attempt >= 2)
                    return lastResult;

                stopwatch.Restart();
                _logger.LogInformation("{Provider} extraction retrying. Model={Model}, Attempt={Attempt}", Provider, model, attempt + 1);
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex, "{Provider} extraction failed. Model={Model}, DurationMs={DurationMs}, Attempt={Attempt}", Provider, model, stopwatch.ElapsedMilliseconds, attempt);

                lastResult = Failed(model, AiProviderErrorClassifier.ToFriendlyMessage(Provider, null, ex.Message), stopwatch.ElapsedMilliseconds);
                if (attempt >= 2)
                    return lastResult;

                stopwatch.Restart();
            }
        }

        return lastResult ?? Failed(model, "OpenRouter extraction failed.", stopwatch.ElapsedMilliseconds);
    }

    private string RequireConfiguredModel()
    {
        var model = _options.Model?.Trim();
        if (string.IsNullOrWhiteSpace(model))
        {
            throw new InvalidOperationException(
                "AI:Model is not configured. Set AI__Model in environment or AI:Model in appsettings.");
        }

        return model;
    }

    private async Task<(string Text, int StatusCode, int RequestBytes)> CallOpenRouterAsync(
        string rawMessage,
        string model,
        CancellationToken cancellationToken)
    {
        const string endpoint = "chat/completions";

        _logger.LogInformation(
            "{Provider} request preparing. Model={Model}, Endpoint={Endpoint}, ConfigSource={ConfigSource}",
            Provider,
            model,
            endpoint,
            _runtimeInfo.ModelSource);

        var request = new OpenRouterChatRequest
        {
            Model = model,
            Messages =
            [
                new OpenRouterMessage { Role = "system", Content = JobExtractionPrompt.SystemPrompt },
                new OpenRouterMessage { Role = "user", Content = rawMessage },
            ],
            Temperature = 0.1,
            ResponseFormat = new OpenRouterResponseFormat { Type = "json_object" },
        };

        var requestJson = JsonSerializer.Serialize(request, JsonOptions);
        var requestBytes = Encoding.UTF8.GetByteCount(requestJson);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        httpRequest.Headers.TryAddWithoutValidation("HTTP-Referer", "https://swipejobs.app");
        httpRequest.Headers.TryAddWithoutValidation("X-Title", "SwipeJobs");
        httpRequest.Content = JsonContent.Create(request);

        _logger.LogInformation(
            "{Provider} request sending. Model={Model}, RequestBytes={RequestBytes}, Endpoint={Endpoint}",
            Provider,
            model,
            requestBytes,
            endpoint);

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var statusCode = (int)response.StatusCode;
        var retryAfter = AiHttpExtractionHelpers.ParseRetryAfterSeconds(response);

        _logger.LogInformation(
            "{Provider} response received. Model={Model}, Status={Status}, ResponseBytes={ResponseBytes}, Body={Body}",
            Provider,
            model,
            statusCode,
            Encoding.UTF8.GetByteCount(body),
            AiHttpExtractionHelpers.Truncate(body, 2000));

        if (!response.IsSuccessStatusCode)
        {
            var apiMessage = AiHttpExtractionHelpers.TryParseJsonErrorMessage(body) ?? $"HTTP {statusCode}";
            throw new AiProviderExtractionException(
                Provider,
                statusCode,
                AiProviderErrorClassifier.ToLogMessage(Provider, statusCode, apiMessage),
                body,
                requestBytes,
                retryAfter.HasValue ? TimeSpan.FromSeconds(retryAfter.Value) : null);
        }

        var openRouterResponse = JsonSerializer.Deserialize<OpenRouterChatResponse>(body, JsonOptions)
            ?? throw new InvalidOperationException("OpenRouter returned an empty response envelope.");

        var text = openRouterResponse.Choices?
            .FirstOrDefault()?
            .Message?
            .Content;

        if (string.IsNullOrWhiteSpace(text))
        {
            _logger.LogWarning(
                "{Provider} returned success but no text. Model={Model}, Body={Body}",
                Provider,
                model,
                AiHttpExtractionHelpers.Truncate(body, 1000));
            throw new InvalidOperationException("OpenRouter returned no text content.");
        }

        return (text, statusCode, requestBytes);
    }

    private AiExtractionResponse Failed(string model, string error, long elapsedMs) =>
        new(null, _options.Provider, model, Provider, false, error, elapsedMs);

    private sealed class OpenRouterChatRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("messages")]
        public List<OpenRouterMessage> Messages { get; set; } = [];

        [JsonPropertyName("temperature")]
        public double Temperature { get; set; }

        [JsonPropertyName("response_format")]
        public OpenRouterResponseFormat? ResponseFormat { get; set; }
    }

    private sealed class OpenRouterMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    private sealed class OpenRouterResponseFormat
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "json_object";
    }

    private sealed class OpenRouterChatResponse
    {
        [JsonPropertyName("choices")]
        public List<OpenRouterChoice>? Choices { get; set; }
    }

    private sealed class OpenRouterChoice
    {
        [JsonPropertyName("message")]
        public OpenRouterMessage? Message { get; set; }
    }
}
