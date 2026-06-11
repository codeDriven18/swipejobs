using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace SwipeJobs.Api.Tests;

public class ProfileUpdateTests : IClassFixture<SwipeJobsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ProfileUpdateTests(SwipeJobsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Put_ProfilesMe_WithSkills_PersistsAndReturns200()
    {
        var email = $"profile-test-{Guid.NewGuid():N}@example.com";
        var register = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "Test1234!",
            accountType = "jobseeker",
            firstName = "Test",
            lastName = "User",
        });

        register.EnsureSuccessStatusCode();
        var auth = await register.Content.ReadFromJsonAsync<JsonElement>();
        var token = auth.GetProperty("accessToken").GetString()!;

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var update = await _client.PutAsJsonAsync("/api/profiles/me", new
        {
            firstName = "Test",
            lastName = "User",
            email,
            phone = "+15551234567",
            bio = "Ready to work",
            headline = "Software Developer",
            location = "Remote",
            skills = new[] { new { name = "C#", level = "Expert" } },
            educations = Array.Empty<object>(),
            experiences = Array.Empty<object>(),
        });

        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var profile = await update.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Test", profile.GetProperty("firstName").GetString());
        Assert.Equal(1, profile.GetProperty("skills").GetArrayLength());
        Assert.Equal("C#", profile.GetProperty("skills")[0].GetProperty("name").GetString());

        var secondUpdate = await _client.PutAsJsonAsync("/api/profiles/me", new
        {
            firstName = "Updated",
            lastName = "User",
            email,
            phone = "+15551234567",
            skills = new[] { new { name = "Go", level = "Mid" } },
            educations = Array.Empty<object>(),
            experiences = Array.Empty<object>(),
        });

        secondUpdate.EnsureSuccessStatusCode();
        var updated = await secondUpdate.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Updated", updated.GetProperty("firstName").GetString());
        Assert.Equal("Go", updated.GetProperty("skills")[0].GetProperty("name").GetString());
    }
}
