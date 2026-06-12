using System.ComponentModel.DataAnnotations;

namespace ClearCord.DTOs;

public sealed record ClearAiRequest(
    [param: Required, MaxLength(4000)] string Prompt,
    string? Language,
    Guid? ServerId,
    string? ServerName,
    Guid? ChannelId,
    string? ChannelName,
    Guid? DirectConversationId,
    string? DirectConversationName,
    string? DirectConversationPeerUserId);

public sealed record ClearAiActionDto(
    string Type,
    string? TargetUserId,
    string? TargetDisplayName,
    Guid? ConversationId,
    Guid? ServerId,
    Guid? ChannelId);

public sealed record ClearAiResponseDto(
    string Message,
    string Mode,
    bool UsedExternalModel,
    ClearAiActionDto? Action);
