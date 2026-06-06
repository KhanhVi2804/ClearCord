using ClearCord.Common.Exceptions;
using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Entities;
using ClearCord.Enums;
using ClearCord.Infrastructure;
using ClearCord.Repositories;

namespace ClearCord.Services;

public sealed class DirectConversationService(
    IDirectConversationRepository directConversationRepository,
    IFriendRepository friendRepository,
    IUserRepository userRepository,
    IUnitOfWork unitOfWork) : IDirectConversationService
{
    public async Task<IReadOnlyCollection<DirectConversationDto>> GetForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        var conversations = await directConversationRepository.GetForUserAsync(userId, cancellationToken);
        return conversations.Select(conversation => conversation.ToDirectConversationDto(userId)).ToArray();
    }

    public async Task<DirectConversationDto> GetOrCreateAsync(string userId, StartDirectConversationRequest request, CancellationToken cancellationToken = default)
    {
        var targetUserId = request.TargetUserId.Trim();
        if (targetUserId == userId)
        {
            throw new ApiException("You cannot start a direct conversation with yourself.");
        }

        var targetUser = await userRepository.GetByIdAsync(targetUserId, cancellationToken)
            ?? throw new ApiException("User was not found.", StatusCodes.Status404NotFound);

        var friendship = await friendRepository.GetBetweenUsersAsync(userId, targetUserId, cancellationToken)
            ?? throw new ApiException("You can only message accepted friends directly.", StatusCodes.Status403Forbidden);

        if (friendship.Status != FriendRequestStatus.Accepted)
        {
            throw new ApiException("You can only message accepted friends directly.", StatusCodes.Status403Forbidden);
        }

        var conversation = await directConversationRepository.GetBetweenUsersAsync(userId, targetUserId, cancellationToken);
        if (conversation is null)
        {
            var (userAId, userBId) = DirectConversationRepository.NormalizePair(userId, targetUserId);
            conversation = new DirectConversation
            {
                Id = Guid.NewGuid(),
                UserAId = userAId,
                UserBId = userBId,
                UserA = userAId == userId ? friendship.RequesterId == userId ? friendship.Requester : friendship.Addressee : targetUser,
                UserB = userBId == userId ? friendship.RequesterId == userId ? friendship.Requester : friendship.Addressee : targetUser
            };

            await directConversationRepository.AddAsync(conversation, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            conversation = await directConversationRepository.GetByIdAsync(conversation.Id, cancellationToken)
                ?? throw new ApiException("Direct conversation was not found.", StatusCodes.Status404NotFound);
        }

        return conversation.ToDirectConversationDto(userId);
    }

    public async Task EnsureParticipantAsync(Guid conversationId, string userId, CancellationToken cancellationToken = default)
    {
        var conversation = await directConversationRepository.GetByIdAsync(conversationId, cancellationToken)
            ?? throw new ApiException("Direct conversation was not found.", StatusCodes.Status404NotFound);

        if (!conversation.HasParticipant(userId))
        {
            throw new ApiException("You do not have access to this direct conversation.", StatusCodes.Status403Forbidden);
        }
    }
}

