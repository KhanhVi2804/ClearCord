using ClearCord.Common.Extensions;
using ClearCord.DTOs;
using ClearCord.Enums;
using ClearCord.Infrastructure;
using ClearCord.Repositories;
using ClearCord.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ClearCord.Hubs;

[Authorize]
public sealed class ChatHub(
    IConnectionService connectionService,
    IVoiceService voiceService,
    IDirectVoiceService directVoiceService,
    IMessageService messageService,
    IDirectConversationService directConversationService,
    IDirectConversationRepository directConversationRepository,
    IChannelRepository channelRepository,
    IServerPermissionService permissionService) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        await connectionService.ConnectAsync(userId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await voiceService.LeaveByConnectionAsync(Context.ConnectionId);
        await directVoiceService.LeaveByConnectionAsync(Context.ConnectionId);
        await connectionService.DisconnectAsync(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinServer(Guid serverId)
    {
        var userId = GetUserId();
        await permissionService.EnsurePermissionAsync(serverId, userId, PermissionType.ViewChannels);
        await Groups.AddToGroupAsync(Context.ConnectionId, RealtimeGroups.Server(serverId));
    }

    public async Task JoinChannel(Guid channelId)
    {
        var userId = GetUserId();
        var channel = await channelRepository.GetByIdAsync(channelId)
            ?? throw new HubException("Channel was not found.");

        await permissionService.EnsurePermissionAsync(channel.ServerId, userId, PermissionType.ViewChannels);
        await Groups.AddToGroupAsync(Context.ConnectionId, RealtimeGroups.Channel(channelId));
    }

    public async Task LeaveChannel(Guid channelId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, RealtimeGroups.Channel(channelId));
    }

    public async Task JoinDirectConversation(Guid conversationId)
    {
        var userId = GetUserId();
        await directConversationService.EnsureParticipantAsync(conversationId, userId);
        await Groups.AddToGroupAsync(Context.ConnectionId, RealtimeGroups.DirectConversation(conversationId));
    }

    public async Task LeaveDirectConversation(Guid conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, RealtimeGroups.DirectConversation(conversationId));
    }

    public async Task SendTyping(Guid channelId, bool isTyping)
    {
        var userId = GetUserId();
        var channel = await channelRepository.GetByIdAsync(channelId)
            ?? throw new HubException("Channel was not found.");

        await permissionService.EnsurePermissionAsync(channel.ServerId, userId, PermissionType.ViewChannels);
        await Clients.OthersInGroup(RealtimeGroups.Channel(channelId)).SendAsync("typingChanged", new
        {
            channelId,
            userId,
            isTyping
        });
    }

    public async Task SendDirectTyping(Guid conversationId, bool isTyping)
    {
        var userId = GetUserId();
        await directConversationService.EnsureParticipantAsync(conversationId, userId);
        await Clients.OthersInGroup(RealtimeGroups.DirectConversation(conversationId)).SendAsync("typingChanged", new
        {
            directConversationId = conversationId,
            userId,
            isTyping
        });
    }

    public async Task<MessageDto> SendMessage(SendRealtimeMessageRequest request)
    {
        var userId = GetUserId();
        return await messageService.CreateAsync(request.ChannelId, userId, request.Content, request.ReplyToMessageId, null);
    }

    public async Task<MessageDto> SendDirectMessage(SendRealtimeDirectMessageRequest request)
    {
        var userId = GetUserId();
        return await messageService.CreateDirectAsync(request.DirectConversationId, userId, request.Content, request.ReplyToMessageId, null);
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> JoinVoiceChannel(Guid channelId, bool isMuted, bool isCameraEnabled, bool isScreenSharing)
    {
        var userId = GetUserId();
        await Groups.AddToGroupAsync(Context.ConnectionId, RealtimeGroups.Channel(channelId));

        return await voiceService.JoinAsync(channelId, userId, new JoinVoiceChannelRequest(Context.ConnectionId, isMuted, isCameraEnabled, isScreenSharing));
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> LeaveVoiceChannel(Guid channelId)
    {
        var userId = GetUserId();
        return await voiceService.LeaveAsync(channelId, userId, Context.ConnectionId);
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> UpdateVoiceState(Guid channelId, bool isMuted, bool isCameraEnabled, bool isScreenSharing)
    {
        var userId = GetUserId();
        return await voiceService.UpdateStateAsync(channelId, userId, new UpdateVoiceStateRequest(Context.ConnectionId, isMuted, isCameraEnabled, isScreenSharing));
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> JoinDirectVoice(Guid conversationId, bool isMuted, bool isCameraEnabled, bool isScreenSharing)
    {
        var userId = GetUserId();
        await directConversationService.EnsureParticipantAsync(conversationId, userId);
        await Groups.AddToGroupAsync(Context.ConnectionId, RealtimeGroups.DirectConversation(conversationId));

        return await directVoiceService.JoinAsync(conversationId, userId, new JoinVoiceChannelRequest(Context.ConnectionId, isMuted, isCameraEnabled, isScreenSharing));
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> LeaveDirectVoice(Guid conversationId)
    {
        var userId = GetUserId();
        return await directVoiceService.LeaveAsync(conversationId, userId, Context.ConnectionId);
    }

    public async Task<IReadOnlyCollection<VoiceParticipantDto>> UpdateDirectVoiceState(Guid conversationId, bool isMuted, bool isCameraEnabled, bool isScreenSharing)
    {
        var userId = GetUserId();
        return await directVoiceService.UpdateStateAsync(conversationId, userId, new UpdateVoiceStateRequest(Context.ConnectionId, isMuted, isCameraEnabled, isScreenSharing));
    }

    public async Task SendWebRtcSignal(WebRtcSignalRequest request)
    {
        var userId = GetUserId();
        var channel = await channelRepository.GetByIdAsync(request.ChannelId)
            ?? throw new HubException("Channel was not found.");

        await permissionService.EnsurePermissionAsync(channel.ServerId, userId, PermissionType.ConnectToVoice);

        // SignalR only carries the signaling payload; the actual media path still stays peer-to-peer over WebRTC.
        await Clients.User(request.TargetUserId).SendAsync("webrtcSignal", new
        {
            request.ChannelId,
            SourceUserId = userId,
            request.TargetUserId,
            Type = request.Type.ToString(),
            request.Payload
        });
    }

    public async Task SendDirectWebRtcSignal(DirectWebRtcSignalRequest request)
    {
        var userId = GetUserId();
        var conversation = await directConversationRepository.GetByIdAsync(request.DirectConversationId)
            ?? throw new HubException("Direct conversation was not found.");

        if (!conversation.HasParticipant(userId) || !conversation.HasParticipant(request.TargetUserId))
        {
            throw new HubException("You do not have access to this direct conversation.");
        }

        await Clients.User(request.TargetUserId).SendAsync("webrtcSignal", new
        {
            request.DirectConversationId,
            SourceUserId = userId,
            request.TargetUserId,
            Type = request.Type.ToString(),
            request.Payload
        });
    }

    private string GetUserId()
    {
        return (Context.User ?? throw new HubException("Authentication is required.")).GetRequiredUserId();
    }
}
