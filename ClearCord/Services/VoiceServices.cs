using ClearCord.Common.Exceptions;
using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Enums;
using ClearCord.Repositories;

namespace ClearCord.Services;

public sealed class VoiceService(
    IChannelRepository channelRepository,
    IVoiceStateRepository voiceStateRepository,
    IServerPermissionService permissionService,
    IRealtimeNotifier realtimeNotifier,
    IUnitOfWork unitOfWork) : IVoiceService
{
    public async Task<IReadOnlyCollection<VoiceParticipantDto>> GetParticipantsAsync(Guid channelId, string userId, CancellationToken cancellationToken = default)
    {
        var channel = await RequireVoiceChannelAsync(channelId, cancellationToken);
        await permissionService.EnsurePermissionAsync(channel.ServerId, userId, PermissionType.ConnectToVoice, cancellationToken);

        var participants = await voiceStateRepository.GetParticipantsAsync(channelId, cancellationToken);
        return participants.Select(participant => participant.ToVoiceParticipantDto()).ToArray();
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> JoinAsync(Guid channelId, string userId, JoinVoiceChannelRequest request, CancellationToken cancellationToken = default)
    {
        var channel = await RequireVoiceChannelAsync(channelId, cancellationToken);
        await permissionService.EnsurePermissionAsync(channel.ServerId, userId, PermissionType.ConnectToVoice, cancellationToken);

        var participant = await voiceStateRepository.GetParticipantAsync(channelId, userId, request.ConnectionId, cancellationToken);
        if (participant is null)
        {
            await voiceStateRepository.AddAsync(new Entities.VoiceChannelParticipant
            {
                Id = Guid.NewGuid(),
                ChannelId = channelId,
                UserId = userId,
                ConnectionId = request.ConnectionId,
                IsMuted = request.IsMuted,
                IsCameraEnabled = request.IsCameraEnabled,
                IsScreenSharing = request.IsScreenSharing
            }, cancellationToken);
        }
        else
        {
            participant.IsMuted = request.IsMuted;
            participant.IsCameraEnabled = request.IsCameraEnabled;
            participant.IsScreenSharing = request.IsScreenSharing;
            participant.LastUpdatedAt = DateTimeOffset.UtcNow;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await BroadcastParticipantsAsync(channelId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> LeaveAsync(Guid channelId, string userId, string connectionId, CancellationToken cancellationToken = default)
    {
        await RequireVoiceChannelAsync(channelId, cancellationToken);

        var participant = await voiceStateRepository.GetParticipantAsync(channelId, userId, connectionId, cancellationToken);
        if (participant is not null)
        {
            voiceStateRepository.Remove(participant);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return await BroadcastParticipantsAsync(channelId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> LeaveByConnectionAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        var participants = await voiceStateRepository.GetByConnectionAsync(connectionId, cancellationToken);
        if (participants.Count == 0)
        {
            return Array.Empty<VoiceParticipantDto>();
        }

        var channelIds = participants.Select(participant => participant.ChannelId).Distinct().ToArray();
        voiceStateRepository.RemoveRange(participants);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var results = new List<VoiceParticipantDto>();
        foreach (var channelId in channelIds)
        {
            var channelParticipants = await BroadcastParticipantsAsync(channelId, cancellationToken);
            results.AddRange(channelParticipants);
        }

        return results;
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> UpdateStateAsync(Guid channelId, string userId, UpdateVoiceStateRequest request, CancellationToken cancellationToken = default)
    {
        await RequireVoiceChannelAsync(channelId, cancellationToken);

        var participant = await voiceStateRepository.GetParticipantAsync(channelId, userId, request.ConnectionId, cancellationToken)
            ?? throw new ApiException("Voice participant was not found.", StatusCodes.Status404NotFound);

        participant.IsMuted = request.IsMuted;
        participant.IsCameraEnabled = request.IsCameraEnabled;
        participant.IsScreenSharing = request.IsScreenSharing;
        participant.LastUpdatedAt = DateTimeOffset.UtcNow;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await BroadcastParticipantsAsync(channelId, cancellationToken);
    }

    private async Task<Entities.Channel> RequireVoiceChannelAsync(Guid channelId, CancellationToken cancellationToken)
    {
        var channel = await channelRepository.GetByIdAsync(channelId, cancellationToken)
            ?? throw new ApiException("Channel was not found.", StatusCodes.Status404NotFound);

        if (channel.Type != ChannelType.Voice)
        {
            throw new ApiException("This action is only valid for voice channels.");
        }

        return channel;
    }

    private async Task<IReadOnlyCollection<VoiceParticipantDto>> BroadcastParticipantsAsync(Guid channelId, CancellationToken cancellationToken)
    {
        var participants = await voiceStateRepository.GetParticipantsAsync(channelId, cancellationToken);
        var dtos = participants.Select(participant => participant.ToVoiceParticipantDto()).ToArray();

        // The participant list is the source of truth for WebRTC signaling presence inside a voice channel.
        await realtimeNotifier.NotifyChannelAsync(channelId, "voiceParticipantsUpdated", dtos, cancellationToken);
        return dtos;
    }
}
