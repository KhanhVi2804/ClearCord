namespace ClearCord.Entities;

public sealed class Message
{
    public Guid Id { get; set; }
    public Guid ChannelId { get; set; }
    public string SenderId { get; set; } = string.Empty;
    public Guid? ReplyToMessageId { get; set; }
    public string? Content { get; set; }
    public bool IsEdited { get; set; }
    public bool IsDeleted { get; set; }
    public bool IsPinned { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public Channel Channel { get; set; } = null!;
    public ApplicationUser Sender { get; set; } = null!;
    public Message? ReplyToMessage { get; set; }
    public ICollection<Message> Replies { get; set; } = new List<Message>();
    public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
    public ICollection<MessageAttachment> Attachments { get; set; } = new List<MessageAttachment>();
}
