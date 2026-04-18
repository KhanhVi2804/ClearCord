using ClearCord.Data;
using ClearCord.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClearCord.Repositories;

public sealed class UserRepository(ApplicationDbContext dbContext) : IUserRepository
{
    public async Task<ApplicationUser?> GetByIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Users.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<ApplicationUser>> SearchAsync(string term, string currentUserId, CancellationToken cancellationToken = default)
    {
        var normalizedTerm = term.Trim();

        return await dbContext.Users
            .Where(user => user.Id != currentUserId &&
                (user.UserName!.Contains(normalizedTerm) ||
                 user.DisplayName.Contains(normalizedTerm) ||
                 user.Email!.Contains(normalizedTerm)))
            .OrderBy(user => user.DisplayName)
            .Take(20)
            .ToListAsync(cancellationToken);
    }
}

public sealed class FriendRepository(ApplicationDbContext dbContext) : IFriendRepository
{
    public async Task<FriendRequest?> GetByIdAsync(Guid requestId, CancellationToken cancellationToken = default)
    {
        return await dbContext.FriendRequests
            .Include(request => request.Requester)
            .Include(request => request.Addressee)
            .FirstOrDefaultAsync(request => request.Id == requestId, cancellationToken);
    }

    public async Task<FriendRequest?> GetBetweenUsersAsync(string userId, string otherUserId, CancellationToken cancellationToken = default)
    {
        return await dbContext.FriendRequests
            .Include(request => request.Requester)
            .Include(request => request.Addressee)
            .FirstOrDefaultAsync(
                request => (request.RequesterId == userId && request.AddresseeId == otherUserId) ||
                           (request.RequesterId == otherUserId && request.AddresseeId == userId),
                cancellationToken);
    }

