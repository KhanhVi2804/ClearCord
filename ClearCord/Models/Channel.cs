namespace ClearCord.Models
{
    public class Channel
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        
        public int ServerId { get; set; }
        public Server Server { get; set; } = null!;
        
        public string Type { get; set; } = "Text"; // Text or Voice

        public ICollection<Message> Messages { get; set; } = new List<Message>();
    }
}
