using System.Diagnostics;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SwipeJobs.Application.Common.Configuration;
using SwipeJobs.Application.Modules.Ingestion;
using SwipeJobs.Application.Modules.Ingestion.Models;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

public class GeminiExtractionService : IGeminiExtractionClient
{
    private const string ExtractionSource = "Gemini";

    private const string SystemPrompt = """
        You are a recruitment data extraction engine.
        Your task is to extract job information from Telegram posts.
        Return valid JSON only.
        Do not explain.
        Do not generate markdown.
        Do not generate text outside JSON.
        If information is missing, return null.
        Never hallucinate.

        Extract: title, company, salaryMin, salaryMax, currency, location, remote, employmentType, experienceLevel, skills, description, applyMethod, applyUrl, email, phone, telegramContact, confidence.

        Expected JSON shape:
        {
          "title": "",
          "company": "",
          "salaryMin": null,
          "salaryMax": null,
          "currency": null,
          "location": null,
          "remote": false,
          "employmentType": null,
          "experienceLevel": null,
          "skills": [],
          "description": "",
          "applyMethod": null,
          "applyUrl": null,
          "email": null,
          "phone": null,
          "telegramContact": null,
          "confidence": 0
        }

        confidence must be an integer from 0 to 100 reflecting extraction quality.
        """;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };

    private static readonly Regex MarkdownFenceRegex = new(
        @"^```(?:json)?\s*([\s\S]*?)\s*```$",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    private readonly HttpClient _httpClient;
    private readonly AiOptions _options;
    private readonly AiConfigurationRuntimeInfo _runtimeInfo;
    private readonly ILogger<GeminiExtractionService> _logger;

    public GeminiExtractionService(
        HttpClient httpClient,
        IOptions<AiOptions> options,
        AiConfigurationRuntimeInfo runtimeInfo,
        ILogger<GeminiExtractionService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _runtimeInfo = runtimeInfo;
        _logger = logger;
    }

    public async Task<AiExtractionResponse> ExtractJobAsync(string rawMessage, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var model = RequireConfiguredModel();

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            const string message = "AI:ApiKey is not configured.";
            _logger.LogError("Gemini extraction blocked: {Message}", message);
            return Failed(model, message, stopwatch.ElapsedMilliseconds);
        }

        if (string.IsNullOrWhiteSpace(rawMessage))
            return Failed(model, "Raw message is empty.", stopwatch.ElapsedMilliseconds);

        try
        {
            var (responseText, statusCode, requestBytes, responseBody, retryAfterSeconds) =
                await CallGeminiAsync(rawMessage, model, cancellationToken);

            var parsed = ParseCandidateJson(responseText);

            _logger.LogInformation(
                "Gemini extraction succeeded. Model={Model}, RequestBytes={RequestBytes}, Status={Status}, ParseTitle={Title}, ParseConfidence={Confidence}",
                model,
                requestBytes,
                statusCode,
                parsed.Title ?? "(null)",
                parsed.Confidence);

            stopwatch.Stop();
            return new AiExtractionResponse(
                parsed,
                _options.Provider,
                model,
                ExtractionSource,
                true,
                null,
                stopwatch.ElapsedMilliseconds,
                statusCode);
        }
        catch (GeminiExtractionException ex)
        {
            stopwatch.Stop();
            var isRateLimited = ex.IsRateLimited;
            var retryAfter = ex.RetryAfter.HasValue ? (int?)Math.Ceiling(ex.RetryAfter.Value.TotalSeconds) : null;

            _logger.LogWarning(
                ex,
                "Gemini API call failed. Model={Model}, Status={Status}, RetryAfterSeconds={RetryAfterSeconds}, Body={Body}",
                model,
                ex.StatusCode,
                retryAfter,
                Truncate(ex.ResponseBody, 2000));

            return new AiExtractionResponse(
                null,
                _options.Provider,
                model,
                ExtractionSource,
                false,
                ex.Message,
                stopwatch.ElapsedMilliseconds,
                ex.StatusCode,
                isRateLimited,
                retryAfter);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Gemini extraction failed for model {Model}.", model);
            return Failed(model, ex.Message, stopwatch.ElapsedMilliseconds);
        }
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

    private async Task<(string Text, int StatusCode, int RequestBytes, string ResponseBody, int? RetryAfterSeconds)> CallGeminiAsync(
        string rawMessage,
        string model,
        CancellationToken cancellationToken)
    {
        var url = $"v1beta/models/{Uri.EscapeDataString(model)}:generateContent";

        _logger.LogInformation(
            "Gemini request preparing. Model={Model}, Endpoint={Endpoint}, ConfigSource={ConfigSource}",
            model,
            url,
            _runtimeInfo.ModelSource);

        var request = new GeminiGenerateContentRequest
        {
            SystemInstruction = new GeminiContent
            {
                Parts = [new GeminiPart { Text = SystemPrompt }],
            },
            Contents =
            [
                new GeminiContent
                {
                    Role = "user",
                    Parts = [new GeminiPart { Text = rawMessage }],
                },
            ],
            GenerationConfig = new GeminiGenerationConfig
            {
                Temperature = 0.1,
                ResponseMimeType = "application/json",
            },
        };

        var requestJson = JsonSerializer.Serialize(request, JsonOptions);
        var requestBytes = Encoding.UTF8.GetByteCount(requestJson);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Headers.Add("x-goog-api-key", _options.ApiKey);
        httpRequest.Content = JsonContent.Create(request);

        _logger.LogInformation(
            "Gemini request sending. Model={Model}, RequestBytes={RequestBytes}, Url={Url}",
            model,
            requestBytes,
            url);

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var statusCode = (int)response.StatusCode;
        var retryAfter = ParseRetryAfterSeconds(response);

        _logger.LogInformation(
            "Gemini response received. Model={Model}, Status={Status}, RetryAfterSeconds={RetryAfterSeconds}, ResponseBytes={ResponseBytes}, Body={Body}",
            model,
            statusCode,
            retryAfter,
            Encoding.UTF8.GetByteCount(body),
            Truncate(body, 2000));

        if (!response.IsSuccessStatusCode)
        {
            var apiMessage = TryParseGeminiErrorMessage(body) ?? $"HTTP {statusCode}";
            throw new GeminiExtractionException(
                statusCode,
                $"Gemini API error {statusCode}: {apiMessage}",
                body,
                requestBytes,
                retryAfter.HasValue ? TimeSpan.FromSeconds(retryAfter.Value) : null);
        }

        var geminiResponse = JsonSerializer.Deserialize<GeminiGenerateContentResponse>(body, JsonOptions)
            ?? throw new InvalidOperationException("Gemini returned an empty response envelope.");

        var text = geminiResponse.Candidates?
            .FirstOrDefault()?
            .Content?
            .Parts?
            .FirstOrDefault(p => !string.IsNullOrWhiteSpace(p.Text))?
            .Text;

        if (string.IsNullOrWhiteSpace(text))
        {
            _logger.LogWarning(
                "Gemini returned success but no text. Model={Model}, Body={Body}",
                model,
                Truncate(body, 1000));
            throw new InvalidOperationException("Gemini returned no text content.");
        }

        return (text, statusCode, requestBytes, body, retryAfter);
    }

    private static int? ParseRetryAfterSeconds(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Retry-After", out var values))
            return null;

        var raw = values.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        if (int.TryParse(raw, out var seconds))
            return seconds;

        if (DateTimeOffset.TryParse(raw, out var retryAt))
        {
            var delta = retryAt - DateTimeOffset.UtcNow;
            return delta.TotalSeconds > 0 ? (int)Math.Ceiling(delta.TotalSeconds) : 0;
        }

        return null;
    }

    private static ParsedJobCandidate ParseCandidateJson(string responseText)
    {
        var json = NormalizeJsonPayload(responseText);
        var dto = JsonSerializer.Deserialize<GeminiCandidateDto>(json, JsonOptions)
            ?? throw new JsonException("Gemini JSON deserialized to null.");

        return new ParsedJobCandidate(
            NullIfBlank(dto.Title),
            NullIfBlank(dto.Company),
            dto.SalaryMin,
            dto.SalaryMax,
            NullIfBlank(dto.Currency),
            NullIfBlank(dto.Location),
            dto.Remote,
            NullIfBlank(dto.EmploymentType),
            NullIfBlank(dto.ExperienceLevel),
            dto.Skills?.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList()
                ?? [],
            NullIfBlank(dto.Description),
            NullIfBlank(dto.ApplyMethod),
            NullIfBlank(dto.ApplyUrl),
            NullIfBlank(dto.Email),
            NullIfBlank(dto.Phone),
            NullIfBlank(dto.TelegramContact),
            Math.Clamp(dto.Confidence ?? 0, 0, 100));
    }

    private static string? TryParseGeminiErrorMessage(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("error", out var error) &&
                error.TryGetProperty("message", out var message))
            {
                return message.GetString();
            }
        }
        catch (JsonException)
        {
            /* ignore malformed error payloads */
        }

        return null;
    }

    private static string NormalizeJsonPayload(string text)
    {
        var trimmed = text.Trim();
        var fenceMatch = MarkdownFenceRegex.Match(trimmed);
        if (fenceMatch.Success)
            trimmed = fenceMatch.Groups[1].Value.Trim();

        using var document = JsonDocument.Parse(trimmed);
        return trimmed;
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength] + "...";

    private AiExtractionResponse Failed(string model, string error, long elapsedMs) =>
        new(null, _options.Provider, model, ExtractionSource, false, error, elapsedMs);

    private sealed class GeminiGenerateContentRequest
    {
        [JsonPropertyName("systemInstruction")]
        public GeminiContent? SystemInstruction { get; set; }

        [JsonPropertyName("contents")]
        public List<GeminiContent> Contents { get; set; } = [];

        [JsonPropertyName("generationConfig")]
        public GeminiGenerationConfig? GenerationConfig { get; set; }
    }

    private sealed class GeminiGenerationConfig
    {
        [JsonPropertyName("temperature")]
        public double Temperature { get; set; }

        [JsonPropertyName("responseMimeType")]
        public string? ResponseMimeType { get; set; }
    }

    private sealed class GeminiContent
    {
        [JsonPropertyName("role")]
        public string? Role { get; set; }

        [JsonPropertyName("parts")]
        public List<GeminiPart> Parts { get; set; } = [];
    }

    private sealed class GeminiPart
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    private sealed class GeminiGenerateContentResponse
    {
        [JsonPropertyName("candidates")]
        public List<GeminiCandidate>? Candidates { get; set; }
    }

    private sealed class GeminiCandidate
    {
        [JsonPropertyName("content")]
        public GeminiContent? Content { get; set; }
    }

    private sealed class GeminiCandidateDto
    {
        public string? Title { get; set; }
        public string? Company { get; set; }
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public string? Currency { get; set; }
        public string? Location { get; set; }
        public bool? Remote { get; set; }
        public string? EmploymentType { get; set; }
        public string? ExperienceLevel { get; set; }
        public List<string>? Skills { get; set; }
        public string? Description { get; set; }
        public string? ApplyMethod { get; set; }
        public string? ApplyUrl { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? TelegramContact { get; set; }
        public int? Confidence { get; set; }
    }
}
