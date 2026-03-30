namespace ClearCord.Models
{
    public class Friendship
    {
        public int Id { get; set; }
        
        public string RequesterId { get; set; } = string.Empty;
        public User Requester { get; set; } = null!;

        public string AddresseeId { get; set; } = string.Empty;
        public User Addressee { get; set; } = null!;

        public FriendshipStatus Status { get; set; } = FriendshipStatus.Pending;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public enum FriendshipStatus
    {
        Pending,
        Accepted,
        Blocked
    }
}
