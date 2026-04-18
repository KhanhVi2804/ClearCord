namespace ClearCord.Entities;

public sealed class MessageReaction
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Message Message { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
