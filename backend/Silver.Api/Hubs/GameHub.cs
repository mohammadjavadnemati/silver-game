using Microsoft.AspNetCore.SignalR;
using Silver.Api.Models;
using Silver.Api.Services;

namespace Silver.Api.Hubs;

public class GameHub : Hub
{
    private readonly RoomService _roomService;

    public GameHub(RoomService roomService)
    {
        _roomService = roomService;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        _roomService.MarkDisconnected(Context.ConnectionId);

        if (room != null)
        {
            await Clients.Group(room.RoomCode).SendAsync("RoomUpdated", MapRoom(room));
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task<object> CreateRoom(string playerId, string playerName)
    {
        var room = _roomService.CreateRoom(Context.ConnectionId, playerId, playerName);
        await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomCode);
        await Clients.Group(room.RoomCode).SendAsync("RoomUpdated", MapRoom(room));
        return MapRoom(room);
    }

    public async Task<object> JoinRoom(string roomCode, string playerId, string playerName)
    {
        var (success, error, room) = _roomService.JoinRoom(roomCode.ToUpperInvariant(), Context.ConnectionId, playerId, playerName);

        if (!success || room == null)
        {
            return new { success = false, error };
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomCode);
        await Clients.Group(room.RoomCode).SendAsync("RoomUpdated", MapRoom(room));

        return new { success = true, room = MapRoom(room) };
    }

    private static object MapRoom(Room room)
    {
        return new
        {
            roomCode = room.RoomCode,
            status = room.Status.ToString(),
            players = room.Players.Select(p => new
            {
                playerId = p.PlayerId,
                name = p.Name,
                isHost = p.IsHost,
                isConnected = p.IsConnected
            })
        };
    }
}