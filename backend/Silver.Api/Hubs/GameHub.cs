using Silver.Api.Models;     // ← این خط برای Room لازمه
using Silver.Engine.Cards;   // ← این خط برای CardType در MapAction لازمه (چون از Cards.CardType استفاده کردیم)
using Microsoft.AspNetCore.SignalR;
using Silver.Api.Services;
using Silver.Engine;

namespace Silver.Api.Hubs;

public class GameHub : Hub
{
    private readonly RoomService _roomService;
    private readonly GameSessionService _gameSessionService;

    public GameHub(RoomService roomService, GameSessionService gameSessionService)
    {
        _roomService = roomService;
        _gameSessionService = gameSessionService;
    }

    // --- اتاق (از فاز ۲، بدون تغییر) ---

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        _roomService.MarkDisconnected(Context.ConnectionId);
        if (room != null)
            await Clients.Group(room.RoomCode).SendAsync("RoomUpdated", MapRoom(room));
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
        if (!success || room == null) return new { success = false, error };

        await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomCode);
        await Clients.Group(room.RoomCode).SendAsync("RoomUpdated", MapRoom(room));
        return new { success = true, room = MapRoom(room) };
    }

    // --- بازی (جدید) ---

    public async Task<object> StartGame(string roomCode)
    {
        try
        {
            var state = await _gameSessionService.StartGameAsync(roomCode);
            await BroadcastGameState(roomCode, state);
            return new { success = true };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
        }
    }

    /// <summary>
    /// نقطه‌ی ورود واحد برای همه‌ی اکشن‌های بازی. کلاینت نوع اکشن رو مشخص می‌کنه،
    /// سرور اکشن رو می‌سازه، اعتبارسنجی می‌کنه، و نتیجه رو broadcast می‌کنه.
    /// </summary>
    public async Task<object> SendGameAction(string roomCode, string actionType, Dictionary<string, object> payload)
    {
        var playerId = GetPlayerIdFromPayload(payload); // توضیح پایین

        SilverAction? action = BuildAction(actionType, playerId, payload);
        if (action == null)
            return new { success = false, error = "نوع اکشن نامعتبر است." };

        var result = await _gameSessionService.ApplyActionAsync(roomCode, action);

        if (!result.Success)
            return new { success = false, error = result.ErrorMessage };

        await BroadcastGameState(roomCode, result.UpdatedState!, result.PrivatelyRevealedCards, forPlayerId: playerId);

        return new { success = true };
    }

    private async Task BroadcastGameState(
        string roomCode,
        SilverGameState state,
        Dictionary<string, CardType>? privateInfoForActingPlayer = null,
        string? forPlayerId = null)
    {
        var room = _roomService.GetRoom(roomCode);
        if (room == null) return;

        foreach (var player in room.Players.Where(p => p.IsConnected))
        {
            var privateInfo = player.PlayerId == forPlayerId ? privateInfoForActingPlayer : null;
            var view = _gameSessionService.BuildPlayerFacingState(state, player.PlayerId, privateInfo);
            // myInitialPeeksRemaining = SilverGameState.MaxInitialPeeksPerRound - state.InitialPeeksUsedByPlayer.GetValueOrDefault(forPlayerId, 0);
            await Clients.Client(player.ConnectionId).SendAsync("GameStateUpdated", view);
            if (player.PlayerId == forPlayerId && privateInfo != null && privateInfo.Count > 0)
            {
                var revealPayload = privateInfo.ToDictionary(kv => kv.Key, kv => new { type = kv.Value.ToString(), value = (int)kv.Value });
                await Clients.Client(player.ConnectionId).SendAsync("PrivateCardsRevealed", revealPayload);
            }
            // در BroadcastGameState، بعد از فرستادن GameStateUpdated:
            if (player.PlayerId == forPlayerId && privateInfo != null && privateInfo.Count > 0)
            {
                var revealPayload = privateInfo.ToDictionary(kv => kv.Key, kv => new { type = kv.Value.ToString(), value = (int)kv.Value });
                await Clients.Client(player.ConnectionId).SendAsync("PrivateCardsRevealed", revealPayload);
            }
        }
    }

    private static object MapRoom(Room room) => new
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

    private static string GetPlayerIdFromPayload(Dictionary<string, object> payload)
        => payload.TryGetValue("playerId", out var v) ? v.ToString()! : throw new InvalidOperationException("playerId الزامی است.");

    private static SilverAction? BuildAction(string actionType, string playerId, Dictionary<string, object> p)
    {
        string S(string key) => p[key].ToString()!;
        List<string> L(string key) => ((System.Text.Json.JsonElement)p[key]).EnumerateArray().Select(x => x.GetString()!).ToList();

        return actionType switch
        {
            "DrawFromDeck" => new DrawFromDeckAction { PlayerId = playerId },
            "TakeFromDiscard" => new TakeFromDiscardAction { PlayerId = playerId },
            "TakeSquireCard" => new TakeSquireCardAction { PlayerId = playerId, SquireCardId = S("squireCardId") },
            "Call" => new CallAction { PlayerId = playerId },
            "DiscardDrawn" => new DiscardDrawnCardAction { PlayerId = playerId, DrawnCardId = S("drawnCardId") },
            "SwapDrawn" => new SwapDrawnCardWithOwnAction { PlayerId = playerId, DrawnCardId = S("drawnCardId"), OwnCardIdsToReplace = L("ownCardIds") },
            "SwapDiscard" => new SwapDiscardCardWithOwnAction { PlayerId = playerId, DiscardCardId = S("discardCardId"), OwnCardIdsToReplace = L("ownCardIds") },
            "ChooseFromRascalDraw" => new ChooseFromRascalDrawAction { PlayerId = playerId, ChosenCardId = S("chosenCardId") },
            "UseEmpath" => new UseEmpathAction { PlayerId = playerId, EmpathCardId = S("empathCardId"), OwnCardIdToPeek = S("ownCardIdToPeek") },
            "MoveBodyguard" => new MoveBodyguardAction { PlayerId = playerId, BodyguardCardId = S("bodyguardCardId"), TargetOwnCardId = p.ContainsKey("targetOwnCardId") ? S("targetOwnCardId") : null },
            "ExposerReveal" => new ExposerRevealOwnCardAction { PlayerId = playerId, OwnCardIdToReveal = S("ownCardIdToReveal") },
            "BeholderPeek" => new BeholderPeekAction { PlayerId = playerId, FirstOwnCardId = S("firstOwnCardId"), SecondOwnCardId = S("secondOwnCardId") },
            "RevealerReveal" => new RevealerRevealCardAction { PlayerId = playerId, TargetPlayerId = S("targetPlayerId"), TargetCardId = S("targetCardId") },
            "ApprenticeSeerPeek" => new ApprenticeSeerPeekAction { PlayerId = playerId, TargetPlayerId = S("targetPlayerId"), TargetCardId = S("targetCardId") },
            "SeerPeek" => new SeerPeekAction { PlayerId = playerId, TargetPlayerId = S("targetPlayerId"), TargetCardId = S("targetCardId") },
            "MasterSwap" => new MasterSwapAction { PlayerId = playerId, DiscardCardId = S("discardCardId"), OwnCardIdsToReplace = L("ownCardIds") },
            "WitchSwap" => new WitchSwapAction { PlayerId = playerId, TargetPlayerId = S("targetPlayerId"), TargetCardIds = L("targetCardIds") },
            "RobberSwap" => new RobberSwapAction { PlayerId = playerId, TargetPlayerId = S("targetPlayerId"), TargetCardId = S("targetCardId"), OwnCardId = S("ownCardId") },
            "SkipAbility" => new SkipCardAbilityAction { PlayerId = playerId },
            "InitialPeek" => new InitialCardPeekAction { PlayerId = playerId, OwnCardId = S("ownCardId") },
            _ => null
        };
    }
}