using System.Net;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace SwipeJobs.Application.Modules.Ingestion.Services;

public record TelegramChannelPost(
    string MessageId,
    string Text,
    string? MessageUrl,
    DateTime? PostedAt);

public interface ITelegramPublicChannelReader
{
    Task<IReadOnlyList<TelegramChannelPost>> FetchRecentPostsAsync(
        string channelUrl,
        CancellationToken cancellationToken = default);
}

public partial class TelegramPublicChannelReader : ITelegramPublicChannelReader
{
    [GeneratedRegex(
        @"data-post=""([^""/]+)/(\d+)""[\s\S]*?class=""tgme_widget_message_text js-message_text""[^>]*>([\s\S]*?)</div>",
        RegexOptions.Compiled | RegexOptions.IgnoreCase)]
    private static partial Regex MessageBlockRegex();

    [GeneratedRegex("<[^>]+>", RegexOptions.Compiled)]
    private static partial Regex HtmlTagRegex();

    private readonly HttpClient _httpClient;
    private readonly ILogger<TelegramPublicChannelReader> _logger;

    public TelegramPublicChannelReader(HttpClient httpClient, ILogger<TelegramPublicChannelReader> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<IReadOnlyList<TelegramChannelPost>> FetchRecentPostsAsync(
        string channelUrl,
        CancellationToken cancellationToken = default)
    {
        var handle = TelegramChannelUrlNormalizer.ExtractHandle(channelUrl);
        if (string.IsNullOrWhiteSpace(handle))
        {
            _logger.LogWarning("Telegram channel scrape skipped: invalid URL {Url}", channelUrl);
            return [];
        }

        var previewUrl = $"https://t.me/s/{handle}";
        using var request = new HttpRequestMessage(HttpMethod.Get, previewUrl);
        request.Headers.TryAddWithoutValidation("User-Agent", "SwipeJobsIngestion/1.0");

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var html = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Telegram preview fetch failed for {Url}. Status={Status}",
                previewUrl,
                (int)response.StatusCode);
            return [];
        }

        var posts = new List<TelegramChannelPost>();
        foreach (Match match in MessageBlockRegex().Matches(html))
        {
            var channel = match.Groups[1].Value;
            var messageId = match.Groups[2].Value;
            var rawHtml = match.Groups[3].Value;
            var text = WebUtility.HtmlDecode(HtmlTagRegex().Replace(rawHtml, " ").Replace("&nbsp;", " ").Trim());
            if (string.IsNullOrWhiteSpace(text))
                continue;

            posts.Add(new TelegramChannelPost(
                messageId,
                text,
                $"https://t.me/{channel}/{messageId}",
                null));
        }

        _logger.LogInformation(
            "Telegram preview parsed {Count} posts from {Handle}. LatestMessageId={Latest}",
            posts.Count,
            handle,
            posts.LastOrDefault()?.MessageId ?? "(none)");

        return posts;
    }
}
