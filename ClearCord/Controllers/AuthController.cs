using System.Security.Claims;
using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClearCord.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var response = await authService.RegisterAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var response = await authService.LoginAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var jti = User.GetRequiredJti();
        var expiresAt = DateTimeOffset.UtcNow;

        var expClaim = User.FindFirstValue("exp");
        if (long.TryParse(expClaim, out var unixExpiry))
        {
            expiresAt = DateTimeOffset.FromUnixTimeSeconds(unixExpiry);
        }

        await authService.LogoutAsync(userId, jti, expiresAt, cancellationToken);
        return NoContent();
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult<ForgotPasswordResponse>> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var response = await authService.ForgotPasswordAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        await authService.ResetPasswordAsync(request, cancellationToken);
        return NoContent();
    }
}
