namespace ClearCord.Entities;

public sealed class ServerMember
{
    public Guid Id { get; set; }
    public Guid ServerId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;

    public Server Server { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
