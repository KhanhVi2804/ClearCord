using System.ComponentModel.DataAnnotations;

namespace ClearCord.Models
{
    public class Server
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Tên máy chủ không được để trống")]
        public string Name { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? Description { get; set; }

        public string InviteCode { get; set; } = Guid.NewGuid().ToString("N").Substring(0, 8);

        public string OwnerId { get; set; } = string.Empty;
        public User? Owner { get; set; }

        public ICollection<ServerMember> Members { get; set; } = new List<ServerMember>();
        public ICollection<Channel> Channels { get; set; } = new List<Channel>();
    }
}