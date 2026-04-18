using ClearCord.DTOs;
using ClearCord.Entities;
using ClearCord.Enums;

namespace ClearCord.Services;

public interface ITokenService
{
    AuthResponse CreateToken(ApplicationUser user);
}

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task LogoutAsync(string userId, string jti, DateTimeOffset expiresAt, CancellationToken cancellationToken = default);
    Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default);
}

public interface IUserService
{
    Task<UserProfileDto> GetProfileAsync(string targetUserId, CancellationToken cancellationToken = default);
    Task<UserProfileDto> UpdateProfileAsync(string userId, UpdateProfileRequest request, CancellationToken cancellationToken = default);
    Task<UserProfileDto> UploadAvatarAsync(string userId, IFormFile avatar, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<UserSummaryDto>> SearchAsync(string currentUserId, string term, CancellationToken cancellationToken = default);
}

public interface IFriendService
{
    Task<FriendRequestDto> SendRequestAsync(string currentUserId, SendFriendRequestRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<FriendRequestDto>> GetPendingRequestsAsync(string currentUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<FriendDto>> GetFriendsAsync(string currentUserId, CancellationToken cancellationToken = default);
    Task<FriendRequestDto> AcceptAsync(string currentUserId, Guid requestId, CancellationToken cancellationToken = default);
    Task<FriendRequestDto> RejectAsync(string currentUserId, Guid requestId, CancellationToken cancellationToken = default);
    Task UnfriendAsync(string currentUserId, string friendUserId, CancellationToken cancellationToken = default);
}

public interface IServerPermissionService
{
    Task<bool> HasPermissionAsync(Guid serverId, string userId, PermissionType permission, CancellationToken cancellationToken = default);
    Task EnsurePermissionAsync(Guid serverId, string userId, PermissionType permission, CancellationToken cancellationToken = default);
}

public interface IServerService
{
    Task<ServerSummaryDto> CreateAsync(string ownerId, CreateServerRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<ServerSummaryDto>> GetForUserAsync(string userId, CancellationToken cancellationToken = default);
    Task<ServerDetailsDto> GetDetailsAsync(Guid serverId, string userId, CancellationToken cancellationToken = default);
    Task<ServerSummaryDto> UpdateAsync(Guid serverId, string userId, UpdateServerRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid serverId, string userId, CancellationToken cancellationToken = default);
    Task<ServerSummaryDto> JoinAsync(string userId, JoinServerRequest request, CancellationToken cancellationToken = default);
    Task LeaveAsync(Guid serverId, string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<ServerMemberDto>> GetMembersAsync(Guid serverId, string userId, CancellationToken cancellationToken = default);
    Task<ServerInviteDto> GetInviteAsync(Guid serverId, string userId, CancellationToken cancellationToken = default);
    Task<ServerRoleDto> CreateRoleAsync(Guid serverId, string userId, CreateServerRoleRequest request, CancellationToken cancellationToken = default);
    Task AssignRoleAsync(Guid serverId, Guid roleId, string actingUserId, AssignServerRoleRequest request, CancellationToken cancellationToken = default);
    Task KickMemberAsync(Guid serverId, string targetUserId, string actingUserId, ModerateMemberRequest request, CancellationToken cancellationToken = default);
    Task BanMemberAsync(Guid serverId, string targetUserId, string actingUserId, ModerateMemberRequest request, CancellationToken cancellationToken = default);
}

public interface IChannelService
{
    Task<ChannelCategoryDto> CreateCategoryAsync(Guid serverId, string userId, CreateCategoryRequest request, CancellationToken cancellationToken = default);
    Task<ChannelCategoryDto> UpdateCategoryAsync(Guid categoryId, string userId, UpdateCategoryRequest request, CancellationToken cancellationToken = default);
    Task DeleteCategoryAsync(Guid categoryId, string userId, CancellationToken cancellationToken = default);
    Task<ChannelDto> CreateChannelAsync(Guid serverId, string userId, CreateChannelRequest request, CancellationToken cancellationToken = default);
    Task<ChannelDto> UpdateChannelAsync(Guid channelId, string userId, UpdateChannelRequest request, CancellationToken cancellationToken = default);
    Task DeleteChannelAsync(Guid channelId, string userId, CancellationToken cancellationToken = default);
}

public interface IMessageService
{
    Task<IReadOnlyCollection<MessageDto>> GetChannelMessagesAsync(Guid channelId, string userId, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<MessageDto> CreateAsync(Guid channelId, string userId, string? content, Guid? replyToMessageId, IList<IFormFile>? files, CancellationToken cancellationToken = default);
    Task<MessageDto> UpdateAsync(Guid messageId, string userId, UpdateMessageRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid messageId, string userId, CancellationToken cancellationToken = default);
    Task<MessageDto> TogglePinAsync(Guid messageId, string userId, CancellationToken cancellationToken = default);
    Task<MessageDto> AddReactionAsync(Guid messageId, string userId, ToggleReactionRequest request, CancellationToken cancellationToken = default);
    Task<MessageDto> RemoveReactionAsync(Guid messageId, string userId, string emoji, CancellationToken cancellationToken = default);
}

public interface INotificationService
{
    Task<IReadOnlyCollection<NotificationDto>> GetForUserAsync(string userId, CancellationToken cancellationToken = default);
    Task MarkReadAsync(Guid notificationId, string userId, CancellationToken cancellationToken = default);
    Task MarkAllReadAsync(string userId, CancellationToken cancellationToken = default);
    Task NotifyAsync(string userId, NotificationType type, string title, string content, string? relatedEntityType = null, string? relatedEntityId = null, CancellationToken cancellationToken = default);
}

public interface IVoiceService
{
    Task<IReadOnlyCollection<VoiceParticipantDto>> GetParticipantsAsync(Guid channelId, string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<VoiceParticipantDto>> JoinAsync(Guid channelId, string userId, JoinVoiceChannelRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<VoiceParticipantDto>> LeaveAsync(Guid channelId, string userId, string connectionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<VoiceParticipantDto>> LeaveByConnectionAsync(string connectionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<VoiceParticipantDto>> UpdateStateAsync(Guid channelId, string userId, UpdateVoiceStateRequest request, CancellationToken cancellationToken = default);
}

public interface IConnectionService
{
    Task ConnectAsync(string userId, string connectionId, CancellationToken cancellationToken = default);
    Task DisconnectAsync(string connectionId, CancellationToken cancellationToken = default);
}

public sealed record StoredFileResult(
    string FileName,
    string StoredFileName,
    string ContentType,
    string Url,
    long SizeInBytes,
    bool IsImage);

public interface IFileStorageService
{
    Task<StoredFileResult> SaveAvatarAsync(IFormFile file, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<StoredFileResult>> SaveMessageFilesAsync(IList<IFormFile> files, CancellationToken cancellationToken = default);
}

public interface IRealtimeNotifier
{
    Task NotifyUserAsync(string userId, string eventName, object payload, CancellationToken cancellationToken = default);
    Task NotifyUsersAsync(IEnumerable<string> userIds, string eventName, object payload, CancellationToken cancellationToken = default);
    Task NotifyChannelAsync(Guid channelId, string eventName, object payload, CancellationToken cancellationToken = default);
    Task NotifyServerAsync(Guid serverId, string eventName, object payload, CancellationToken cancellationToken = default);
    Task NotifyPresenceChangedAsync(string userId, bool isOnline, DateTimeOffset? lastSeenAt, CancellationToken cancellationToken = default);
}