public sealed class DirectVoiceService(
    IDirectConversationRepository directConversationRepository,
    IDirectVoiceStateRepository directVoiceStateRepository,
    INotificationService notificationService,
    IRealtimeNotifier realtimeNotifier,
    IUnitOfWork unitOfWork) : IDirectVoiceService
{
    public async Task<IReadOnlyCollection<VoiceParticipantDto>> GetParticipantsAsync(Guid conversationId, string userId, CancellationToken cancellationToken = default)
    {
        await RequireConversationAsync(conversationId, userId, cancellationToken);
        var participants = await directVoiceStateRepository.GetParticipantsAsync(conversationId, cancellationToken);
        return participants.Select(participant => participant.ToVoiceParticipantDto()).ToArray();
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> JoinAsync(Guid conversationId, string userId, JoinVoiceChannelRequest request, CancellationToken cancellationToken = default)
    {
        var conversation = await RequireConversationAsync(conversationId, userId, cancellationToken);

        var participant = await directVoiceStateRepository.GetParticipantAsync(conversationId, userId, request.ConnectionId, cancellationToken);
        var isNewParticipant = participant is null;
        if (participant is null)
        {
            await directVoiceStateRepository.AddAsync(new DirectVoiceParticipant
            {
                Id = Guid.NewGuid(),
                DirectConversationId = conversationId,
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

        if (isNewParticipant)
        {
            var sender = conversation.UserAId == userId ? conversation.UserA : conversation.UserB;
            await notificationService.NotifyAsync(
                conversation.GetOtherUserId(userId),
                NotificationType.Message,
                $"Direct call from {sender.DisplayName}",
                "Open the direct message to join the call.",
                nameof(DirectConversation),
                conversationId.ToString(),
                cancellationToken);
        }

        return await BroadcastParticipantsAsync(conversationId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> LeaveAsync(Guid conversationId, string userId, string connectionId, CancellationToken cancellationToken = default)
    {
        await RequireConversationAsync(conversationId, userId, cancellationToken);

        var participant = await directVoiceStateRepository.GetParticipantAsync(conversationId, userId, connectionId, cancellationToken);
        if (participant is not null)
        {
            directVoiceStateRepository.Remove(participant);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return await BroadcastParticipantsAsync(conversationId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> LeaveByConnectionAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        var participants = await directVoiceStateRepository.GetByConnectionAsync(connectionId, cancellationToken);
        if (participants.Count == 0)
        {
            return Array.Empty<VoiceParticipantDto>();
        }

        var conversationIds = participants.Select(participant => participant.DirectConversationId).Distinct().ToArray();
        directVoiceStateRepository.RemoveRange(participants);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var results = new List<VoiceParticipantDto>();
        foreach (var conversationId in conversationIds)
        {
            var conversationParticipants = await BroadcastParticipantsAsync(conversationId, cancellationToken);
            results.AddRange(conversationParticipants);
        }

        return results;
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> UpdateStateAsync(Guid conversationId, string userId, UpdateVoiceStateRequest request, CancellationToken cancellationToken = default)
    {
        await RequireConversationAsync(conversationId, userId, cancellationToken);

        var participant = await directVoiceStateRepository.GetParticipantAsync(conversationId, userId, request.ConnectionId, cancellationToken)
            ?? throw new ApiException("Direct call participant was not found.", StatusCodes.Status404NotFound);

        participant.IsMuted = request.IsMuted;
        participant.IsCameraEnabled = request.IsCameraEnabled;
        participant.IsScreenSharing = request.IsScreenSharing;
        participant.LastUpdatedAt = DateTimeOffset.UtcNow;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await BroadcastParticipantsAsync(conversationId, cancellationToken);
    }

    private async Task<DirectConversation> RequireConversationAsync(Guid conversationId, string userId, CancellationToken cancellationToken)
    {
        var conversation = await directConversationRepository.GetByIdAsync(conversationId, cancellationToken)
            ?? throw new ApiException("Direct conversation was not found.", StatusCodes.Status404NotFound);

        if (!conversation.HasParticipant(userId))
        {
            throw new ApiException("You do not have access to this direct conversation.", StatusCodes.Status403Forbidden);
        }

        return conversation;
    }

    private async Task<IReadOnlyCollection<VoiceParticipantDto>> BroadcastParticipantsAsync(Guid conversationId, CancellationToken cancellationToken)
    {
        var participants = await directVoiceStateRepository.GetParticipantsAsync(conversationId, cancellationToken);
        var dtos = participants.Select(participant => participant.ToVoiceParticipantDto()).ToArray();

        await realtimeNotifier.NotifyDirectConversationAsync(conversationId, "voiceParticipantsUpdated", new
        {
            directConversationId = conversationId,
            participants = dtos
        }, cancellationToken);
        return dtos;
    }
}
