using System.Text.RegularExpressions;
using BCrypt.Net;
using Microsoft.Extensions.Logging;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Auth.Interfaces;
using SwipeJobs.Domain.Entities;
using SwipeJobs.Domain.Enums;

namespace SwipeJobs.Infrastructure.Auth;

public class AuthService : IAuthService
{
    private const int RefreshTokenDays = 7;

    private readonly IUserRepository _userRepository;
    private readonly IUserProfileRepository _profileRepository;
    private readonly ICompanyRepository _companyRepository;
    private readonly ICompanyMemberRepository _companyMemberRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ITokenService _tokenService;
    private readonly IAuditLogService _auditLogService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        IUserProfileRepository profileRepository,
        ICompanyRepository companyRepository,
        ICompanyMemberRepository companyMemberRepository,
        IRefreshTokenRepository refreshTokenRepository,
        ITokenService tokenService,
        IAuditLogService auditLogService,
        IUnitOfWork unitOfWork,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _profileRepository = profileRepository;
        _companyRepository = companyRepository;
        _companyMemberRepository = companyMemberRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
        _auditLogService = auditLogService;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default)
    {
        RegisterFlowDiagnostics.LogPhaseStart(
            _logger,
            "register-entry",
            $"email={dto.Email.Trim()} accountType={dto.AccountType ?? "jobseeker"}");

        try
        {
            var email = await RunRegisterPhaseAsync(
                "validate-input",
                () =>
                {
                    var normalized = dto.Email.Trim().ToLower();
                    if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 8)
                        throw new InvalidOperationException("Password must be at least 8 characters.");

                    var isCompany = string.Equals(dto.AccountType, "company", StringComparison.OrdinalIgnoreCase);
                    if (isCompany && string.IsNullOrWhiteSpace(dto.CompanyName))
                        throw new InvalidOperationException("Company name is required for employer accounts.");

                    RegisterFlowDiagnostics.LogPhaseComplete(
                        _logger,
                        "validate-input",
                        $"email={normalized} passwordLength={dto.Password.Length} isCompany={isCompany}");
                    return Task.FromResult((normalized, isCompany));
                },
                cancellationToken);

            await RunRegisterPhaseAsync(
                "check-existing-user",
                async () =>
                {
                    var existing = await _userRepository.GetByEmailAsync(email.normalized, cancellationToken);
                    if (existing is not null)
                        throw new InvalidOperationException("An account with this email already exists.");

                    RegisterFlowDiagnostics.LogPhaseComplete(_logger, "check-existing-user", "no duplicate");
                },
                cancellationToken);

            var user = await RunRegisterPhaseAsync(
                "create-user-entity",
                () =>
                {
                    var entity = new User
                    {
                        Email = email.normalized,
                        Role = email.isCompany ? UserRole.Company : UserRole.JobSeeker,
                    };
                    RegisterFlowDiagnostics.LogPhaseComplete(
                        _logger,
                        "create-user-entity",
                        $"email={entity.Email} role={entity.Role}");
                    return Task.FromResult(entity);
                },
                cancellationToken);

            await RunRegisterPhaseAsync(
                "hash-password",
                () =>
                {
                    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                    RegisterFlowDiagnostics.LogPhaseComplete(
                        _logger,
                        "hash-password",
                        $"hashLength={user.PasswordHash.Length}");
                    return Task.CompletedTask;
                },
                cancellationToken);

            await RunRegisterPhaseAsync(
                "persist-user",
                async () =>
                {
                    await _userRepository.AddAsync(user, cancellationToken);
                    RegisterFlowDiagnostics.LogPhaseStart(_logger, "persist-user", "calling SaveChangesAsync");
                    await _unitOfWork.SaveChangesAsync(cancellationToken);
                    RegisterFlowDiagnostics.LogPhaseComplete(_logger, "persist-user", $"userId={user.Id}");
                },
                cancellationToken);

            await RunRegisterPhaseAsync(
                "audit-user-created",
                async () =>
                {
                    await _auditLogService.LogAsync(
                        AuditAction.UserCreated,
                        AuditEntityType.User,
                        user.Id,
                        $"User registered as {(email.isCompany ? "company" : "job seeker")}",
                        actorUserId: user.Id,
                        actorEmail: email.normalized,
                        cancellationToken: cancellationToken);
                    RegisterFlowDiagnostics.LogPhaseComplete(_logger, "audit-user-created");
                },
                cancellationToken);

            _logger.LogInformation("User registered: {Email} as {Role}", email.normalized, user.Role);

            UserProfile? profile = null;
            CompanyMember? membership = null;

            if (email.isCompany)
            {
                membership = await RunRegisterPhaseAsync(
                    "create-company-account",
                    async () => await CreateCompanyAccountAsync(user, email.normalized, dto, cancellationToken),
                    cancellationToken);
            }
            else
            {
                profile = await RunRegisterPhaseAsync(
                    "create-jobseeker-profile",
                    async () => await CreateJobSeekerProfileAsync(user, email.normalized, dto, cancellationToken),
                    cancellationToken);
            }

            var response = await RunRegisterPhaseAsync(
                "issue-tokens",
                async () => await IssueTokensAsync(user, profile, membership, cancellationToken),
                cancellationToken);

            RegisterFlowDiagnostics.LogPhaseComplete(_logger, "register-entry", $"userId={user.Id}");
            return response;
        }
        catch (Exception ex)
        {
            RegisterFlowDiagnostics.LogFullExceptionChain(_logger, "AuthService.RegisterAsync failed", ex);
            throw;
        }
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default)
    {
        var email = dto.Email.Trim().ToLower();
        var user = await _userRepository.GetByEmailAsync(email, cancellationToken);

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        user.LastLoginAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.Login,
            AuditEntityType.User,
            user.Id,
            "User logged in",
            actorUserId: user.Id,
            actorEmail: email,
            cancellationToken: cancellationToken);

        _logger.LogInformation("User login: {Email}", email);

        var fullUser = await _userRepository.GetByIdWithMembershipAsync(user.Id, cancellationToken)
            ?? throw new UnauthorizedAccessException("User not found.");

        return await IssueTokensAsync(fullUser, fullUser.Profile, fullUser.CompanyMembership, cancellationToken);
    }

    public async Task<AuthResponseDto> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var hash = _tokenService.HashToken(refreshToken);
        var stored = await _refreshTokenRepository.GetByTokenHashAsync(hash, cancellationToken)
            ?? throw new UnauthorizedAccessException("Invalid refresh token.");

        if (stored.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token expired.");

        stored.RevokedAt = DateTime.UtcNow;
        await _refreshTokenRepository.UpdateAsync(stored, cancellationToken);

        var user = await _userRepository.GetByIdWithMembershipAsync(stored.UserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("User not found.");

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await IssueTokensAsync(user, user.Profile, user.CompanyMembership, cancellationToken);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var hash = _tokenService.HashToken(refreshToken);
        var stored = await _refreshTokenRepository.GetByTokenHashAsync(hash, cancellationToken);
        if (stored is null) return;

        stored.RevokedAt = DateTime.UtcNow;
        await _refreshTokenRepository.UpdateAsync(stored, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            AuditAction.Logout,
            AuditEntityType.User,
            stored.UserId,
            "User logged out",
            actorUserId: stored.UserId,
            cancellationToken: cancellationToken);
    }

    public Task ForgotPasswordAsync(ForgotPasswordDto dto, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            throw new InvalidOperationException("Current password is incorrect.");

        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 8)
            throw new InvalidOperationException("New password must be at least 8 characters.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _userRepository.UpdateAsync(user, cancellationToken);
        await _refreshTokenRepository.RevokeAllForUserAsync(userId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<CompanyMember> CreateCompanyAccountAsync(
        User user,
        string email,
        RegisterDto dto,
        CancellationToken cancellationToken)
    {
        var company = new Company
        {
            Name = dto.CompanyName!.Trim(),
            Slug = await CreateUniqueSlugAsync(dto.CompanyName!, cancellationToken),
            Description = $"{dto.CompanyName!.Trim()} is hiring on SwipeJobs.",
            Industry = "Technology",
            Location = "Remote",
            CompanySize = "1-10",
            Status = CompanyStatus.Pending,
            IsActive = false,
        };
        await _companyRepository.AddAsync(company, cancellationToken);
        RegisterFlowDiagnostics.LogPhaseStart(_logger, "create-company-account", "SaveChangesAsync (company)");
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        RegisterFlowDiagnostics.LogPhaseComplete(_logger, "create-company-account", $"companyId={company.Id}");

        await _auditLogService.LogAsync(
            AuditAction.CompanyCreated,
            AuditEntityType.Company,
            company.Id,
            $"Company \"{company.Name}\" registered (pending approval)",
            actorUserId: user.Id,
            actorEmail: email,
            cancellationToken: cancellationToken);

        var membership = new CompanyMember
        {
            UserId = user.Id,
            CompanyId = company.Id,
        };
        await _companyMemberRepository.AddAsync(membership, cancellationToken);
        RegisterFlowDiagnostics.LogPhaseStart(_logger, "create-company-membership", "SaveChangesAsync (membership)");
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        membership.Company = company;
        RegisterFlowDiagnostics.LogPhaseComplete(_logger, "create-company-membership", $"membership userId={user.Id}");
        return membership;
    }

    private async Task<UserProfile> CreateJobSeekerProfileAsync(
        User user,
        string email,
        RegisterDto dto,
        CancellationToken cancellationToken)
    {
        var profile = new UserProfile
        {
            UserId = user.Id,
            FirstName = dto.FirstName?.Trim() ?? string.Empty,
            LastName = dto.LastName?.Trim() ?? string.Empty,
            Email = email,
        };
        await _profileRepository.AddAsync(profile, cancellationToken);
        RegisterFlowDiagnostics.LogPhaseStart(_logger, "create-jobseeker-profile", "SaveChangesAsync (profile)");
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        RegisterFlowDiagnostics.LogPhaseComplete(_logger, "create-jobseeker-profile", $"profileId={profile.Id}");
        return profile;
    }

    private async Task<AuthResponseDto> IssueTokensAsync(
        User user, UserProfile? profile, CompanyMember? membership, CancellationToken cancellationToken)
    {
        _logger.LogWarning(
            "Auth tokens: generating refresh token for userId={UserId} email={Email}",
            user.Id,
            user.Email);

        var refreshPlain = _tokenService.GenerateRefreshToken();
        _logger.LogWarning(
            "Auth tokens: refresh token generated (length={Length}), hashing for storage",
            refreshPlain.Length);

        var refreshEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _tokenService.HashToken(refreshPlain),
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenDays),
        };

        await _refreshTokenRepository.AddAsync(refreshEntity, cancellationToken);
        _logger.LogWarning("Auth tokens: SaveChangesAsync (refresh token) for userId={UserId}", user.Id);
        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            RegisterFlowDiagnostics.LogFullExceptionChain(
                _logger,
                "Auth tokens: SaveChangesAsync (refresh token) failed",
                ex);
            throw;
        }

        _logger.LogWarning(
            "Auth tokens: generating access token for userId={UserId} profileId={ProfileId} companyId={CompanyId} role={Role}",
            user.Id,
            profile?.Id,
            membership?.CompanyId,
            user.Role);

        string accessToken;
        try
        {
            accessToken = _tokenService.GenerateAccessToken(
                user.Id,
                profile?.Id,
                user.Email,
                user.Role.ToString(),
                membership?.CompanyId);
        }
        catch (Exception ex)
        {
            RegisterFlowDiagnostics.LogFullExceptionChain(
                _logger,
                "Auth tokens: GenerateAccessToken failed",
                ex);
            throw;
        }

        _logger.LogWarning(
            "Auth tokens: access token generated (length={Length}) for userId={UserId}",
            accessToken.Length,
            user.Id);

        return new AuthResponseDto(
            accessToken,
            refreshPlain,
            _tokenService.GetAccessTokenExpirySeconds(),
            new AuthUserDto(
                user.Id,
                user.Email,
                profile?.Id,
                user.Role,
                membership?.CompanyId,
                membership?.Company?.Name,
                membership?.Company?.Status));
    }

    private async Task RunRegisterPhaseAsync(
        string phase,
        Func<Task> action,
        CancellationToken cancellationToken)
    {
        RegisterFlowDiagnostics.LogPhaseStart(_logger, phase);
        try
        {
            await action();
        }
        catch (Exception ex)
        {
            RegisterFlowDiagnostics.LogFullExceptionChain(_logger, $"Register flow [{phase}] failed", ex);
            throw;
        }
    }

    private async Task<T> RunRegisterPhaseAsync<T>(
        string phase,
        Func<Task<T>> action,
        CancellationToken cancellationToken)
    {
        RegisterFlowDiagnostics.LogPhaseStart(_logger, phase);
        try
        {
            return await action();
        }
        catch (Exception ex)
        {
            RegisterFlowDiagnostics.LogFullExceptionChain(_logger, $"Register flow [{phase}] failed", ex);
            throw;
        }
    }

    private async Task<string> CreateUniqueSlugAsync(string name, CancellationToken cancellationToken)
    {
        var baseSlug = Regex.Replace(name.Trim().ToLower(), @"[^a-z0-9]+", "-").Trim('-');
        if (string.IsNullOrWhiteSpace(baseSlug)) baseSlug = "company";
        var slug = baseSlug;
        var suffix = 1;
        while (await _companyRepository.GetBySlugAsync(slug, cancellationToken) is not null)
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }
}
