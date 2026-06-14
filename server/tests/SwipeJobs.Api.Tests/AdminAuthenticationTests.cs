using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;
using SwipeJobs.Infrastructure.Persistence;
using Xunit;

namespace SwipeJobs.Api.Tests;

public class AdminAuthenticationTests : IClassFixture<SwipeJobsWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly SwipeJobsWebApplicationFactory _factory;

    public AdminAuthenticationTests(SwipeJobsWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_PromotesConfiguredAdminEmail_FromJobSeekerToAdmin()
    {
        const string adminEmail = "admin@swipejobs.local";
        const string adminPassword = "Admin123!";

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.MigrateAsync();

            var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);
            if (existing is null)
            {
                db.Users.Add(new User
                {
                    Email = adminEmail,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                    Role = UserRole.JobSeeker,
                });
            }
            else
            {
                existing.Role = UserRole.JobSeeker;
                existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
            }

            await db.SaveChangesAsync();
        }

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = adminEmail,
            password = adminPassword,
        });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthProbe>();
        Assert.NotNull(auth);
        Assert.Equal("Admin", auth!.User.Role.ToString());

        var sessionRequest = new HttpRequestMessage(HttpMethod.Get, "/api/auth/session-info");
        sessionRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        var sessionResponse = await _client.SendAsync(sessionRequest);
        Assert.Equal(HttpStatusCode.OK, sessionResponse.StatusCode);

        var session = await sessionResponse.Content.ReadFromJsonAsync<SessionInfoProbe>();
        Assert.NotNull(session);
        Assert.Equal("Admin", session!.RoleFromDatabase);
        Assert.Equal("Admin", session.RoleFromToken);
        Assert.Equal("Admin", session.ResolvedRole);

        var statsRequest = new HttpRequestMessage(HttpMethod.Get, "/api/admin/stats");
        statsRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        var statsResponse = await _client.SendAsync(statsRequest);
        Assert.Equal(HttpStatusCode.OK, statsResponse.StatusCode);
    }

    private sealed record AuthProbe(string AccessToken, AuthUserProbe User);

    private sealed record AuthUserProbe(Guid Id, string Email, UserRole Role);

    private sealed record SessionInfoProbe(
        Guid UserId,
        string Email,
        string RoleFromDatabase,
        string RoleFromToken,
        string ResolvedRole);
}
