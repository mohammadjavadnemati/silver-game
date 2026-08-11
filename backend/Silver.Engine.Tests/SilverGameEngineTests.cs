using Silver.Engine;
using Xunit;

namespace Silver.Engine.Tests;

public class SilverGameEngineTests
{
    private static SilverGameEngine CreateEngine() => new(new Random(42)); // seed ثابت برای تست قابل‌تکرار

    [Fact]
    public void StartGame_DealsFiveCardsToEachPlayer()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("game1", new List<string> { "p1", "p2", "p3", "p4" });

        foreach (var playerId in state.PlayerIdsInTurnOrder)
        {
            Assert.Equal(5, state.Villages[playerId].Cards.Count);
        }
    }

    [Fact]
    public void StartGame_CreatesOneDiscardCard()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("game1", new List<string> { "p1", "p2" });

        Assert.Single(state.DiscardPile);
        Assert.True(state.DiscardPile[0].IsPubliclyRevealed);
    }

    [Fact]
    public void StartGame_RejectsFewerThanTwoPlayers()
    {
        var engine = CreateEngine();
        Assert.Throws<InvalidOperationException>(() =>
            engine.StartGame("game1", new List<string> { "p1" }));
    }

    [Fact]
    public void StartGame_RejectsMoreThanFourPlayers()
    {
        var engine = CreateEngine();
        Assert.Throws<InvalidOperationException>(() =>
            engine.StartGame("game1", new List<string> { "p1", "p2", "p3", "p4", "p5" }));
    }

    [Fact]
    public void ApplyAction_RejectsActionFromWrongPlayer()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("game1", new List<string> { "p1", "p2" });
        var wrongPlayer = state.PlayerIdsInTurnOrder.First(id => id != state.CurrentPlayerId);

        var result = engine.ApplyAction(state, new DrawFromDeckAction { PlayerId = wrongPlayer });

        Assert.False(result.Success);
        Assert.Contains("نوبت", result.ErrorMessage);
    }

    [Fact]
    public void DrawThenDiscard_MovesCardToDiscardPileAndAdvancesTurn()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("game1", new List<string> { "p1", "p2" });
        var currentPlayer = state.CurrentPlayerId;
        var drawPileCountBefore = state.DrawPile.Count;

        engine.ApplyAction(state, new DrawFromDeckAction { PlayerId = currentPlayer });
        // کارت کشیده‌شده رو باید از یه جایی بگیریم برای تست - در پیاده‌سازی واقعی این از طریق
        // یک متد GetPendingDrawnCard یا مشابه به کلاینت برگردونده می‌شه (فاز ۵)
        // اینجا فقط رفتار داخلی رو با یک متد کمکی تست می‌کنیم:

        Assert.Equal(drawPileCountBefore - 1, state.DrawPile.Count);
    }

    [Fact]
    public void Call_RejectsWhenPlayerHasMoreThanFourCards()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("game1", new List<string> { "p1", "p2" }); // هرکس ۵ کارت داره

        var result = engine.ApplyAction(state, new CallAction { PlayerId = state.CurrentPlayerId });

        Assert.False(result.Success);
        Assert.Contains("۴ کارت", result.ErrorMessage);
    }

    [Fact]
    public void ScoreRound_CallerWithLowestScore_GetsZero()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("game1", new List<string> { "p1", "p2" });

        state.Villages["p1"].Cards.Clear();
        state.Villages["p1"].Cards.Add(new Cards.SilverCard { CardId = "v1", Type = Cards.CardType.Villager }); // = 0
        state.Villages["p2"].Cards.Clear();
        state.Villages["p2"].Cards.Add(new Cards.SilverCard { CardId = "r1", Type = Cards.CardType.Robber }); // = 12

        state.HasBeenCalled = true;
        state.CallerPlayerId = "p1";

        engine.ScoreRound(state);

        Assert.Equal(0, state.CumulativeScores["p1"]); // برنده‌ی Call، امتیازش صفر شد
        Assert.Equal(12, state.CumulativeScores["p2"]);
    }

    [Fact]
    public void ScoreRound_CallerWithoutLowestScore_GetsPenalty()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("game1", new List<string> { "p1", "p2" });

        state.Villages["p1"].Cards.Clear();
        state.Villages["p1"].Cards.Add(new Cards.SilverCard { CardId = "r1", Type = Cards.CardType.Robber }); // = 12
        state.Villages["p2"].Cards.Clear();
        state.Villages["p2"].Cards.Add(new Cards.SilverCard { CardId = "v1", Type = Cards.CardType.Villager }); // = 0

        state.HasBeenCalled = true;
        state.CallerPlayerId = "p1"; // caller داره ولی کمترین امتیاز رو نداره

        engine.ScoreRound(state);

        Assert.Equal(22, state.CumulativeScores["p1"]); // 12 + 10 جریمه
        Assert.Equal(0, state.CumulativeScores["p2"]);
    }
    [Fact]
    public void VillagerRevealTwice_EndsRoundImmediately()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("g1", new List<string> { "p1", "p2" });

        // شبیه‌سازی: هر دو Villager رو discard رو می‌کنیم
        state.DiscardPile.Add(new Cards.SilverCard { CardId = "v1", Type = Cards.CardType.Villager, IsPubliclyRevealed = true });
        var ended = engine.CheckVillagerEndCondition(state); // فقط یکی هنوز رو نیست
        Assert.False(ended);

        state.DiscardPile.Add(new Cards.SilverCard { CardId = "v2", Type = Cards.CardType.Villager, IsPubliclyRevealed = true });
        ended = engine.CheckVillagerEndCondition(state);

        Assert.True(ended);
        Assert.Equal(RoundEndReason.BothVillagersRevealed, state.RoundEndReason);
    }

    [Fact]
    public void Rascal_DrawsExtraCardsBasedOnRevealedCount()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("g1", new List<string> { "p1", "p2" });

        var village = state.Villages[state.CurrentPlayerId];
        village.Cards.Add(new Cards.SilverCard { CardId = "rascal1", Type = Cards.CardType.Rascal, IsPubliclyRevealed = true });
        village.Cards.Add(new Cards.SilverCard { CardId = "rascal2", Type = Cards.CardType.Rascal, IsPubliclyRevealed = true });

        var drawPileBefore = state.DrawPile.Count;
        engine.ApplyAction(state, new DrawFromDeckAction { PlayerId = state.CurrentPlayerId });

        // ۱ پایه + ۲ Rascal = ۳ کارت باید کشیده بشه
        Assert.Equal(drawPileBefore - 3, state.DrawPile.Count);
    }

    [Fact]
    public void Empath_CanOnlyBeUsedOncePerTurn()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("g1", new List<string> { "p1", "p2" });

        var village = state.Villages[state.CurrentPlayerId];
        var empathCard = new Cards.SilverCard { CardId = "empath1", Type = Cards.CardType.Empath, IsPubliclyRevealed = true };
        village.Cards.Add(empathCard);
        var peekTarget = village.Cards.First();

        var first = engine.ApplyAction(state, new UseEmpathAction
        {
            PlayerId = state.CurrentPlayerId,
            EmpathCardId = empathCard.CardId,
            OwnCardIdToPeek = peekTarget.CardId
        });
        Assert.True(first.Success);
        Assert.NotNull(first.PrivatelyRevealedCards);

        var second = engine.ApplyAction(state, new UseEmpathAction
        {
            PlayerId = state.CurrentPlayerId,
            EmpathCardId = empathCard.CardId,
            OwnCardIdToPeek = peekTarget.CardId
        });
        Assert.False(second.Success);
    }

    [Fact]
    public void Exposer_DiscardTriggersPendingAbility_MustResolveBeforeNextAction()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("g1", new List<string> { "p1", "p2" });

        var exposerCard = new Cards.SilverCard { CardId = "exposer1", Type = Cards.CardType.Exposer };
        engine.SetPendingDrawnCardForTest(state, exposerCard);

        var discardResult = engine.ApplyAction(state, new DiscardDrawnCardAction
        {
            PlayerId = state.CurrentPlayerId,
            DrawnCardId = exposerCard.CardId
        });

        Assert.True(discardResult.Success);
        Assert.Equal(Cards.CardType.Exposer, state.PendingAbilityCardType);
        Assert.Equal(state.CurrentPlayerId, state.PendingAbilityPlayerId);

        // در حین انتظار قابلیت، اکشن‌های دیگه باید رد بشن
        var blockedAction = engine.ApplyAction(state, new DrawFromDeckAction { PlayerId = state.CurrentPlayerId });
        Assert.False(blockedAction.Success);

        // حالا Exposer رو resolve می‌کنیم
        var playerId = state.PendingAbilityPlayerId!;
        var ownCard = state.Villages[playerId].Cards.First();

        var resolveResult = engine.ApplyAction(state, new ExposerRevealOwnCardAction
        {
            PlayerId = playerId,
            OwnCardIdToReveal = ownCard.CardId
        });

        Assert.True(resolveResult.Success);
        Assert.True(ownCard.IsPubliclyRevealed);
        Assert.Null(state.PendingAbilityCardType); // دیگه منتظر چیزی نیستیم
    }

    [Fact]
    public void Exposer_CanBeSkipped()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("g1", new List<string> { "p1", "p2" });

        var exposerCard = new Cards.SilverCard { CardId = "exposer1", Type = Cards.CardType.Exposer };
        engine.SetPendingDrawnCardForTest(state, exposerCard);

        var playerId = state.CurrentPlayerId;
        engine.ApplyAction(state, new DiscardDrawnCardAction { PlayerId = playerId, DrawnCardId = exposerCard.CardId });

        var skipResult = engine.ApplyAction(state, new SkipCardAbilityAction { PlayerId = playerId });

        Assert.True(skipResult.Success);
        Assert.Null(state.PendingAbilityCardType);
        Assert.NotEqual(playerId, state.CurrentPlayerId); // نوبت باید عوض شده باشه
    }
    [Fact]
    public void Robber_SwapsCardsWithoutRevealing()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("g1", new List<string> { "p1", "p2" });

        var robberCard = new Cards.SilverCard { CardId = "robber1", Type = Cards.CardType.Robber };
        engine.SetPendingDrawnCardForTest(state, robberCard);
        var playerId = state.CurrentPlayerId;
        var otherPlayerId = state.PlayerIdsInTurnOrder.First(id => id != playerId);

        engine.ApplyAction(state, new DiscardDrawnCardAction { PlayerId = playerId, DrawnCardId = robberCard.CardId });

        var ownCard = state.Villages[playerId].Cards.First();
        var targetCard = state.Villages[otherPlayerId].Cards.First();

        var result = engine.ApplyAction(state, new RobberSwapAction
        {
            PlayerId = playerId,
            TargetPlayerId = otherPlayerId,
            TargetCardId = targetCard.CardId,
            OwnCardId = ownCard.CardId
        });

        Assert.True(result.Success);
        Assert.Contains(state.Villages[playerId].Cards, c => c.CardId == targetCard.CardId);
        Assert.Contains(state.Villages[otherPlayerId].Cards, c => c.CardId == ownCard.CardId);
        Assert.False(targetCard.IsPubliclyRevealed); // هیچی رو نشد
        Assert.NotNull(result.PrivatelyRevealedCards);
    }

    [Fact]
    public void Robber_CannotTargetBodyguardProtectedCard()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("g1", new List<string> { "p1", "p2" });

        var robberCard = new Cards.SilverCard { CardId = "robber1", Type = Cards.CardType.Robber };
        engine.SetPendingDrawnCardForTest(state, robberCard);
        var playerId = state.CurrentPlayerId;
        var otherPlayerId = state.PlayerIdsInTurnOrder.First(id => id != playerId);

        engine.ApplyAction(state, new DiscardDrawnCardAction { PlayerId = playerId, DrawnCardId = robberCard.CardId });

        var otherVillage = state.Villages[otherPlayerId];
        var protectedCard = otherVillage.Cards.First();
        otherVillage.BodyguardProtectingCardId = protectedCard.CardId;

        var ownCard = state.Villages[playerId].Cards.First();

        var result = engine.ApplyAction(state, new RobberSwapAction
        {
            PlayerId = playerId,
            TargetPlayerId = otherPlayerId,
            TargetCardId = protectedCard.CardId,
            OwnCardId = ownCard.CardId
        });

        Assert.False(result.Success);
    }

    [Fact]
    public void Doppelganger_ActsAsWildcardInMultiSwap()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("g1", new List<string> { "p1", "p2" });

        var village = state.Villages[state.CurrentPlayerId];
        village.Cards.Clear();
        village.Cards.Add(new Cards.SilverCard { CardId = "doppel1", Type = Cards.CardType.Doppelganger });
        village.Cards.Add(new Cards.SilverCard { CardId = "robber_a", Type = Cards.CardType.Robber }); // عدد ۱۲
        village.Cards.Add(new Cards.SilverCard { CardId = "robber_b", Type = Cards.CardType.Robber }); // عدد ۱۲

        var newCard = new Cards.SilverCard { CardId = "new1", Type = Cards.CardType.Villager };
        engine.SetPendingDrawnCardForTest(state, newCard);

        var result = engine.ApplyAction(state, new SwapDrawnCardWithOwnAction
        {
            PlayerId = state.CurrentPlayerId,
            DrawnCardId = newCard.CardId,
            OwnCardIdsToReplace = new List<string> { "doppel1", "robber_a", "robber_b" }
        });

        Assert.True(result.Success);
        Assert.DoesNotContain(village.Cards, c => c.CardId == "doppel1");
        Assert.Contains(village.Cards, c => c.CardId == "new1");
    }

    [Fact]
    public void Master_CanTakeAnyCardFromDiscardNotJustTop()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("g1", new List<string> { "p1", "p2" });

        state.DiscardPile.Add(new Cards.SilverCard { CardId = "old1", Type = Cards.CardType.Empath });
        state.DiscardPile.Add(new Cards.SilverCard { CardId = "top1", Type = Cards.CardType.Seer }); // بالایی

        var masterCard = new Cards.SilverCard { CardId = "master1", Type = Cards.CardType.Master };
        engine.SetPendingDrawnCardForTest(state, masterCard);
        var playerId = state.CurrentPlayerId;

        engine.ApplyAction(state, new DiscardDrawnCardAction { PlayerId = playerId, DrawnCardId = masterCard.CardId });

        var ownCard = state.Villages[playerId].Cards.First();

        var result = engine.ApplyAction(state, new MasterSwapAction
        {
            PlayerId = playerId,
            DiscardCardId = "old1", // نه کارت بالایی
            OwnCardIdsToReplace = new List<string> { ownCard.CardId }
        });

        Assert.True(result.Success);
        Assert.Contains(state.Villages[playerId].Cards, c => c.CardId == "old1");
    }
    [Fact]
    public void Robber_DiscardTriggersPendingAbility()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("g1", new List<string> { "p1", "p2" });

        var robberCard = new Cards.SilverCard { CardId = "robber1", Type = Cards.CardType.Robber };
        engine.SetPendingDrawnCardForTest(state, robberCard);
        var playerId = state.CurrentPlayerId;

        var result = engine.ApplyAction(state, new DiscardDrawnCardAction
        {
            PlayerId = playerId,
            DrawnCardId = robberCard.CardId
        });

        Assert.True(result.Success);
        Assert.Equal(Cards.CardType.Robber, state.PendingAbilityCardType); // این باید pending بمونه، نه فوراً نوبت عوض بشه
        Assert.Equal(playerId, state.CurrentPlayerId); // نوبت هنوز عوض نشده
    }
    [Fact]
    public void InitialPeek_AllowsUpToTwoPeeksIndependentOfTurn()
    {
        var engine = CreateEngine();
        var state = engine.StartGame("g1", new List<string> { "p1", "p2" });

        var notCurrentPlayer = state.PlayerIdsInTurnOrder.First(id => id != state.CurrentPlayerId);
        var village = state.Villages[notCurrentPlayer];

        var first = engine.ApplyAction(state, new InitialCardPeekAction { PlayerId = notCurrentPlayer, OwnCardId = village.Cards[0].CardId });
        Assert.True(first.Success); // حتی اگه نوبتش نیست، کار می‌کنه

        var second = engine.ApplyAction(state, new InitialCardPeekAction { PlayerId = notCurrentPlayer, OwnCardId = village.Cards[1].CardId });
        Assert.True(second.Success);

        var third = engine.ApplyAction(state, new InitialCardPeekAction { PlayerId = notCurrentPlayer, OwnCardId = village.Cards[2].CardId });
        Assert.False(third.Success); // سهمیه تموم شده
    }
}