using ClearCord.Enums;

namespace ClearCord.Entities;

public sealed class UserNotification
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? RelatedEntityType { get; set; }
    public string? RelatedEntityId { get; set; }
    public bool IsRead { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}
