namespace Silver.Api.Models;

public enum RoomStatus
{
    WaitingForPlayers,
    InGame,
    Finished
}

public class Room
{
    public required string RoomCode { get; set; }
    public RoomStatus Status { get; set; } = RoomStatus.WaitingForPlayers;
    public List<Player> Players { get; set; } = new();
    public const int MaxPlayers = 4;
    public const int MinPlayers = 2; // برای شروع بازی لازمه؛ هدف نهایی ۴ نفره‌ست ولی تست با کمتر هم باید ممکن باشه

    public bool IsFull => Players.Count(p => p.IsConnected) >= MaxPlayers;
}