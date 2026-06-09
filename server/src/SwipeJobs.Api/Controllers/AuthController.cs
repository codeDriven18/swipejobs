using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using SwipeJobs.Application.Common.Dtos;
using SwipeJobs.Application.Common.Interfaces;
using SwipeJobs.Application.Common.Interfaces.Repositories;
using SwipeJobs.Application.Modules.Auth.Interfaces;
using SwipeJobs.Infrastructure.Persistence;

namespace SwipeJobs.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUser;
    private readonly AppDbContext _dbContext;
    private readonly PostgresConnectionRuntimeInfo _connectionInfo;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthService authService,
        IUserRepository userRepository,
        ICurrentUserService currentUser,
        AppDbContext dbContext,
        PostgresConnectionRuntimeInfo connectionInfo,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _userRepository = userRepository;
        _currentUser = currentUser;
        _dbContext = dbContext;
        _connectionInfo = connectionInfo;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto, CancellationToken cancellationToken)
    {
        _logger.LogWarning("Register diagnostics: Entered Register endpoint for {Email} as {AccountType}", dto.Email, dto.AccountType);

        _logger.LogWarning(
            "Register diagnostics: Active DbContext source={Source} Host={Host};Database={Database};Username={Username};SSL Mode={SslMode};PasswordLength={PasswordLength}",
            _connectionInfo.Source,
            _connectionInfo.Host,
            _connectionInfo.Database,
            _connectionInfo.Username,
            _connectionInfo.SslMode,
            _connectionInfo.PasswordLength);

        RegistrationDatabaseDiagnostics.LogConnectionSources(_logger, _configuration, _environment.ContentRootPath);
        await RegistrationDatabaseDiagnostics.LogDatabaseStateAsync(_dbContext, _logger, cancellationToken);

        _logger.LogWarning("Register diagnostics: Before first database query");

        try
        {
            var result = await _authService.RegisterAsync(dto, cancellationToken);
            _logger.LogWarning("Register diagnostics: Register completed successfully for {Email}", dto.Email);
            return Ok(result);
        }
        catch (Exception ex)
        {
            RegistrationDatabaseDiagnostics.LogException(
                _logger,
                "Register diagnostics: Register failed with exception",
                ex);
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
        try
        {
            var result = await _authService.RefreshAsync(dto.RefreshToken, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
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
}
