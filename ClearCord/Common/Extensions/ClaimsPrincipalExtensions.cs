using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using ClearCord.Common.Exceptions;

namespace ClearCord.Common.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static string GetRequiredUserId(this ClaimsPrincipal principal)
    {
        return principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new ApiException("Authentication is required.", StatusCodes.Status401Unauthorized);
    }

    public static string GetRequiredJti(this ClaimsPrincipal principal)
    {
        return principal.FindFirstValue(JwtRegisteredClaimNames.Jti)
            ?? throw new ApiException("Token identifier is missing.", StatusCodes.Status400BadRequest);
    }
}
