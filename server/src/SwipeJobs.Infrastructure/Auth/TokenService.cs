using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using SwipeJobs.Application.Modules.Auth.Interfaces;
using SwipeJobs.Infrastructure.Auth;

namespace SwipeJobs.Infrastructure.Auth;

public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<TokenService> _logger;

    public TokenService(IConfiguration configuration, ILogger<TokenService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public string GenerateAccessToken(Guid userId, Guid? profileId, string email, string role, Guid? companyId)
    {
        _logger.LogWarning(
            "JWT: GenerateAccessToken starting for userId={UserId} email={Email} role={Role} profileId={ProfileId} companyId={CompanyId}",
            userId,
            email,
            role,
            profileId,
            companyId);

        try
        {
            var jwtKey = GetJwtKey();
            _logger.LogWarning("JWT: signing key resolved (length={KeyLength})", jwtKey.Length);

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expiryMinutes = int.TryParse(_configuration["Jwt:AccessTokenMinutes"], out var m) ? m : 15;

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new(JwtRegisteredClaimNames.Email, email),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new(ClaimTypes.Role, role),
                new("role", role),
            };

            if (profileId.HasValue)
                claims.Add(new Claim("profileId", profileId.Value.ToString()));

            if (companyId.HasValue)
                claims.Add(new Claim("companyId", companyId.Value.ToString()));

            _logger.LogWarning(
                "JWT: building token issuer={Issuer} audience={Audience} expiryMinutes={ExpiryMinutes} claimCount={ClaimCount}",
                _configuration["Jwt:Issuer"],
                _configuration["Jwt:Audience"],
                expiryMinutes,
                claims.Count);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
                signingCredentials: creds);

            var serialized = new JwtSecurityTokenHandler().WriteToken(token);
            _logger.LogWarning("JWT: access token generated (length={Length})", serialized.Length);
            return serialized;
        }
        catch (Exception ex)
        {
            RegisterFlowDiagnostics.LogFullExceptionChain(_logger, "JWT: GenerateAccessToken failed", ex);
            throw;
        }
    }

    public string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        var token = Convert.ToBase64String(bytes);
        _logger.LogWarning("JWT: refresh token generated (length={Length})", token.Length);
        return token;
    }

    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    public int GetAccessTokenExpirySeconds()
    {
        var expiryMinutes = int.TryParse(_configuration["Jwt:AccessTokenMinutes"], out var m) ? m : 15;
        return expiryMinutes * 60;
    }

    private string GetJwtKey()
        => _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is not configured.");
}
