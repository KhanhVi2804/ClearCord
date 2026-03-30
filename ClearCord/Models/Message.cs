namespace ClearCord.Models
{
    public class Message
    {
        public int Id { get; set; }
        public string Content { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsEdited { get; set; } = false;
        public bool IsPinned { get; set; } = false;

        public string SenderId { get; set; } = string.Empty;
        public User Sender { get; set; } = null!;

        public int ChannelId { get; set; }
        public Channel Channel { get; set; } = null!;
        
        // Self-referencing for replies
        public int? ReplyToId { get; set; }
        public Message? ReplyTo { get; set; }

        public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
        public ICollection<FileAttachment> Attachments { get; set; } = new List<FileAttachment>();
    }
}
