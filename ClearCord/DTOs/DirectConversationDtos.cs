using System.ComponentModel.DataAnnotations;

namespace ClearCord.DTOs;

public sealed record StartDirectConversationRequest(
    [param: Required] string TargetUserId);

public sealed record DirectConversationDto(
    Guid Id,
    UserSummaryDto OtherUser,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastActivityAt);
