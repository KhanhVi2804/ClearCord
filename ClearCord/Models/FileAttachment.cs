namespace ClearCord.Models
{
    public class FileAttachment
    {
        public int Id { get; set; }
        
        public string FileUrl { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty; // e.g., image/png

        public int MessageId { get; set; }
        public Message Message { get; set; } = null!;
    }
}
