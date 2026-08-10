using Microsoft.AspNetCore.SignalR;

namespace Silver.Api.Hubs;

public class GameHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        Console.WriteLine($"[GameHub] Client connected: {Context.ConnectionId}");
        await Clients.Caller.SendAsync("ServerMessage", $"سلام! تو وصل شدی با ConnectionId: {Context.ConnectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"[GameHub] Client disconnected: {Context.ConnectionId}");
        await base.OnDisconnectedAsync(exception);
    }

    // متد تستی: هر پیامی که کلاینت بفرسته، به همه‌ی کلاینت‌های وصل‌شده echo می‌شه
    public async Task SendEcho(string playerName, string message)
    {
        Console.WriteLine($"[GameHub] Echo from {playerName}: {message}");
        await Clients.All.SendAsync("ReceiveEcho", playerName, message, DateTime.UtcNow);
    }
}