namespace ClearCord.Entities;

public sealed class VoiceChannelParticipant
{
    public Guid Id { get; set; }
    public Guid ChannelId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public bool IsMuted { get; set; }
    public bool IsCameraEnabled { get; set; }
    public bool IsScreenSharing { get; set; }
    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastUpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Channel Channel { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
