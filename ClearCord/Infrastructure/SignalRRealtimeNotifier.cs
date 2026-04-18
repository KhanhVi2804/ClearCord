using ClearCord.Hubs;
using ClearCord.Services;
using Microsoft.AspNetCore.SignalR;

namespace ClearCord.Infrastructure;

public static class RealtimeGroups
{
    public static string Channel(Guid channelId) => $"channel:{channelId}";
    public static string Server(Guid serverId) => $"server:{serverId}";
}

public sealed class SignalRRealtimeNotifier(IHubContext<ChatHub> hubContext) : IRealtimeNotifier
{
    public async Task NotifyUserAsync(string userId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        await hubContext.Clients.User(userId).SendAsync(eventName, payload, cancellationToken);
    }

    public async Task NotifyUsersAsync(IEnumerable<string> userIds, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        await hubContext.Clients.Users(userIds).SendAsync(eventName, payload, cancellationToken);
    }

    public async Task NotifyChannelAsync(Guid channelId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        await hubContext.Clients.Group(RealtimeGroups.Channel(channelId)).SendAsync(eventName, payload, cancellationToken);
    }

    public async Task NotifyServerAsync(Guid serverId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        await hubContext.Clients.Group(RealtimeGroups.Server(serverId)).SendAsync(eventName, payload, cancellationToken);
    }

    public async Task NotifyPresenceChangedAsync(string userId, bool isOnline, DateTimeOffset? lastSeenAt, CancellationToken cancellationToken = default)
    {
        await hubContext.Clients.All.SendAsync("presenceChanged", new
        {
            userId,
            isOnline,
            lastSeenAt
        }, cancellationToken);
    }
}
