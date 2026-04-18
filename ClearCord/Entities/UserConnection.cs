namespace ClearCord.Entities;

public sealed class UserConnection
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public DateTimeOffset ConnectedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}
