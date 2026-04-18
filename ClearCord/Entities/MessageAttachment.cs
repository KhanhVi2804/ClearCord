namespace ClearCord.Entities;

public sealed class MessageAttachment
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public long SizeInBytes { get; set; }
    public bool IsImage { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Message Message { get; set; } = null!;
}
