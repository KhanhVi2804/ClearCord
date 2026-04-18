using ClearCord.Enums;

namespace ClearCord.Entities;

public sealed class Channel
{
    public Guid Id { get; set; }
    public Guid ServerId { get; set; }
    public Guid? CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Topic { get; set; }
    public ChannelType Type { get; set; } = ChannelType.Text;
    public int Position { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Server Server { get; set; } = null!;
    public ChannelCategory? Category { get; set; }
    public ICollection<Message> Messages { get; set; } = new List<Message>();
    public ICollection<VoiceChannelParticipant> VoiceParticipants { get; set; } = new List<VoiceChannelParticipant>();
}
