namespace ClearCord.Entities;

public sealed class DirectVoiceParticipant
{
    public Guid Id { get; set; }
    public Guid DirectConversationId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public bool IsMuted { get; set; }
    public bool IsCameraEnabled { get; set; }
    public bool IsScreenSharing { get; set; }
    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastUpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DirectConversation DirectConversation { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
