using Silver.Engine;
using Silver.Engine.Cards;

namespace Silver.Api.Services;

public record PlayerFacingUpdate(
    object PublicState,        // چیزی که همه می‌بینن (بدون مقدار کارت‌های پشت‌ورو)
    Dictionary<string, object> PrivateReveals // playerId -> اطلاعات خصوصی مخصوص همون بازیکن (اگه باشه)
);

public class GameSessionService
{
    private readonly SilverGameEngine _engine = new();
    private readonly IGameStateStore _store;
    private readonly RoomService _roomService;

    public GameSessionService(IGameStateStore store, RoomService roomService)
    {
        _store = store;
        _roomService = roomService;
    }

    public async Task<SilverGameState> StartGameAsync(string roomCode)
    {
        var room = _roomService.GetRoom(roomCode)
            ?? throw new InvalidOperationException("اتاق پیدا نشد.");

        var playerIds = room.Players.Select(p => p.PlayerId).ToList();
        var state = _engine.StartGame(roomCode, playerIds); // از roomCode به‌عنوان gameId استفاده می‌کنیم

        await _store.SaveAsync(state);
        return state;
    }

    public async Task<SilverActionResult> ApplyActionAsync(string gameId, SilverAction action)
    {
        var state = await _store.GetAsync(gameId);
        if (state == null)
            return SilverActionResult.Fail("بازی پیدا نشد.");

        var result = _engine.ApplyAction(state, action);

        // حتی وقتی Fail شده، ممکنه state واقعاً تغییر کرده باشه (نوبت رد شده، کارت سوخته) - پس هر وقت UpdatedState داریم، سیوش کن
        if (result.UpdatedState != null)
            await _store.SaveAsync(result.UpdatedState);

        return result;
    }

    public async Task<SilverGameState?> GetStateAsync(string gameId) => await _store.GetAsync(gameId);

    /// <summary>
    /// نسخه‌ای از state که برای یک بازیکن خاص امنه: کارت‌های پشت‌ورو دیگران مقدار Type ندارن،
    /// مگر همون کارت‌هایی که به‌واسطه‌ی PrivatelyRevealedCards به این بازیکن نشون داده شده.
    /// </summary>
    public object BuildPlayerFacingState(SilverGameState state, string forPlayerId, Dictionary<string, CardType>? privatelyRevealed = null)
    {
        object MapCard(SilverCard card, bool ownerIsViewer)
        {
            bool viewerCanSeeType = card.IsPubliclyRevealed
                || (privatelyRevealed != null && privatelyRevealed.ContainsKey(card.CardId));

            return new
            {
                cardId = card.CardId,
                type = viewerCanSeeType ? card.Type.ToString() : null,
                value = viewerCanSeeType ? (int?)card.Value : null,
                isPubliclyRevealed = card.IsPubliclyRevealed
            };
        }

        return new
        {
            gameId = state.GameId,
            phase = state.Phase.ToString(),
            roundNumber = state.RoundNumber,
            initialPeekDeadlineUtc = state.InitialPeekDeadlineUtc,
            currentPlayerId = state.CurrentPlayerId,
            playerIdsInTurnOrder = state.PlayerIdsInTurnOrder,
            cumulativeScores = state.CumulativeScores,
            hasBeenCalled = state.HasBeenCalled,
            isFinalRoundDeclared = state.IsFinalRoundDeclared,
            finalRoundDeclarerPlayerId = state.FinalRoundDeclarerPlayerId,
            callerPlayerId = state.CallerPlayerId,
            amuletHolderPlayerId = state.AmuletHolderPlayerId,
            drawPileCount = state.DrawPile.Count,
            discardPileTop = state.DiscardPile.Count > 0 ? MapCard(state.DiscardPile[^1], false) : null,
            discardPile = state.DiscardPile.Select(c => MapCard(c, false)).ToList(),
            discardPileCount = state.DiscardPile.Count,
            squireRevealedCards = state.SquireRevealedCards.Select(c => MapCard(c, false)),
            pendingAbilityPlayerId = state.PendingAbilityPlayerId,
            pendingAbilityCardType = state.PendingAbilityCardType?.ToString(),
            abilityUsedThisTurn = forPlayerId == state.PendingAbilityPlayerId && state.SeerPeekUsedThisAbility,
            drawnCardSource = state.DrawnCardSource.ToString(),
            // کارت کشیده‌شده فقط برای صاحبش با جزئیات کامل نشون داده می‌شه
            pendingRascalChoiceOptions = (state.PendingRascalChoiceOptions != null && forPlayerId == state.CurrentPlayerId)
    ? state.PendingRascalChoiceOptions.Select(c => new
    {
        cardId = c.CardId,
        type = c.Type.ToString(),
        value = (int?)c.Value,
        isPubliclyRevealed = false
    }).ToList()
    : null,
            pendingDrawnCard = state.PendingDrawnCard != null

            ? (forPlayerId == state.CurrentPlayerId
                ? new
                {
                    cardId = state.PendingDrawnCard.CardId,
                    type = state.PendingDrawnCard.Type.ToString(),
                    value = (int?)state.PendingDrawnCard.Value,
                    isPubliclyRevealed = false
                }
                : new
                {
                    cardId = state.PendingDrawnCard.CardId,
                    type = (string?)null,
                    value = (int?)null,
                    isPubliclyRevealed = false
                })
            : null,
            pendingWitchCard = (state.PendingAbilityCardType == CardType.Witch
                     && forPlayerId == state.PendingAbilityPlayerId
                     && state.PendingWitchCard != null)
            ? new
            {
                cardId = state.PendingWitchCard.CardId,
                type = state.PendingWitchCard.Type.ToString(),
                value = (int?)state.PendingWitchCard.Value,
                isPubliclyRevealed = false
            }
            : null,
            villages = state.Villages.ToDictionary(
                kv => kv.Key,
                kv => new
                {
                    playerId = kv.Key,
                    bodyguardProtectingCardId = kv.Key == forPlayerId ? kv.Value.BodyguardProtectingCardId : null,
                    amuletCoveredCardId = kv.Key == forPlayerId ? kv.Value.AmuletCoveredCardId : null,
                    cards = kv.Value.Cards.Select(c => MapCard(c, kv.Key == forPlayerId)).ToList()
                }
            ),

            winnerPlayerId = state.WinnerPlayerId,
            roundEndReason = state.RoundEndReason.ToString(),
            lastRoundScores = state.LastRoundScores,
            myInitialPeeksRemaining = SilverGameState.MaxInitialPeeksPerRound - state.InitialPeeksUsedByPlayer.GetValueOrDefault(forPlayerId, 0),
            sideActionUsedThisTurn = forPlayerId == state.CurrentPlayerId && state.SideActionUsedThisTurn,
        };
    }
}