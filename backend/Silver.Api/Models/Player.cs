namespace Silver.Api.Models;

public class Player
{
    public required string ConnectionId { get; set; }
    public required string PlayerId { get; set; } // شناسه‌ی پایدار بازیکن (برای reconnect در فازهای بعد)
    public required string Name { get; set; }
    public bool IsConnected { get; set; } = true;
    public bool IsHost { get; set; } = false;
}