using System.ComponentModel.DataAnnotations;

namespace ClearCord.DTOs;

public sealed record UpdateProfileRequest(
    [param: Required, MaxLength(64)] string DisplayName,
    [param: MaxLength(160)] string? Bio);

public sealed record UserSummaryDto(
    string Id,
    string UserName,
    string DisplayName,
    string? AvatarUrl,
    bool IsOnline);

public sealed record UserProfileDto(
    string Id,
    string UserName,
    string DisplayName,
    string Email,
    string? AvatarUrl,
    string? Bio,
    bool IsOnline,
    DateTimeOffset? LastSeenAt);
