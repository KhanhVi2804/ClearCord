namespace ClearCord.Entities;

public sealed class DirectConversation
{
    public Guid Id { get; set; }
    public string UserAId { get; set; } = string.Empty;
    public string UserBId { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastActivityAt { get; set; } = DateTimeOffset.UtcNow;

    public ApplicationUser UserA { get; set; } = null!;
    public ApplicationUser UserB { get; set; } = null!;
    public ICollection<Message> Messages { get; set; } = new List<Message>();
    public ICollection<DirectVoiceParticipant> VoiceParticipants { get; set; } = new List<DirectVoiceParticipant>();

    public bool HasParticipant(string userId)
    {
        return UserAId == userId || UserBId == userId;
    }

    public string GetOtherUserId(string userId)
    {
        return UserAId == userId ? UserBId : UserAId;
    }
}
