namespace ClearCord.Entities;

public sealed class ServerBan
{
    public Guid Id { get; set; }
    public Guid ServerId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string BannedByUserId { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Server Server { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
    public ApplicationUser BannedByUser { get; set; } = null!;
}
