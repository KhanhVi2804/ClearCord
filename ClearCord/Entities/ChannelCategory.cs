namespace ClearCord.Entities;

public sealed class ChannelCategory
{
    public Guid Id { get; set; }
    public Guid ServerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Position { get; set; }

    public Server Server { get; set; } = null!;
    public ICollection<Channel> Channels { get; set; } = new List<Channel>();
}
