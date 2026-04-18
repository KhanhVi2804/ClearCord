using Microsoft.AspNetCore.Identity;

namespace ClearCord.Entities;

public sealed class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public bool IsOnline { get; set; }
    public DateTimeOffset? LastSeenAt { get; set; }

    public ICollection<FriendRequest> SentFriendRequests { get; set; } = new List<FriendRequest>();
    public ICollection<FriendRequest> ReceivedFriendRequests { get; set; } = new List<FriendRequest>();
    public ICollection<ServerMember> ServerMemberships { get; set; } = new List<ServerMember>();
    public ICollection<ServerRoleAssignment> RoleAssignments { get; set; } = new List<ServerRoleAssignment>();
    public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    public ICollection<MessageReaction> MessageReactions { get; set; } = new List<MessageReaction>();
    public ICollection<UserNotification> Notifications { get; set; } = new List<UserNotification>();
    public ICollection<UserConnection> Connections { get; set; } = new List<UserConnection>();
    public ICollection<VoiceChannelParticipant> VoiceParticipations { get; set; } = new List<VoiceChannelParticipant>();
}
