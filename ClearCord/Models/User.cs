using Microsoft.AspNetCore.Identity;

namespace ClearCord.Models
{
    public class User : IdentityUser
    {
        public string? DisplayName { get; set; }
        public string? AvatarUrl { get; set; }

        public ICollection<ServerMember> ServerMemberships { get; set; } = new List<ServerMember>();
        public ICollection<Friendship> FriendshipsInitiated { get; set; } = new List<Friendship>();
        public ICollection<Friendship> FriendshipsReceived { get; set; } = new List<Friendship>();
    }
}
