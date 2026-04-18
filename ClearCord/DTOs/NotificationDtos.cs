using ClearCord.Enums;

namespace ClearCord.DTOs;

public sealed record NotificationDto(
    Guid Id,
    NotificationType Type,
    string Title,
    string Content,
    string? RelatedEntityType,
    string? RelatedEntityId,
    bool IsRead,
    DateTimeOffset CreatedAt);
