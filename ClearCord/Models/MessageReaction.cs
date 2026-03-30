namespace ClearCord.Models
{
    public class MessageReaction
    {
        public int Id { get; set; }
        
        public string Emoji { get; set; } = string.Empty;

        public int MessageId { get; set; }
        public Message Message { get; set; } = null!;

        public string UserId { get; set; } = string.Empty;
        public User User { get; set; } = null!;
    }
}
