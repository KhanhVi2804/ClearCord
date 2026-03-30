namespace ClearCord.Models
{
    public class Notification
    {
        public int Id { get; set; }
        
        public string UserId { get; set; } = string.Empty;
        public User User { get; set; } = null!;

        public string Content { get; set; } = string.Empty;
        public string Type { get; set; } = "Info"; // Message, FriendRequest, ServerInvite
        
        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
