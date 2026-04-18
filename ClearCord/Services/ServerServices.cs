using ClearCord.Common.Exceptions;
using ClearCord.Common.Extensions;
using ClearCord.Configuration;
using ClearCord.DTOs;
using ClearCord.Entities;
using ClearCord.Enums;
using ClearCord.Repositories;
using Microsoft.Extensions.Options;

namespace ClearCord.Services;

public sealed class ServerPermissionService(IServerRepository serverRepository) : IServerPermissionService
{
    public async Task<bool> HasPermissionAsync(Guid serverId, string userId, PermissionType permission, CancellationToken cancellationToken = default)
    {
        var server = await serverRepository.GetDetailedByIdAsync(serverId, cancellationToken);
        if (server is null)
        {
            return false;
        }

        if (server.OwnerId == userId)
        {
            return true;
        }

        var isMember = server.Members.Any(member => member.UserId == userId);
        if (!isMember)
        {
            return false;
        }

        return server.Roles.Any(role =>
            role.Assignments.Any(assignment => assignment.UserId == userId) &&
            role.Permissions.Any(rolePermission => rolePermission.Permission == permission));
    }

    public async Task EnsurePermissionAsync(Guid serverId, string userId, PermissionType permission, CancellationToken cancellationToken = default)
    {
        if (!await HasPermissionAsync(serverId, userId, permission, cancellationToken))
        {
            throw new ApiException("You do not have permission to perform this action.", StatusCodes.Status403Forbidden);
        }
    }
}

