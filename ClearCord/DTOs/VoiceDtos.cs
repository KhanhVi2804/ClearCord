using ClearCord.Enums;
using System.ComponentModel.DataAnnotations;

namespace ClearCord.DTOs;

public sealed record JoinVoiceChannelRequest(
    [param: Required] string ConnectionId,
    bool IsMuted,
    bool IsCameraEnabled,
    bool IsScreenSharing);

public sealed record UpdateVoiceStateRequest(
    [param: Required] string ConnectionId,
    bool IsMuted,
    bool IsCameraEnabled,
    bool IsScreenSharing);

public sealed record VoiceParticipantDto(
    string UserId,
    string UserName,
    string DisplayName,
    string? AvatarUrl,
    string ConnectionId,
    bool IsMuted,
    bool IsCameraEnabled,
    bool IsScreenSharing,
    DateTimeOffset JoinedAt);

public sealed record WebRtcSignalRequest(
    [param: Required] Guid ChannelId,
    [param: Required] string TargetUserId,
    WebRtcSignalType Type,
    [param: Required] string Payload);
