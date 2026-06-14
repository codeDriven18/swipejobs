using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Infrastructure.Auth;

public static class ConfiguredAdminUserEnsurer
{
    public static async Task EnsureAsync(
        DbSet<User> users,
        IConfiguration configuration,
        ILogger logger,
        Func<Task> saveChangesAsync,
        CancellationToken cancellationToken = default)
    {
        var email = configuration["Admin:Email"]?.Trim().ToLowerInvariant();
        var password = configuration["Admin:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("Admin credentials not configured. Skipping admin ensure.");
            return;
        }

        var existing = await users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (existing is null)
        {
            users.Add(new User
            {
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role = UserRole.Admin,
            });
            await saveChangesAsync();
            logger.LogInformation("Created configured admin user {Email}.", email);
            return;
        }

        var previousRole = existing.Role;
        var updated = false;

        if (existing.Role != UserRole.Admin)
        {
            existing.Role = UserRole.Admin;
            updated = true;
            logger.LogWarning(
                "Promoted existing user {Email} from {PreviousRole} to Admin.",
                email,
                previousRole);
        }

        if (!BCrypt.Net.BCrypt.Verify(password, existing.PasswordHash))
        {
            existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            updated = true;
            logger.LogInformation("Synced configured admin password for {Email}.", email);
        }

        if (updated)
        {
            await saveChangesAsync();
            logger.LogInformation("Configured admin user {Email} is ready.", email);
        }
        else
        {
            logger.LogInformation("Configured admin user {Email} already has Admin role.", email);
        }
    }

    public static bool IsConfiguredAdminEmail(IConfiguration configuration, string email)
    {
        var configured = configuration["Admin:Email"]?.Trim().ToLowerInvariant();
        return !string.IsNullOrWhiteSpace(configured)
            && string.Equals(configured, email.Trim().ToLowerInvariant(), StringComparison.Ordinal);
    }
}
