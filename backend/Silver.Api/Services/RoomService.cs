using System.Collections.Concurrent;
using Silver.Api.Models;

namespace Silver.Api.Services;

public class RoomService
{
    private readonly ConcurrentDictionary<string, Room> _rooms = new();
    private readonly object _lock = new();

    public Room CreateRoom(string hostConnectionId, string hostPlayerId, string hostName)
    {
        var roomCode = GenerateRoomCode();

        var room = new Room
        {
            RoomCode = roomCode,
            Players = new List<Player>
            {
                new Player
                {
                    ConnectionId = hostConnectionId,
                    PlayerId = hostPlayerId,
                    Name = hostName,
                    IsHost = true
                }
            }
        };

        _rooms[roomCode] = room;
        return room;
    }

    public (bool Success, string? Error, Room? Room) JoinRoom(string roomCode, string connectionId, string playerId, string name)
    {
        lock (_lock)
        {
            if (!_rooms.TryGetValue(roomCode, out var room))
                return (false, "اتاقی با این کد پیدا نشد.", null);

            if (room.Status != RoomStatus.WaitingForPlayers)
                return (false, "این بازی از قبل شروع شده.", null);

            if (room.IsFull)
                return (false, "اتاق پره (حداکثر ۴ بازیکن).", null);

            var existing = room.Players.FirstOrDefault(p => p.PlayerId == playerId);
            if (existing != null)
            {
                // بازیکن قبلاً بوده (مثلاً رفرش کرده) - آپدیت اتصال
                existing.ConnectionId = connectionId;
                existing.IsConnected = true;
            }
            else
            {
                room.Players.Add(new Player
                {
                    ConnectionId = connectionId,
                    PlayerId = playerId,
                    Name = name
                });
            }

            return (true, null, room);
        }
    }

    public Room? GetRoomByConnectionId(string connectionId)
    {
        return _rooms.Values.FirstOrDefault(r => r.Players.Any(p => p.ConnectionId == connectionId));
    }

    public Room? GetRoom(string roomCode) => _rooms.GetValueOrDefault(roomCode);

    public void MarkDisconnected(string connectionId)
    {
        var room = GetRoomByConnectionId(connectionId);
        var player = room?.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
        if (player != null)
            player.IsConnected = false;
    }

    private string GenerateRoomCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بدون حروف/اعداد شبیه‌به‌هم
        var random = new Random();
        string code;
        do
        {
            code = new string(Enumerable.Range(0, 5).Select(_ => chars[random.Next(chars.Length)]).ToArray());
        } while (_rooms.ContainsKey(code));
        return code;
    }
}