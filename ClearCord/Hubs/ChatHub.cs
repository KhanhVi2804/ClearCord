using Microsoft.AspNetCore.SignalR;

namespace ClearCord.Hubs
{
    public class ChatHub : Hub
    {
        public async Task SendMessage(string user, string message)
        {
            // Gửi tin nhắn đến tất cả mọi người đang xem kênh này
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }
    }
}