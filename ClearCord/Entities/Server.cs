namespace ClearCord.Entities;

public sealed class Server
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string InviteCode { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string? IconUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ApplicationUser Owner { get; set; } = null!;
    public ICollection<ServerMember> Members { get; set; } = new List<ServerMember>();
    public ICollection<ServerRole> Roles { get; set; } = new List<ServerRole>();
    public ICollection<ChannelCategory> Categories { get; set; } = new List<ChannelCategory>();
    public ICollection<Channel> Channels { get; set; } = new List<Channel>();
    public ICollection<ServerBan> Bans { get; set; } = new List<ServerBan>();
}
