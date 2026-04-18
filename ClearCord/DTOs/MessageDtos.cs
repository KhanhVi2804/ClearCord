using System.ComponentModel.DataAnnotations;

namespace ClearCord.DTOs;

public sealed class CreateMessageRequest
{
    [MaxLength(4000)]
    public string? Content { get; set; }

    public Guid? ReplyToMessageId { get; set; }

    public IList<IFormFile> Files { get; set; } = new List<IFormFile>();
}

public sealed record SendRealtimeMessageRequest(
    Guid ChannelId,
    string? Content,
    Guid? ReplyToMessageId);

public sealed record UpdateMessageRequest(
    [param: Required, MaxLength(4000)] string Content);

public sealed record ToggleReactionRequest(
    [param: Required, MaxLength(20)] string Emoji);

public sealed record AttachmentDto(
    Guid Id,
    string FileName,
    string ContentType,
    string Url,
    long SizeInBytes,
    bool IsImage);

public sealed record MessageReactionDto(
    Guid Id,
    string Emoji,
    UserSummaryDto User,
    DateTimeOffset CreatedAt);

public sealed record MessageReferenceDto(
    Guid Id,
    string? Content,
    UserSummaryDto Sender);

public sealed record MessageDto(
    Guid Id,
    Guid ChannelId,
    string? Content,
    bool IsEdited,
    bool IsDeleted,
    bool IsPinned,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    UserSummaryDto Sender,
    MessageReferenceDto? ReplyTo,
    IReadOnlyCollection<AttachmentDto> Attachments,
    IReadOnlyCollection<MessageReactionDto> Reactions);
