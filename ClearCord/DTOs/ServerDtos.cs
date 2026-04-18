using ClearCord.Enums;
using System.ComponentModel.DataAnnotations;

namespace ClearCord.DTOs;

public sealed record CreateServerRequest(
    [param: Required, MaxLength(80)] string Name,
    [param: MaxLength(250)] string? Description);

public sealed record UpdateServerRequest(
    [param: Required, MaxLength(80)] string Name,
    [param: MaxLength(250)] string? Description);

public sealed record JoinServerRequest(
    [param: Required, MaxLength(32)] string InviteCode);

public sealed record CreateServerRoleRequest(
    [param: Required, MaxLength(50)] string Name,
    [param: Required, MaxLength(7)] string ColorHex,
    IReadOnlyCollection<PermissionType> Permissions,
    bool IsDefault = false);

public sealed record AssignServerRoleRequest(
    [param: Required] string UserId);

public sealed record ModerateMemberRequest(
    [param: MaxLength(200)] string? Reason);

public sealed record ServerRoleDto(
    Guid Id,
    string Name,
    string ColorHex,
    int Position,
    bool IsDefault,
    bool IsSystemRole,
    IReadOnlyCollection<PermissionType> Permissions);

public sealed record ServerMemberDto(
    string UserId,
    string UserName,
    string DisplayName,
    string? AvatarUrl,
    string? Nickname,
    IReadOnlyCollection<ServerRoleDto> Roles,
    DateTimeOffset JoinedAt);

public sealed record ServerInviteDto(
    string InviteCode,
    string InviteUrl);

public sealed record ServerSummaryDto(
    Guid Id,
    string Name,
    string? Description,
    string InviteCode,
    string? IconUrl,
    int MemberCount);

public sealed record ServerDetailsDto(
    Guid Id,
    string Name,
    string? Description,
    string InviteCode,
    string? IconUrl,
    string OwnerId,
    IReadOnlyCollection<ServerMemberDto> Members,
    IReadOnlyCollection<ServerRoleDto> Roles,
    IReadOnlyCollection<ChannelCategoryDto> Categories,
    IReadOnlyCollection<ChannelDto> Channels);