public sealed class ServerService(
    IServerRepository serverRepository,
    IChannelRepository channelRepository,
    IServerPermissionService permissionService,
    INotificationService notificationService,
    IUnitOfWork unitOfWork,
    IOptions<JwtSettings> jwtOptions) : IServerService
{
    private static readonly PermissionType[] MemberPermissions =
    [
        PermissionType.ViewChannels,
        PermissionType.SendMessages,
        PermissionType.ConnectToVoice
    ];

    private static readonly PermissionType[] ModeratorPermissions =
    [
        PermissionType.ViewChannels,
        PermissionType.SendMessages,
        PermissionType.ConnectToVoice,
        PermissionType.ManageMessages,
        PermissionType.PinMessages,
        PermissionType.ModerateVoice,
        PermissionType.KickMembers
    ];

    private static readonly PermissionType[] AdminPermissions =
    [
        PermissionType.ViewChannels,
        PermissionType.SendMessages,
        PermissionType.ConnectToVoice,
        PermissionType.ManageMessages,
        PermissionType.PinMessages,
        PermissionType.ModerateVoice,
        PermissionType.ManageChannels,
        PermissionType.ManageRoles,
        PermissionType.KickMembers,
        PermissionType.BanMembers,
        PermissionType.ManageServer
    ];

    private readonly JwtSettings _jwtSettings = jwtOptions.Value;

    public async Task<ServerSummaryDto> CreateAsync(string ownerId, CreateServerRequest request, CancellationToken cancellationToken = default)
    {
        var serverId = Guid.NewGuid();
        var server = new Server
        {
            Id = serverId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            InviteCode = Guid.NewGuid().ToString("N")[..10],
            OwnerId = ownerId
        };

        var ownerMembership = new ServerMember
        {
            Id = Guid.NewGuid(),
            ServerId = serverId,
            UserId = ownerId
        };

        var memberRole = CreateRole(serverId, "Member", "#64748B", 10, true, true, MemberPermissions);
        var moderatorRole = CreateRole(serverId, "Moderator", "#0EA5E9", 20, false, true, ModeratorPermissions);
        var adminRole = CreateRole(serverId, "Admin", "#EF4444", 30, false, true, AdminPermissions);

        adminRole.Assignments.Add(new ServerRoleAssignment
        {
            Id = Guid.NewGuid(),
            ServerRoleId = adminRole.Id,
            UserId = ownerId
        });

        server.Members.Add(ownerMembership);
        server.Roles.Add(memberRole);
        server.Roles.Add(moderatorRole);
        server.Roles.Add(adminRole);

        var lobbyCategory = new ChannelCategory
        {
            Id = Guid.NewGuid(),
            ServerId = serverId,
            Name = "Lobby",
            Position = 1
        };

        var generalText = new Channel
        {
            Id = Guid.NewGuid(),
            ServerId = serverId,
            CategoryId = lobbyCategory.Id,
            Name = "general",
            Topic = "General discussion",
            Type = ChannelType.Text,
            Position = 1
        };

        var generalVoice = new Channel
        {
            Id = Guid.NewGuid(),
            ServerId = serverId,
            CategoryId = lobbyCategory.Id,
            Name = "voice-lounge",
            Topic = "Open voice hangout",
            Type = ChannelType.Voice,
            Position = 2
        };

        await serverRepository.AddAsync(server, cancellationToken);
        await channelRepository.AddCategoryAsync(lobbyCategory, cancellationToken);
        await channelRepository.AddChannelAsync(generalText, cancellationToken);
        await channelRepository.AddChannelAsync(generalVoice, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return server.ToServerSummaryDto();
    }

    public async Task<IReadOnlyCollection<ServerSummaryDto>> GetForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        var servers = await serverRepository.GetForUserAsync(userId, cancellationToken);
        return servers.Select(server => server.ToServerSummaryDto()).ToArray();
    }

    public async Task<ServerDetailsDto> GetDetailsAsync(Guid serverId, string userId, CancellationToken cancellationToken = default)
    {
        var server = await RequireServerAccessAsync(serverId, userId, cancellationToken);
        var roles = server.Roles.OrderByDescending(role => role.Position).ToArray();

        return new ServerDetailsDto(
            server.Id,
            server.Name,
            server.Description,
            server.InviteCode,
            server.IconUrl,
            server.OwnerId,
            server.Members
                .OrderBy(member => member.User.DisplayName)
                .Select(member => member.ToServerMemberDto(roles))
                .ToArray(),
            roles.Select(role => role.ToServerRoleDto()).ToArray(),
            server.Categories.OrderBy(category => category.Position).Select(category => category.ToCategoryDto()).ToArray(),
            server.Channels.OrderBy(channel => channel.Position).Select(channel => channel.ToChannelDto()).ToArray());
    }

    public async Task<ServerSummaryDto> UpdateAsync(Guid serverId, string userId, UpdateServerRequest request, CancellationToken cancellationToken = default)
    {
        await permissionService.EnsurePermissionAsync(serverId, userId, PermissionType.ManageServer, cancellationToken);

        var server = await serverRepository.GetByIdAsync(serverId, cancellationToken)
            ?? throw new ApiException("Server was not found.", StatusCodes.Status404NotFound);

        server.Name = request.Name.Trim();
        server.Description = request.Description?.Trim();
        server.UpdatedAt = DateTimeOffset.UtcNow;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return server.ToServerSummaryDto();
    }

    public async Task DeleteAsync(Guid serverId, string userId, CancellationToken cancellationToken = default)
    {
        var server = await serverRepository.GetByIdAsync(serverId, cancellationToken)
            ?? throw new ApiException("Server was not found.", StatusCodes.Status404NotFound);

        if (server.OwnerId != userId)
        {
            throw new ApiException("Only the server owner can delete the server.", StatusCodes.Status403Forbidden);
        }

        serverRepository.RemoveServer(server);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<ServerSummaryDto> JoinAsync(string userId, JoinServerRequest request, CancellationToken cancellationToken = default)
    {
        var server = await serverRepository.GetByInviteCodeAsync(request.InviteCode.Trim(), cancellationToken)
            ?? throw new ApiException("Invite code is invalid.", StatusCodes.Status404NotFound);

        if (await serverRepository.GetBanAsync(server.Id, userId, cancellationToken) is not null)
        {
            throw new ApiException("You are banned from this server.", StatusCodes.Status403Forbidden);
        }

        if (server.Members.Any(member => member.UserId == userId))
        {
            throw new ApiException("You have already joined this server.");
        }

        var newMember = new ServerMember
        {
            Id = Guid.NewGuid(),
            ServerId = server.Id,
            UserId = userId
        };

        await serverRepository.AddMemberAsync(newMember, cancellationToken);
        server.Members.Add(newMember);

        var defaultRole = server.Roles.FirstOrDefault(role => role.IsDefault) ?? await serverRepository.GetDefaultRoleAsync(server.Id, cancellationToken);
        if (defaultRole is not null)
        {
            await serverRepository.AddRoleAssignmentAsync(new ServerRoleAssignment
            {
                Id = Guid.NewGuid(),
                ServerRoleId = defaultRole.Id,
                UserId = userId
            }, cancellationToken);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        foreach (var memberId in server.Members.Where(member => member.UserId != userId).Select(member => member.UserId).Distinct())
        {
            await notificationService.NotifyAsync(
                memberId,
                NotificationType.ServerEvent,
                "Server member joined",
                "A new member joined your server.",
                nameof(Server),
                server.Id.ToString(),
                cancellationToken);
        }

        return server.ToServerSummaryDto();
    }

    public async Task LeaveAsync(Guid serverId, string userId, CancellationToken cancellationToken = default)
    {
        var server = await RequireServerAccessAsync(serverId, userId, cancellationToken);
        if (server.OwnerId == userId)
        {
            throw new ApiException("The server owner cannot leave. Delete the server or transfer ownership first.");
        }

        var member = server.Members.First(member => member.UserId == userId);
        serverRepository.RemoveMember(member);

        var assignments = server.Roles.SelectMany(role => role.Assignments).Where(assignment => assignment.UserId == userId).ToArray();
        if (assignments.Length > 0)
        {
            serverRepository.RemoveRoleAssignments(assignments);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<ServerMemberDto>> GetMembersAsync(Guid serverId, string userId, CancellationToken cancellationToken = default)
    {
        var server = await RequireServerAccessAsync(serverId, userId, cancellationToken);
        var roles = server.Roles.OrderByDescending(role => role.Position).ToArray();

        return server.Members
            .OrderBy(member => member.User.DisplayName)
            .Select(member => member.ToServerMemberDto(roles))
            .ToArray();
    }

    public async Task<ServerInviteDto> GetInviteAsync(Guid serverId, string userId, CancellationToken cancellationToken = default)
    {
        var server = await RequireServerAccessAsync(serverId, userId, cancellationToken);
        var inviteUrl = $"{_jwtSettings.ClientAppBaseUrl.TrimEnd('/')}/invite/{server.InviteCode}";
        return new ServerInviteDto(server.InviteCode, inviteUrl);
    }

    public async Task<ServerRoleDto> CreateRoleAsync(Guid serverId, string userId, CreateServerRoleRequest request, CancellationToken cancellationToken = default)
    {
        await permissionService.EnsurePermissionAsync(serverId, userId, PermissionType.ManageRoles, cancellationToken);

        var roles = await serverRepository.GetRolesAsync(serverId, cancellationToken);
        if (roles.Any(role => role.Name.Equals(request.Name.Trim(), StringComparison.OrdinalIgnoreCase)))
        {
            throw new ApiException("A role with the same name already exists.");
        }

        if (request.IsDefault)
        {
            foreach (var existingRole in roles.Where(existingRole => existingRole.IsDefault))
            {
                existingRole.IsDefault = false;
            }
        }

        var role = CreateRole(
            serverId,
            request.Name.Trim(),
            request.ColorHex,
            roles.Count == 0 ? 1 : roles.Max(existingRole => existingRole.Position) + 10,
            request.IsDefault,
            false,
            request.Permissions.Distinct().ToArray());

        await serverRepository.AddRoleAsync(role, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return role.ToServerRoleDto();
    }

    public async Task AssignRoleAsync(Guid serverId, Guid roleId, string actingUserId, AssignServerRoleRequest request, CancellationToken cancellationToken = default)
    {
        await permissionService.EnsurePermissionAsync(serverId, actingUserId, PermissionType.ManageRoles, cancellationToken);

        var server = await RequireServerAccessAsync(serverId, actingUserId, cancellationToken);
        var role = server.Roles.FirstOrDefault(existingRole => existingRole.Id == roleId)
            ?? throw new ApiException("Role was not found.", StatusCodes.Status404NotFound);

        if (server.Members.All(member => member.UserId != request.UserId))
        {
            throw new ApiException("Target user is not a member of this server.", StatusCodes.Status404NotFound);
        }

        if (role.Assignments.All(assignment => assignment.UserId != request.UserId))
        {
            await serverRepository.AddRoleAssignmentAsync(new ServerRoleAssignment
            {
                Id = Guid.NewGuid(),
                ServerRoleId = role.Id,
                UserId = request.UserId
            }, cancellationToken);

            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task KickMemberAsync(Guid serverId, string targetUserId, string actingUserId, ModerateMemberRequest request, CancellationToken cancellationToken = default)
    {
        await permissionService.EnsurePermissionAsync(serverId, actingUserId, PermissionType.KickMembers, cancellationToken);
        var server = await RequireServerAccessAsync(serverId, actingUserId, cancellationToken);

        if (server.OwnerId == targetUserId)
        {
            throw new ApiException("The server owner cannot be kicked.", StatusCodes.Status403Forbidden);
        }

        if (targetUserId == actingUserId)
        {
            throw new ApiException("Use the leave server endpoint to leave the server.");
        }

        var member = server.Members.FirstOrDefault(existingMember => existingMember.UserId == targetUserId)
            ?? throw new ApiException("Member was not found.", StatusCodes.Status404NotFound);

        serverRepository.RemoveMember(member);
        var assignments = server.Roles.SelectMany(role => role.Assignments).Where(assignment => assignment.UserId == targetUserId).ToArray();
        if (assignments.Length > 0)
        {
            serverRepository.RemoveRoleAssignments(assignments);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        await notificationService.NotifyAsync(
            targetUserId,
            NotificationType.ServerEvent,
            "Removed from server",
            request.Reason is null ? "You were removed from a server." : $"You were removed from a server. Reason: {request.Reason}",
            nameof(Server),
            serverId.ToString(),
            cancellationToken);
    }

    public async Task BanMemberAsync(Guid serverId, string targetUserId, string actingUserId, ModerateMemberRequest request, CancellationToken cancellationToken = default)
    {
        await permissionService.EnsurePermissionAsync(serverId, actingUserId, PermissionType.BanMembers, cancellationToken);
        var server = await RequireServerAccessAsync(serverId, actingUserId, cancellationToken);

        if (server.OwnerId == targetUserId)
        {
            throw new ApiException("The server owner cannot be banned.", StatusCodes.Status403Forbidden);
        }

        if (targetUserId == actingUserId)
        {
            throw new ApiException("You cannot ban yourself.");
        }

        if (await serverRepository.GetBanAsync(serverId, targetUserId, cancellationToken) is not null)
        {
            throw new ApiException("User is already banned from this server.");
        }

        var member = server.Members.FirstOrDefault(existingMember => existingMember.UserId == targetUserId);
        if (member is not null)
        {
            serverRepository.RemoveMember(member);
        }

        var assignments = server.Roles.SelectMany(role => role.Assignments).Where(assignment => assignment.UserId == targetUserId).ToArray();
        if (assignments.Length > 0)
        {
            serverRepository.RemoveRoleAssignments(assignments);
        }

        await serverRepository.AddBanAsync(new ServerBan
        {
            Id = Guid.NewGuid(),
            ServerId = serverId,
            UserId = targetUserId,
            BannedByUserId = actingUserId,
            Reason = request.Reason?.Trim()
        }, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        await notificationService.NotifyAsync(
            targetUserId,
            NotificationType.ServerEvent,
            "Banned from server",
            request.Reason is null ? "You were banned from a server." : $"You were banned from a server. Reason: {request.Reason}",
            nameof(Server),
            serverId.ToString(),
            cancellationToken);
    }

    private async Task<Server> RequireServerAccessAsync(Guid serverId, string userId, CancellationToken cancellationToken)
    {
        var server = await serverRepository.GetDetailedByIdAsync(serverId, cancellationToken)
            ?? throw new ApiException("Server was not found.", StatusCodes.Status404NotFound);

        if (server.OwnerId != userId && server.Members.All(member => member.UserId != userId))
        {
            throw new ApiException("You are not a member of this server.", StatusCodes.Status403Forbidden);
        }

        return server;
    }

    private static ServerRole CreateRole(
        Guid serverId,
        string name,
        string colorHex,
        int position,
        bool isDefault,
        bool isSystemRole,
        IReadOnlyCollection<PermissionType> permissions)
    {
        var role = new ServerRole
        {
            Id = Guid.NewGuid(),
            ServerId = serverId,
            Name = name,
            ColorHex = colorHex,
            Position = position,
            IsDefault = isDefault,
            IsSystemRole = isSystemRole
        };

        foreach (var permission in permissions)
        {
            role.Permissions.Add(new ServerRolePermission
            {
                Id = Guid.NewGuid(),
                ServerRoleId = role.Id,
                Permission = permission
            });
        }

        return role;
    }
}
