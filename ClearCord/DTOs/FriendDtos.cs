using ClearCord.Enums;
using System.ComponentModel.DataAnnotations;

namespace ClearCord.DTOs;

public sealed record SendFriendRequestRequest(
    [param: Required] string TargetUserId);

public sealed record FriendRequestDto(
    Guid Id,
    UserSummaryDto User,
    FriendRequestStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? RespondedAt);

public sealed record FriendDto(
    string UserId,
    string UserName,
    string DisplayName,
    string? AvatarUrl,
    bool IsOnline);