    public async Task<IReadOnlyCollection<FriendRequest>> GetPendingForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await dbContext.FriendRequests
            .Include(request => request.Requester)
            .Include(request => request.Addressee)
            .Where(request => request.AddresseeId == userId && request.Status == Enums.FriendRequestStatus.Pending)
            .OrderByDescending(request => request.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<FriendRequest>> GetAcceptedForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await dbContext.FriendRequests
            .Include(request => request.Requester)
            .Include(request => request.Addressee)
            .Where(request =>
                (request.RequesterId == userId || request.AddresseeId == userId) &&
                request.Status == Enums.FriendRequestStatus.Accepted)
            .OrderByDescending(request => request.RespondedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(FriendRequest request, CancellationToken cancellationToken = default)
    {
        await dbContext.FriendRequests.AddAsync(request, cancellationToken);
    }

    public void Remove(FriendRequest request)
    {
        dbContext.FriendRequests.Remove(request);
    }
}

public sealed class ServerRepository(ApplicationDbContext dbContext) : IServerRepository
{
    public async Task AddAsync(Server server, CancellationToken cancellationToken = default)
    {
        await dbContext.Servers.AddAsync(server, cancellationToken);
    }

    public async Task<Server?> GetByIdAsync(Guid serverId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Servers
            .Include(server => server.Members)
            .FirstOrDefaultAsync(server => server.Id == serverId, cancellationToken);
    }

    public async Task<Server?> GetDetailedByIdAsync(Guid serverId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Servers
            .AsSplitQuery()
            .Include(server => server.Owner)
            .Include(server => server.Members)
                .ThenInclude(member => member.User)
            .Include(server => server.Roles)
                .ThenInclude(role => role.Permissions)
            .Include(server => server.Roles)
                .ThenInclude(role => role.Assignments)
            .Include(server => server.Categories)
            .Include(server => server.Channels)
            .FirstOrDefaultAsync(server => server.Id == serverId, cancellationToken);
    }

    public async Task<Server?> GetByInviteCodeAsync(string inviteCode, CancellationToken cancellationToken = default)
    {
        return await dbContext.Servers
            .Include(server => server.Members)
            .Include(server => server.Roles)
                .ThenInclude(role => role.Permissions)
            .FirstOrDefaultAsync(server => server.InviteCode == inviteCode, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Server>> GetForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Servers
            .Include(server => server.Members)
            .Where(server => server.OwnerId == userId || server.Members.Any(member => member.UserId == userId))
            .OrderBy(server => server.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<ServerMember?> GetMemberAsync(Guid serverId, string userId, CancellationToken cancellationToken = default)
    {
        return await dbContext.ServerMembers
            .Include(member => member.User)
            .FirstOrDefaultAsync(member => member.ServerId == serverId && member.UserId == userId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<ServerMember>> GetMembersAsync(Guid serverId, CancellationToken cancellationToken = default)
    {
        return await dbContext.ServerMembers
            .Include(member => member.User)
            .Where(member => member.ServerId == serverId)
            .OrderBy(member => member.User.DisplayName)
            .ToListAsync(cancellationToken);
    }

    public async Task<ServerRole?> GetRoleAsync(Guid roleId, CancellationToken cancellationToken = default)
    {
        return await dbContext.ServerRoles
            .Include(role => role.Permissions)
            .Include(role => role.Assignments)
            .FirstOrDefaultAsync(role => role.Id == roleId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<ServerRole>> GetRolesAsync(Guid serverId, CancellationToken cancellationToken = default)
    {
        return await dbContext.ServerRoles
            .Include(role => role.Permissions)
            .Include(role => role.Assignments)
            .Where(role => role.ServerId == serverId)
            .OrderByDescending(role => role.Position)
            .ToListAsync(cancellationToken);
    }

    public async Task<ServerRole?> GetDefaultRoleAsync(Guid serverId, CancellationToken cancellationToken = default)
    {
        return await dbContext.ServerRoles
            .Include(role => role.Permissions)
            .FirstOrDefaultAsync(role => role.ServerId == serverId && role.IsDefault, cancellationToken);
    }

    public async Task<ServerBan?> GetBanAsync(Guid serverId, string userId, CancellationToken cancellationToken = default)
    {
        return await dbContext.ServerBans
            .FirstOrDefaultAsync(ban => ban.ServerId == serverId && ban.UserId == userId, cancellationToken);
    }

    public async Task AddMemberAsync(ServerMember member, CancellationToken cancellationToken = default)
    {
        await dbContext.ServerMembers.AddAsync(member, cancellationToken);
    }

    public async Task AddRoleAsync(ServerRole role, CancellationToken cancellationToken = default)
    {
        await dbContext.ServerRoles.AddAsync(role, cancellationToken);
    }

    public async Task AddRoleAssignmentAsync(ServerRoleAssignment assignment, CancellationToken cancellationToken = default)
    {
        await dbContext.ServerRoleAssignments.AddAsync(assignment, cancellationToken);
    }

    public async Task AddBanAsync(ServerBan ban, CancellationToken cancellationToken = default)
    {
        await dbContext.ServerBans.AddAsync(ban, cancellationToken);
    }

    public void RemoveMember(ServerMember member)
    {
        dbContext.ServerMembers.Remove(member);
    }

    public void RemoveRoleAssignments(IEnumerable<ServerRoleAssignment> assignments)
    {
        dbContext.ServerRoleAssignments.RemoveRange(assignments);
    }

    public void RemoveServer(Server server)
    {
        dbContext.Servers.Remove(server);
    }
}

public sealed class ChannelRepository(ApplicationDbContext dbContext) : IChannelRepository
{
    public async Task<Channel?> GetByIdAsync(Guid channelId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Channels
            .Include(channel => channel.Server)
            .Include(channel => channel.Category)
            .FirstOrDefaultAsync(channel => channel.Id == channelId, cancellationToken);
    }

    public async Task<ChannelCategory?> GetCategoryByIdAsync(Guid categoryId, CancellationToken cancellationToken = default)
    {
        return await dbContext.ChannelCategories
            .Include(category => category.Server)
            .FirstOrDefaultAsync(category => category.Id == categoryId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Channel>> GetByServerAsync(Guid serverId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Channels
            .Where(channel => channel.ServerId == serverId)
            .OrderBy(channel => channel.Position)
            .ThenBy(channel => channel.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<ChannelCategory>> GetCategoriesByServerAsync(Guid serverId, CancellationToken cancellationToken = default)
    {
        return await dbContext.ChannelCategories
            .Where(category => category.ServerId == serverId)
            .OrderBy(category => category.Position)
            .ThenBy(category => category.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task AddChannelAsync(Channel channel, CancellationToken cancellationToken = default)
    {
        await dbContext.Channels.AddAsync(channel, cancellationToken);
    }

    public async Task AddCategoryAsync(ChannelCategory category, CancellationToken cancellationToken = default)
    {
        await dbContext.ChannelCategories.AddAsync(category, cancellationToken);
    }

    public void RemoveChannel(Channel channel)
    {
        dbContext.Channels.Remove(channel);
    }

    public void RemoveCategory(ChannelCategory category)
    {
        dbContext.ChannelCategories.Remove(category);
    }
}

public sealed class MessageRepository(ApplicationDbContext dbContext) : IMessageRepository
{
    public async Task<Message?> GetByIdAsync(Guid messageId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Messages
            .AsSplitQuery()
            .Include(message => message.Sender)
            .Include(message => message.Channel)
            .Include(message => message.Attachments)
            .Include(message => message.Reactions)
                .ThenInclude(reaction => reaction.User)
            .Include(message => message.ReplyToMessage)
                .ThenInclude(reply => reply!.Sender)
            .FirstOrDefaultAsync(message => message.Id == messageId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Message>> GetChannelMessagesAsync(Guid channelId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        return await dbContext.Messages
            .AsSplitQuery()
            .Include(message => message.Sender)
            .Include(message => message.Attachments)
            .Include(message => message.Reactions)
                .ThenInclude(reaction => reaction.User)
            .Include(message => message.ReplyToMessage)
                .ThenInclude(reply => reply!.Sender)
            .Where(message => message.ChannelId == channelId)
            .OrderByDescending(message => message.CreatedAt)
            .Skip(Math.Max(0, page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    public async Task<MessageReaction?> GetReactionAsync(Guid messageId, string userId, string emoji, CancellationToken cancellationToken = default)
    {
        return await dbContext.MessageReactions
            .FirstOrDefaultAsync(
                reaction => reaction.MessageId == messageId &&
                            reaction.UserId == userId &&
                            reaction.Emoji == emoji,
                cancellationToken);
    }

    public async Task AddMessageAsync(Message message, CancellationToken cancellationToken = default)
    {
        await dbContext.Messages.AddAsync(message, cancellationToken);
    }

    public async Task AddReactionAsync(MessageReaction reaction, CancellationToken cancellationToken = default)
    {
        await dbContext.MessageReactions.AddAsync(reaction, cancellationToken);
    }

    public void RemoveReaction(MessageReaction reaction)
    {
        dbContext.MessageReactions.Remove(reaction);
    }
}

public sealed class NotificationRepository(ApplicationDbContext dbContext) : INotificationRepository
{
    public async Task<IReadOnlyCollection<UserNotification>> GetForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Notifications
            .Where(notification => notification.UserId == userId)
            .OrderByDescending(notification => notification.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<UserNotification?> GetByIdAsync(Guid notificationId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Notifications.FirstOrDefaultAsync(notification => notification.Id == notificationId, cancellationToken);
    }

    public async Task AddAsync(UserNotification notification, CancellationToken cancellationToken = default)
    {
        await dbContext.Notifications.AddAsync(notification, cancellationToken);
    }

    public async Task AddRangeAsync(IEnumerable<UserNotification> notifications, CancellationToken cancellationToken = default)
    {
        await dbContext.Notifications.AddRangeAsync(notifications, cancellationToken);
    }
}

public sealed class VoiceStateRepository(ApplicationDbContext dbContext) : IVoiceStateRepository
{
    public async Task<VoiceChannelParticipant?> GetParticipantAsync(Guid channelId, string userId, string connectionId, CancellationToken cancellationToken = default)
    {
        return await dbContext.VoiceChannelParticipants
            .Include(participant => participant.User)
            .FirstOrDefaultAsync(
                participant => participant.ChannelId == channelId &&
                               participant.UserId == userId &&
                               participant.ConnectionId == connectionId,
                cancellationToken);
    }

    public async Task<IReadOnlyCollection<VoiceChannelParticipant>> GetParticipantsAsync(Guid channelId, CancellationToken cancellationToken = default)
    {
        return await dbContext.VoiceChannelParticipants
            .Include(participant => participant.User)
            .Where(participant => participant.ChannelId == channelId)
            .OrderBy(participant => participant.JoinedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<VoiceChannelParticipant>> GetByConnectionAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        return await dbContext.VoiceChannelParticipants
            .Include(participant => participant.User)
            .Where(participant => participant.ConnectionId == connectionId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(VoiceChannelParticipant participant, CancellationToken cancellationToken = default)
    {
        await dbContext.VoiceChannelParticipants.AddAsync(participant, cancellationToken);
    }

    public void Remove(VoiceChannelParticipant participant)
    {
        dbContext.VoiceChannelParticipants.Remove(participant);
    }

    public void RemoveRange(IEnumerable<VoiceChannelParticipant> participants)
    {
        dbContext.VoiceChannelParticipants.RemoveRange(participants);
    }
}

public sealed class ConnectionRepository(ApplicationDbContext dbContext) : IConnectionRepository
{
    public async Task<UserConnection?> GetByConnectionIdAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        return await dbContext.UserConnections.FirstOrDefaultAsync(connection => connection.ConnectionId == connectionId, cancellationToken);
    }

    public async Task<int> GetCountByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await dbContext.UserConnections.CountAsync(connection => connection.UserId == userId, cancellationToken);
    }

    public async Task AddAsync(UserConnection connection, CancellationToken cancellationToken = default)
    {
        await dbContext.UserConnections.AddAsync(connection, cancellationToken);
    }

    public void Remove(UserConnection connection)
    {
        dbContext.UserConnections.Remove(connection);
    }
}

public sealed class RevokedTokenRepository(ApplicationDbContext dbContext) : IRevokedTokenRepository
{
    public async Task<bool> IsRevokedAsync(string jti, CancellationToken cancellationToken = default)
    {
        return await dbContext.RevokedTokens.AnyAsync(token => token.Jti == jti, cancellationToken);
    }

    public async Task AddAsync(RevokedToken token, CancellationToken cancellationToken = default)
    {
        await dbContext.RevokedTokens.AddAsync(token, cancellationToken);
    }
}
