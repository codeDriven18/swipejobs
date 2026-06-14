using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Auth.Interfaces;
using SwipeJobs.Infrastructure.Auth;
using System.Security.Claims;
using System.Text.Json;

namespace SwipeJobs.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<AuthController> _logger;
    private readonly JsonSerializerOptions _jsonSerializerOptions;

    public AuthController(
        IAuthService authService,
        IUserRepository userRepository,
        ICurrentUserService currentUser,
        ILogger<AuthController> logger,
        IOptions<JsonOptions> jsonOptions)
    {
        _authService = authService;
        _userRepository = userRepository;
        _currentUser = currentUser;
        _logger = logger;
        _jsonSerializerOptions = jsonOptions.Value.JsonSerializerOptions;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto, CancellationToken cancellationToken)
    {
        RegisterFlowDiagnostics.LogPhaseStart(
            _logger,
            "controller-register",
            $"email={dto.Email.Trim()} accountType={dto.AccountType ?? "jobseeker"}");

        try
        {
            var result = await _authService.RegisterAsync(dto, cancellationToken);
            RegisterFlowDiagnostics.LogPhaseComplete(
                _logger,
                "controller-register",
                $"userId={result.User.Id} role={result.User.Role}");

            try
            {
                var serialized = JsonSerializer.Serialize(result, _jsonSerializerOptions);
                _logger.LogWarning(
                    "AuthController.Register JSON probe succeeded: bytes={Length} userId={UserId} role={Role}",
                    serialized.Length,
                    result.User.Id,
                    result.User.Role);
            }
            catch (Exception serializationEx)
            {
                RegisterFlowDiagnostics.LogFullExceptionChain(
                    _logger,
                    "AuthController.Register JSON probe failed before Ok(result)",
                    serializationEx);
                throw;
            }

            _logger.LogWarning(
                "AuthController.Register returning Ok(AuthResponseDto): userId={UserId} accessTokenLength={AccessTokenLength} refreshTokenLength={RefreshTokenLength}",
                result.User.Id,
                result.AccessToken.Length,
                result.RefreshToken.Length);
            return Ok(result);
        }
        catch (Exception ex)
        {
            RegisterFlowDiagnostics.LogFullExceptionChain(_logger, "AuthController.Register failed", ex);
            throw;
        }
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.LoginAsync(dto, cancellationToken);
            _logger.LogInformation(
                "AuthController.Login succeeded userId={UserId} email={Email} role={Role}",
                result.User.Id,
                result.User.Email,
                result.User.Role);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "POST /api/auth/refresh tokenLength={TokenLength}",
            dto.RefreshToken?.Length ?? 0);

        try
        {
            var result = await _authService.RefreshAsync(dto.RefreshToken ?? string.Empty, cancellationToken);
            _logger.LogInformation(
                "POST /api/auth/refresh succeeded userId={UserId} newRefreshLength={RefreshLength}",
                result.User.Id,
                result.RefreshToken.Length);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("POST /api/auth/refresh rejected: {Reason}", ex.Message);
            return Unauthorized(new { error = ex.Message, code = "refresh_rejected" });
        }
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutDto dto, CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(dto.RefreshToken, cancellationToken);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto, CancellationToken cancellationToken)
    {
        await _authService.ForgotPasswordAsync(dto, cancellationToken);
        return Ok(new { message = "If an account exists for this email, password reset instructions would be sent." });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto, CancellationToken cancellationToken)
    {
        try
        {
            await _authService.ChangePasswordAsync(_currentUser.GetRequiredUserId(), dto, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdWithMembershipAsync(
            _currentUser.GetRequiredUserId(), cancellationToken);
        if (user is null) return NotFound();

        return Ok(new AuthUserDto(
            user.Id,
            user.Email,
            user.Profile?.Id,
            user.Role,
            user.CompanyMembership?.CompanyId,
            user.CompanyMembership?.Company?.Name,
            user.CompanyMembership?.Company?.Status));
    }

    /// <summary>Diagnostic endpoint for verifying JWT role claims vs database role after login.</summary>
    [Authorize]
    [HttpGet("session-info")]
    public async Task<IActionResult> SessionInfo(CancellationToken cancellationToken)
    {
        var userId = _currentUser.GetRequiredUserId();
        var user = await _userRepository.GetByIdWithMembershipAsync(userId, cancellationToken);
        if (user is null) return NotFound();

        var tokenRole = User.FindFirstValue("role")
            ?? User.FindFirstValue(ClaimTypes.Role);

        return Ok(new
        {
            userId = user.Id,
            email = user.Email,
            roleFromDatabase = user.Role.ToString(),
            roleFromToken = tokenRole,
            resolvedRole = _currentUser.Role?.ToString(),
            claims = User.Claims.Select(c => new { type = c.Type, value = c.Value }).ToList(),
        });
    }
}
