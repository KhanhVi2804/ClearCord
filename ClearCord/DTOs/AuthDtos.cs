using System.ComponentModel.DataAnnotations;

namespace ClearCord.DTOs;

public sealed record RegisterRequest(
    [param: Required, MaxLength(32), RegularExpression("^[A-Za-z0-9._@+-]+$", ErrorMessage = "Username can only contain letters, numbers, and .-_@+ characters without spaces.")] string UserName,
    [param: Required, MaxLength(64)] string DisplayName,
    [param: Required, EmailAddress] string Email,
    [param: Required, MinLength(8)] string Password);

public sealed record LoginRequest(
    [param: Required] string EmailOrUserName,
    [param: Required] string Password);

public sealed record ForgotPasswordRequest(
    [param: Required, EmailAddress] string Email);

public sealed record ResetPasswordRequest(
    [param: Required] string UserId,
    [param: Required] string Token,
    [param: Required, MinLength(8)] string NewPassword);

public sealed record AuthUserDto(
    string Id,
    string UserName,
    string DisplayName,
    string Email,
    string? AvatarUrl,
    bool IsOnline);

public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    AuthUserDto User);

public sealed record ForgotPasswordResponse(
    string UserId,
    string ResetToken,
    string Message);
