using System.Net;
using System.Net.Http.Json;
using SwipeJobs.Api.Extensions;
using Xunit;

namespace SwipeJobs.Api.Tests;

public class CorsOriginPolicyTests
{
    [Theory]
    [InlineData("https://swipejobss.netlify.app", true)]
    [InlineData("https://6a267b1a1b64858734149e95--swipejobss.netlify.app", true)]
    [InlineData("https://other-site.netlify.app", true)]
    [InlineData("http://localhost:5173", true)]
    [InlineData("https://localhost:5173", true)]
    [InlineData("https://evil.example.com", false)]
    public void IsAllowedOrigin_matches_expected_hosts(string origin, bool expected)
    {
        var configured = new[] { "https://swipejobss.netlify.app" };
        Assert.Equal(expected, CorsExtensions.IsAllowedOrigin(origin, configured));
    }
}

public class CorsTests : IClassFixture<SwipeJobsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public CorsTests(SwipeJobsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Theory]
    [InlineData("/api/tags", "GET", "http://localhost:5173")]
    [InlineData("/api/jobs", "GET", "https://swipejobss.netlify.app")]
    [InlineData("/api/auth/login", "POST", "https://6a267b1a1b64858734149e95--swipejobss.netlify.app")]
    [InlineData("/hubs/notifications/negotiate", "POST", "https://6a267b1a1b64858734149e95--swipejobss.netlify.app")]
    public async Task Options_Preflight_ReturnsCorsHeaders(string path, string method, string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, path);
        request.Headers.TryAddWithoutValidation("Origin", origin);
        request.Headers.TryAddWithoutValidation("Access-Control-Request-Method", method);
        request.Headers.TryAddWithoutValidation("Access-Control-Request-Headers", "authorization,content-type");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var origins));
        Assert.Equal(origin, origins.Single());
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Methods", out var methods));
        Assert.Contains(method, methods, StringComparer.OrdinalIgnoreCase);
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Headers", out var allowedHeaders));
        Assert.Contains("authorization", allowedHeaders, StringComparer.OrdinalIgnoreCase);
        Assert.Equal("true", response.Headers.GetValues("Access-Control-Allow-Credentials").Single());
    }

    [Fact]
    public async Task SignalR_Negotiate_Preflight_Allows_X_Requested_With()
    {
        const string origin = "https://6a267b1a1b64858734149e95--swipejobss.netlify.app";
        var request = new HttpRequestMessage(HttpMethod.Options, "/hubs/notifications/negotiate");
        request.Headers.TryAddWithoutValidation("Origin", origin);
        request.Headers.TryAddWithoutValidation("Access-Control-Request-Method", "POST");
        request.Headers.TryAddWithoutValidation(
            "Access-Control-Request-Headers",
            "authorization,content-type,x-requested-with,x-signalr-user-agent");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var origins));
        Assert.Equal(origin, origins.Single());
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Headers", out var allowedHeaders));
        var headerList = string.Join(",", allowedHeaders).ToLowerInvariant();
        Assert.Contains("x-requested-with", headerList);
        Assert.Contains("authorization", headerList);
        Assert.Contains("content-type", headerList);
    }

    [Fact]
    public async Task Login_WithNetlifyOrigin_IncludesAccessControlAllowOrigin()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { email = "missing@test.local", password = "Password123!" }),
        };
        request.Headers.TryAddWithoutValidation("Origin", "https://swipejobss.netlify.app");

        var response = await _client.SendAsync(request);

        Assert.True(
            response.StatusCode is HttpStatusCode.OK or HttpStatusCode.Unauthorized or HttpStatusCode.BadRequest,
            $"Unexpected status: {response.StatusCode}");
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var origins));
        Assert.Equal("https://swipejobss.netlify.app", origins.Single());
    }
}
