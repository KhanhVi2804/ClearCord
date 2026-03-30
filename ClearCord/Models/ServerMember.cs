namespace ClearCord.Models
{
    public class ServerMember
    {
        public int Id { get; set; }
        
        public string UserId { get; set; } = string.Empty;
        public User User { get; set; } = null!;

        public int ServerId { get; set; }
        public Server Server { get; set; } = null!;

        public string Role { get; set; } = "Member"; // e.g., Admin, Member

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}
