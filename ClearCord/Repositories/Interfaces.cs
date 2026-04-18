using ClearCord.Entities;

namespace ClearCord.Repositories;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface IUserRepository
{
    Task<ApplicationUser?> GetByIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<ApplicationUser>> SearchAsync(string term, string currentUserId, CancellationToken cancellationToken = default);
}

public interface IFriendRepository
{
    Task<FriendRequest?> GetByIdAsync(Guid requestId, CancellationToken cancellationToken = default);
    Task<FriendRequest?> GetBetweenUsersAsync(string userId, string otherUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<FriendRequest>> GetPendingForUserAsync(string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<FriendRequest>> GetAcceptedForUserAsync(string userId, CancellationToken cancellationToken = default);
    Task AddAsync(FriendRequest request, CancellationToken cancellationToken = default);
    void Remove(FriendRequest request);
}

public interface IServerRepository
{
    Task AddAsync(Server server, CancellationToken cancellationToken = default);
    Task<Server?> GetByIdAsync(Guid serverId, CancellationToken cancellationToken = default);
    Task<Server?> GetDetailedByIdAsync(Guid serverId, CancellationToken cancellationToken = default);
    Task<Server?> GetByInviteCodeAsync(string inviteCode, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<Server>> GetForUserAsync(string userId, CancellationToken cancellationToken = default);
    Task<ServerMember?> GetMemberAsync(Guid serverId, string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<ServerMember>> GetMembersAsync(Guid serverId, CancellationToken cancellationToken = default);
    Task<ServerRole?> GetRoleAsync(Guid roleId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<ServerRole>> GetRolesAsync(Guid serverId, CancellationToken cancellationToken = default);
    Task<ServerRole?> GetDefaultRoleAsync(Guid serverId, CancellationToken cancellationToken = default);
    Task<ServerBan?> GetBanAsync(Guid serverId, string userId, CancellationToken cancellationToken = default);
    Task AddMemberAsync(ServerMember member, CancellationToken cancellationToken = default);
    Task AddRoleAsync(ServerRole role, CancellationToken cancellationToken = default);
    Task AddRoleAssignmentAsync(ServerRoleAssignment assignment, CancellationToken cancellationToken = default);
    Task AddBanAsync(ServerBan ban, CancellationToken cancellationToken = default);
    void RemoveMember(ServerMember member);
    void RemoveRoleAssignments(IEnumerable<ServerRoleAssignment> assignments);
    void RemoveServer(Server server);
}

public interface IChannelRepository
{
    Task<Channel?> GetByIdAsync(Guid channelId, CancellationToken cancellationToken = default);
    Task<ChannelCategory?> GetCategoryByIdAsync(Guid categoryId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<Channel>> GetByServerAsync(Guid serverId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<ChannelCategory>> GetCategoriesByServerAsync(Guid serverId, CancellationToken cancellationToken = default);
    Task AddChannelAsync(Channel channel, CancellationToken cancellationToken = default);
    Task AddCategoryAsync(ChannelCategory category, CancellationToken cancellationToken = default);
    void RemoveChannel(Channel channel);
    void RemoveCategory(ChannelCategory category);
}

public interface IMessageRepository
{
    Task<Message?> GetByIdAsync(Guid messageId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<Message>> GetChannelMessagesAsync(Guid channelId, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<MessageReaction?> GetReactionAsync(Guid messageId, string userId, string emoji, CancellationToken cancellationToken = default);
    Task AddMessageAsync(Message message, CancellationToken cancellationToken = default);
    Task AddReactionAsync(MessageReaction reaction, CancellationToken cancellationToken = default);
    void RemoveReaction(MessageReaction reaction);
}

public interface INotificationRepository
{
    Task<IReadOnlyCollection<UserNotification>> GetForUserAsync(string userId, CancellationToken cancellationToken = default);
    Task<UserNotification?> GetByIdAsync(Guid notificationId, CancellationToken cancellationToken = default);
    Task AddAsync(UserNotification notification, CancellationToken cancellationToken = default);
    Task AddRangeAsync(IEnumerable<UserNotification> notifications, CancellationToken cancellationToken = default);
}

public interface IVoiceStateRepository
{
    Task<VoiceChannelParticipant?> GetParticipantAsync(Guid channelId, string userId, string connectionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<VoiceChannelParticipant>> GetParticipantsAsync(Guid channelId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<VoiceChannelParticipant>> GetByConnectionAsync(string connectionId, CancellationToken cancellationToken = default);
    Task AddAsync(VoiceChannelParticipant participant, CancellationToken cancellationToken = default);
    void Remove(VoiceChannelParticipant participant);
    void RemoveRange(IEnumerable<VoiceChannelParticipant> participants);
}

public interface IConnectionRepository
{
    Task<UserConnection?> GetByConnectionIdAsync(string connectionId, CancellationToken cancellationToken = default);
    Task<int> GetCountByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task AddAsync(UserConnection connection, CancellationToken cancellationToken = default);
    void Remove(UserConnection connection);
}

public interface IRevokedTokenRepository
{
    Task<bool> IsRevokedAsync(string jti, CancellationToken cancellationToken = default);
    Task AddAsync(RevokedToken token, CancellationToken cancellationToken = default);
}
