namespace Silver.Engine;

using Silver.Engine.Cards;


public class SilverGameEngine
{
    private readonly Random _random;

    public SilverGameEngine(Random? random = null)
    {
        _random = random ?? new Random();
    }

    // ------------------ شروع بازی و راند ------------------

    public SilverGameState StartGame(string gameId, List<string> playerIdsInTurnOrder)
    {
        if (playerIdsInTurnOrder.Count < 2 || playerIdsInTurnOrder.Count > 4)
            throw new InvalidOperationException("بازی سیلور بین ۲ تا ۴ بازیکن پشتیبانی می‌شود.");

        var state = new SilverGameState
        {
            GameId = gameId,
            PlayerIdsInTurnOrder = new List<string>(playerIdsInTurnOrder),
        };

        foreach (var playerId in playerIdsInTurnOrder)
        {
            state.Villages[playerId] = new SilverPlayerVillage { PlayerId = playerId };
            state.CumulativeScores[playerId] = 0;
        }

        StartNewRound(state, firstRound: true);
        return state;
    }

    private void StartNewRound(SilverGameState state, bool firstRound)
    {
        var deck = CardDefinitions.BuildFullDeck();
        Shuffle(deck);

        state.DrawPile.Clear();
        state.DrawPile.AddRange(deck);

        state.DiscardPile.Clear();
        state.SquireRevealedCards.Clear();
        state.InitialPeeksUsedByPlayer.Clear();
        foreach (var playerId in state.PlayerIdsInTurnOrder)
            state.InitialPeeksUsedByPlayer[playerId] = 0;
        state.InitialPeekDeadlineUtc =
            DateTime.UtcNow.AddSeconds(SilverGameState.InitialPeekDurationSeconds);
        foreach (var village in state.Villages.Values)
        {
            village.Cards.Clear();
            village.BodyguardProtectingCardId = null;
            village.AmuletCoveredCardId = null;
        }

        foreach (var playerId in state.PlayerIdsInTurnOrder)
        {
            var village = state.Villages[playerId];
            for (int i = 0; i < 5; i++)
                village.Cards.Add(DrawTopOfDeck(state));
        }

        var firstDiscard = DrawTopOfDeck(state);
        firstDiscard.IsPubliclyRevealed = true;
        state.DiscardPile.Add(firstDiscard);

        if (firstRound)
        {
            var starterIndex = _random.Next(state.PlayerIdsInTurnOrder.Count);
            state.CurrentPlayerId = state.PlayerIdsInTurnOrder[starterIndex];
            state.AmuletHolderPlayerId = state.CurrentPlayerId;
        }
        else
        {
            state.CurrentPlayerId = state.AmuletHolderPlayerId ?? state.PlayerIdsInTurnOrder[0];
        }
        state.InitialPeeksUsedByPlayer.Clear();
        foreach (var playerId in state.PlayerIdsInTurnOrder)
            state.InitialPeeksUsedByPlayer[playerId] = 0;

        state.HasBeenCalled = false;
        state.CallerPlayerId = null;
        // state.RoundEndReason = RoundEndReason.None;
        state.PendingDrawnCard = null;

        state.DrawnCardSource = PendingDrawnCardSource.None;
        state.PendingRascalChoiceOptions = null;
        state.SideActionUsedThisTurn = false;
        ClearPendingAbility(state);

        state.Phase = GamePhase.RoundInProgress;

        state.InitialPeekDeadlineUtc =
            DateTime.UtcNow.AddSeconds(SilverGameState.InitialPeekDurationSeconds);

        state.UpdatedAt = DateTime.UtcNow;

        // چک اولیه
        CheckVillagerEndCondition(state);
        SyncSquireRevealedCards(state);
    }

    private static SilverCard DrawTopOfDeck(SilverGameState state)
    {
        if (state.DrawPile.Count == 0)
            throw new InvalidOperationException("دسته‌ی اصلی خالی است.");

        var card = state.DrawPile[^1];
        state.DrawPile.RemoveAt(state.DrawPile.Count - 1);
        return card;
    }

    private void Shuffle(List<SilverCard> cards)
    {
        for (int i = cards.Count - 1; i > 0; i--)
        {
            int j = _random.Next(i + 1);
            (cards[i], cards[j]) = (cards[j], cards[i]);
        }
    }

    // ------------------ اعتبارسنجی عمومی ------------------

    private SilverActionResult? ValidateCommonTurnPreconditions(SilverGameState state, SilverAction action, bool requiresCurrentPlayerTurn = true)
    {
        if (state.Phase != GamePhase.RoundInProgress && state.Phase != GamePhase.FinalTurnsAfterCall)
            return SilverActionResult.Fail("در حال حاضر راندی در جریان نیست.");

        if (requiresCurrentPlayerTurn && action.PlayerId != state.CurrentPlayerId)
            return SilverActionResult.Fail("الان نوبت این بازیکن نیست.");

        if (!state.Villages.ContainsKey(action.PlayerId))
            return SilverActionResult.Fail("این بازیکن در بازی نیست.");

        return null;
    }

    // ------------------ مسیریابی اکشن‌ها ------------------

    public SilverActionResult ApplyAction(SilverGameState state, SilverAction action)
    {
        if (action is InitialCardPeekAction initialPeek)
            return HandleInitialCardPeek(state, initialPeek);

        var precheck = ValidateCommonTurnPreconditions(state, action);
        if (precheck != null) return precheck;

        // اگر منتظر resolve شدن یه قابلیتیم، فقط اکشن‌های مرتبط با همون قابلیت (یا Skip) قابل قبولن
        if (state.PendingAbilityPlayerId != null)
        {
            return action switch
            {
                ExposerRevealOwnCardAction a => HandleExposerReveal(state, a),
                BeholderPeekAction a => HandleBeholderPeek(state, a),
                RevealerRevealCardAction a => HandleRevealerReveal(state, a),
                ApprenticeSeerPeekAction a => HandleApprenticeSeerPeek(state, a),
                SeerPeekAction a => HandleSeerPeek(state, a),
                MasterSwapAction a => HandleMasterSwap(state, a),
                WitchSwapAction a => HandleWitchSwap(state, a),
                RobberSwapAction a => HandleRobberSwap(state, a),
                SkipCardAbilityAction => HandleSkipAbility(state, action),
                _ => SilverActionResult.Fail("یک قابلیت کارت در انتظار تصمیم توست؛ اول اون رو انجام بده یا Skip کن.")
            };
        }

        return action switch
        {
            DrawFromDeckAction => HandleDrawFromDeck(state, action),
            ChooseFromRascalDrawAction a => HandleChooseFromRascalDraw(state, a),
            TakeFromDiscardAction => HandleTakeFromDiscard(state, action),
            TakeSquireCardAction a => HandleTakeSquireCard(state, a),
            CallAction => HandleCall(state, action),
            DiscardDrawnCardAction a => HandleDiscardDrawn(state, a),
            SwapDrawnCardWithOwnAction a => HandleSwapDrawn(state, a),
            SwapDiscardCardWithOwnAction a => HandleSwapDiscard(state, a),
            UseEmpathAction a => HandleUseEmpath(state, a),
            MoveBodyguardAction a => HandleMoveBodyguard(state, a),
            _ => SilverActionResult.Fail("این اکشن هنوز پشتیبانی نمی‌شود.")
        };
    }

    // کارت(های) در انتظار تصمیم بین Draw/TakeFromDiscard و Discard/Swap
    // private readonly Dictionary<string, SilverCard> _pendingDrawnCard = new();
    // private readonly Dictionary<string, List<SilverCard>> _pendingRascalChoice = new();

    // ------------------ کشیدن از دسته اصلی (+ Rascal) ------------------




    // ------------------ برداشتن از discard ------------------


    // ------------------ برداشتن کارت کمکی Squire ------------------



    // ------------------ تصمیم بعد از Draw/TakeFromDiscard/TakeSquire ------------------
    private static readonly HashSet<CardType> CardTypesRequiringAbilityResolution = new()
    {
        CardType.Exposer, CardType.Beholder, CardType.Revealer,
        CardType.ApprenticeSeer, CardType.Seer, CardType.Master,
        CardType.Witch, CardType.Robber
    };
    private SilverActionResult HandleDiscardDrawn(SilverGameState state, DiscardDrawnCardAction action)
    {
        if (state.PendingDrawnCard == null || state.PendingDrawnCard.CardId != action.DrawnCardId)
            return SilverActionResult.Fail("کارت کشیده‌شده‌ی معتبری برای دور انداختن پیدا نشد.");

        var pending = state.PendingDrawnCard;
        pending.IsPubliclyRevealed = true;
        state.DiscardPile.Add(pending);
        state.PendingDrawnCard = null;
        state.DrawnCardSource = PendingDrawnCardSource.None;

        if (CheckVillagerEndCondition(state))
            return SilverActionResult.Ok(state);

        // if (CardTypesRequiringAbilityResolution.Contains(pending.Type))
        // {
        //     state.PendingAbilityPlayerId = action.PlayerId;
        //     state.PendingAbilityCardType = pending.Type;
        //     state.PendingAbilityCardId = pending.CardId;

        //     Dictionary<string, CardType>? privateInfo = null;
        //     if (pending.Type == CardType.Witch && state.DrawPile.Count > 0)
        //     {
        //         var topOfDeck = state.DrawPile[^1];
        //         privateInfo = new Dictionary<string, CardType> { [topOfDeck.CardId] = topOfDeck.Type };
        //     }

        //     return SilverActionResult.Ok(state, privateInfo);
        // }

        AdvanceTurn(state);
        return SilverActionResult.Ok(state);
    }

    private SilverActionResult HandleSwapDrawn(SilverGameState state, SwapDrawnCardWithOwnAction action)
    {
        if (state.PendingDrawnCard == null || state.PendingDrawnCard.CardId != action.DrawnCardId)
            return SilverActionResult.Fail("کارت کشیده‌شده‌ی معتبری برای تعویض پیدا نشد.");

        var village = state.Villages[action.PlayerId];
        var drawnCard = state.PendingDrawnCard;
        var swapResult = TrySwapMultiple(village, action.OwnCardIdsToReplace, drawnCard, state);

        state.PendingDrawnCard = null;

        if (!swapResult.Success)
        {
            // تعویض ناموفق بود: کارت‌های خودت (که TrySwapMultiple دست‌نخورده گذاشته) توی روستا می‌مونن،
            // ولی کارت کشیده‌شده دیگه نمی‌تونه به دستت برگرده - می‌سوزه، و نوبت طبق قانون تموم می‌شه.
            drawnCard.IsPubliclyRevealed = true;
            state.DiscardPile.Add(drawnCard);

            if (CheckVillagerEndCondition(state))
                return swapResult;

            AdvanceTurn(state);
            return swapResult; // پیام خطا رو نگه می‌داریم تا فرانت بتونه نشون بده چرا شکست خورد
        }

        if (CheckVillagerEndCondition(state))
            return SilverActionResult.Ok(state);

        AdvanceTurn(state);
        return SilverActionResult.Ok(state);
    }

    private SilverActionResult HandleSwapDiscard(SilverGameState state, SwapDiscardCardWithOwnAction action)
    {
        if (state.PendingDrawnCard == null || state.PendingDrawnCard.CardId != action.DiscardCardId)
            return SilverActionResult.Fail("کارت دورریختنیِ معتبری برای تعویض پیدا نشد.");

        if (state.DiscardPile.Count == 0 || state.DiscardPile[^1].CardId != state.PendingDrawnCard.CardId)
            return SilverActionResult.Fail("این کارت دیگر بالای دسته‌ی دورریختنی نیست.");

        state.DiscardPile.RemoveAt(state.DiscardPile.Count - 1);

        var village = state.Villages[action.PlayerId];
        var swapResult = TrySwapMultiple(village, action.OwnCardIdsToReplace, state.PendingDrawnCard, state);
        if (!swapResult.Success) return swapResult;

        state.PendingDrawnCard = null;
        state.DrawnCardSource = PendingDrawnCardSource.None;

        if (CheckVillagerEndCondition(state))
            return SilverActionResult.Ok(state);

        AdvanceTurn(state);
        return SilverActionResult.Ok(state);
    }

    private SilverActionResult TrySwapMultiple(
        SilverPlayerVillage village,
        List<string> ownCardIdsToReplace,
        SilverCard newCard,
        SilverGameState state)
    {
        if (ownCardIdsToReplace.Count == 0)
            return SilverActionResult.Fail("حداقل باید یک کارت برای تعویض انتخاب شود.");

        var selectedCards = new List<SilverCard>();
        foreach (var cardId in ownCardIdsToReplace)
        {
            var found = village.Cards.FirstOrDefault(c => c.CardId == cardId);
            if (found == null)
                return SilverActionResult.Fail($"کارت {cardId} در روستای این بازیکن پیدا نشد.");
            selectedCards.Add(found);
        }

        bool allSameValue = AreSameValueConsideringDoppelganger(selectedCards);

        if (!allSameValue)
        {
            if (selectedCards.Count >= 3 && state.DrawPile.Count > 0)
            {
                var penaltyCard = state.DrawPile[^1];
                state.DrawPile.RemoveAt(state.DrawPile.Count - 1);
                village.Cards.Add(penaltyCard);
            }
            return SilverActionResult.Fail("کارت‌های انتخاب‌شده هم‌عدد نبودند؛ تعویض لغو شد.");
        }

        foreach (var card in selectedCards)
        {
            village.Cards.Remove(card);
            card.IsPubliclyRevealed = true;
            state.DiscardPile.Add(card);

            // اگر Bodyguard یکی از کارت‌های حذف‌شده بود، محافظتش پاک می‌شه
            if (village.BodyguardProtectingCardId == card.CardId)
                village.BodyguardProtectingCardId = null;
        }

        // newCard.IsPubliclyRevealed = false;
        // village.Cards.Add(newCard);
        village.Cards.Add(newCard);

        return SilverActionResult.Ok(state);
    }

    // ------------------ اکشن‌های جانبی اختیاری (Empath / Bodyguard) ------------------

    private SilverActionResult HandleUseEmpath(SilverGameState state, UseEmpathAction action)
    {
        if (state.SideActionUsedThisTurn)
            return SilverActionResult.Fail("در این نوبت قبلاً از یک اکشن جانبی استفاده کرده‌ای.");

        var village = state.Villages[action.PlayerId];
        var empathCard = village.Cards.FirstOrDefault(c => c.CardId == action.EmpathCardId && c.IsPubliclyRevealed && c.Type == CardType.Empath);
        if (empathCard == null)
            return SilverActionResult.Fail("Empath رو‌شده‌ای در روستای تو پیدا نشد.");

        var targetCard = village.Cards.FirstOrDefault(c => c.CardId == action.OwnCardIdToPeek);
        if (targetCard == null)
            return SilverActionResult.Fail("کارت هدف در روستای تو پیدا نشد.");

        state.SideActionUsedThisTurn = true;

        var privateInfo = new Dictionary<string, CardType> { [targetCard.CardId] = targetCard.Type };
        return SilverActionResult.Ok(state, privateInfo);
    }

    private SilverActionResult HandleMoveBodyguard(SilverGameState state, MoveBodyguardAction action)
    {
        if (state.SideActionUsedThisTurn)
            return SilverActionResult.Fail("در این نوبت قبلاً از یک اکشن جانبی استفاده کرده‌ای.");

        var village = state.Villages[action.PlayerId];
        var bodyguardCard = village.Cards.FirstOrDefault(c => c.CardId == action.BodyguardCardId && c.IsPubliclyRevealed && c.Type == CardType.Bodyguard);
        if (bodyguardCard == null)
            return SilverActionResult.Fail("Bodyguard رو‌شده‌ای در روستای تو پیدا نشد.");

        if (action.TargetOwnCardId != null)
        {
            var target = village.Cards.FirstOrDefault(c => c.CardId == action.TargetOwnCardId);
            if (target == null)
                return SilverActionResult.Fail("کارت هدف در روستای تو پیدا نشد.");
            if (target.CardId == bodyguardCard.CardId)
                return SilverActionResult.Fail("Bodyguard نمی‌تواند از خودش محافظت کند.");

            village.BodyguardProtectingCardId = target.CardId;
        }
        else
        {
            village.BodyguardProtectingCardId = null; // برداشتن محافظت
        }

        state.SideActionUsedThisTurn = true;
        return SilverActionResult.Ok(state);
    }

    // ------------------ حل قابلیت‌های discard-triggered ------------------

    private SilverActionResult HandleExposerReveal(SilverGameState state, ExposerRevealOwnCardAction action)
    {
        if (state.PendingAbilityCardType != CardType.Exposer || state.PendingAbilityPlayerId != action.PlayerId)
            return SilverActionResult.Fail("در حال حاضر منتظر قابلیت Exposer نیستیم.");

        var village = state.Villages[action.PlayerId];
        var target = village.Cards.FirstOrDefault(c => c.CardId == action.OwnCardIdToReveal);
        if (target == null)
            return SilverActionResult.Fail("کارت هدف در روستای تو پیدا نشد.");

        target.IsPubliclyRevealed = true;

        ClearPendingAbility(state);

        if (CheckVillagerEndCondition(state))
            return SilverActionResult.Ok(state);

        AdvanceTurn(state);
        return SilverActionResult.Ok(state);
    }

    private SilverActionResult HandleBeholderPeek(SilverGameState state, BeholderPeekAction action)
    {
        if (state.PendingAbilityCardType != CardType.Beholder || state.PendingAbilityPlayerId != action.PlayerId)
            return SilverActionResult.Fail("در حال حاضر منتظر قابلیت Beholder نیستیم.");

        var village = state.Villages[action.PlayerId];
        var first = village.Cards.FirstOrDefault(c => c.CardId == action.FirstOwnCardId);
        var second = village.Cards.FirstOrDefault(c => c.CardId == action.SecondOwnCardId);

        if (first == null || second == null)
            return SilverActionResult.Fail("یکی از کارت‌های هدف در روستای تو پیدا نشد.");
        if (first.CardId == second.CardId)
            return SilverActionResult.Fail("باید دو کارت متفاوت انتخاب کنی.");

        var privateInfo = new Dictionary<string, CardType>
        {
            [first.CardId] = first.Type,
            [second.CardId] = second.Type
        };

        ClearPendingAbility(state);

        if (CheckVillagerEndCondition(state))
            return SilverActionResult.Ok(state, privateInfo);

        AdvanceTurn(state);
        return SilverActionResult.Ok(state, privateInfo);
    }

    private SilverActionResult HandleSkipAbility(SilverGameState state, SilverAction action)
    {
        if (state.PendingAbilityPlayerId != action.PlayerId)
            return SilverActionResult.Fail("قابلیتی برای این بازیکن در انتظار نیست.");

        ClearPendingAbility(state);
        AdvanceTurn(state);
        return SilverActionResult.Ok(state);
    }

    private void ClearPendingAbility(SilverGameState state)
    {
        state.PendingAbilityPlayerId = null;
        state.PendingAbilityCardType = null;
        state.PendingAbilityCardId = null;
    }

    // ------------------ Call ------------------

    private SilverActionResult HandleCall(SilverGameState state, SilverAction action)
    {
        var village = state.Villages[action.PlayerId];
        if (village.Cards.Count > 4)
            return SilverActionResult.Fail("برای Call باید ۴ کارت یا کمتر داشته باشی.");

        state.HasBeenCalled = true;
        state.CallerPlayerId = action.PlayerId;
        state.Phase = GamePhase.FinalTurnsAfterCall;

        AdvanceTurn(state);
        return SilverActionResult.Ok(state);
    }
    private SilverActionResult HandleInitialCardPeek(
    SilverGameState state,
    InitialCardPeekAction action)
    {
        if (state.Phase != GamePhase.RoundInProgress)
            return SilverActionResult.Fail(
                "در حال حاضر امکان دیدن کارت‌های اولیه وجود ندارد.");

        if (!state.Villages.TryGetValue(action.PlayerId, out var village))
            return SilverActionResult.Fail(
                "این بازیکن در بازی نیست.");

        var usedSoFar =
            state.InitialPeeksUsedByPlayer.GetValueOrDefault(action.PlayerId, 0);

        if (usedSoFar >= SilverGameState.MaxInitialPeeksPerRound)
            return SilverActionResult.Fail(
                "سهمیه‌ی دیدن کارت‌های اولیه‌ت تموم شده.");

        var card = village.Cards.FirstOrDefault(
            c => c.CardId == action.OwnCardId);

        if (card == null)
            return SilverActionResult.Fail(
                "کارت هدف در روستای تو پیدا نشد.");

        if (card.IsPubliclyRevealed)
            return SilverActionResult.Fail(
                "این کارت از قبل رو شده است.");

        state.InitialPeeksUsedByPlayer[action.PlayerId] = usedSoFar + 1;

        var privateInfo = new Dictionary<string, CardType>
        {
            [card.CardId] = card.Type
        };

        state.UpdatedAt = DateTime.UtcNow;

        return SilverActionResult.Ok(state, privateInfo);
    }

    // ------------------ گردش نوبت ------------------

    private void AdvanceTurn(SilverGameState state)
    {
        var currentIndex = state.PlayerIdsInTurnOrder.IndexOf(state.CurrentPlayerId);
        var nextIndex = (currentIndex + 1) % state.PlayerIdsInTurnOrder.Count;
        var nextPlayerId = state.PlayerIdsInTurnOrder[nextIndex];

        if (state.Phase == GamePhase.FinalTurnsAfterCall && nextPlayerId == state.CallerPlayerId)
        {
            EndRound(state, RoundEndReason.Call);
            return;
        }

        state.CurrentPlayerId = nextPlayerId;
        state.SideActionUsedThisTurn = false;
        state.UpdatedAt = DateTime.UtcNow;

        SyncSquireRevealedCards(state);
    }

    // ------------------ Villager: پایان زودهنگام راند ------------------

    /// <returns>true اگر راند به‌خاطر این قانون تموم شد</returns>
    internal bool CheckVillagerEndCondition(SilverGameState state)
    {
        var revealedVillagerCount =
            state.DiscardPile.Count(c => c.Type == CardType.Villager && c.IsPubliclyRevealed) +
            state.Villages.Values.Sum(v => v.Cards.Count(c => c.Type == CardType.Villager && c.IsPubliclyRevealed));

        if (revealedVillagerCount >= 2)
        {
            EndRound(state, RoundEndReason.BothVillagersRevealed);
            return true;
        }

        return false;
    }

    // ------------------ Squire: sync کردن کارت‌های کمکی ------------------

    internal void SyncSquireRevealedCards(SilverGameState state)
    {
        var revealedSquireCount = state.Villages.Values
            .Sum(v => v.Cards.Count(c => c.Type == CardType.Squire && c.IsPubliclyRevealed));

        while (state.SquireRevealedCards.Count < revealedSquireCount && state.DrawPile.Count > 0)
        {
            var card = DrawTopOfDeck(state);
            card.IsPubliclyRevealed = true;
            state.SquireRevealedCards.Add(card);
        }
        // اگر تعداد Squire کم بشه، کارت‌های اضافه‌ی قبلی حذف نمی‌شن (طبق تاییدت)
    }

    // ------------------ پایان راند و امتیازدهی ------------------

    internal void EndRound(SilverGameState state, RoundEndReason reason)
    {
        state.RoundEndReason = reason;
        state.Phase = GamePhase.RoundScoring;

        ScoreRound(state);

        if (state.RoundNumber >= SilverGameState.TotalRounds)
        {
            state.Phase = GamePhase.GameFinished;
            state.WinnerPlayerId = state.CumulativeScores.OrderBy(kv => kv.Value).First().Key;
        }
        else
        {
            state.RoundNumber++;
            StartNewRound(state, firstRound: false);
        }
    }

    internal void ScoreRound(SilverGameState state)
    {
        var rawScores = state.Villages.ToDictionary(kv => kv.Key, kv => kv.Value.TotalScore());

        if (state.HasBeenCalled && state.CallerPlayerId != null)
        {
            var minScore = rawScores.Values.Min();
            var callerScore = rawScores[state.CallerPlayerId];

            if (callerScore == minScore)
            {
                rawScores[state.CallerPlayerId] = 0;
                state.AmuletHolderPlayerId = state.CallerPlayerId;
            }
            else
            {
                rawScores[state.CallerPlayerId] += 10;
            }
        }

        foreach (var (playerId, score) in rawScores)
        {
            state.CumulativeScores[playerId] += score;
        }
    }
    // فقط برای تست: امکان تزریق مستقیم یک کارت کشیده‌شده‌ی مشخص، بدون رندوم‌بودن Draw
    internal void SetPendingDrawnCardForTest(SilverGameState state, SilverCard card)
    {
        state.PendingDrawnCard = card;
    }
    // ------------------ کمکی: چک محافظت Bodyguard ------------------

    /// <summary>
    /// true اگر actingPlayerId بخواد به کارتی در روستای بازیکن دیگه دست بزنه (ببینه/بگیره/جابه‌جا کنه)
    /// و اون کارت با Bodyguard محافظت شده باشه، یا خودش یه Bodyguard رو‌شده باشه.
    /// روی روستای خودت هیچ محدودیتی اعمال نمی‌شه.
    /// </summary>
    private bool IsCardProtectedFromOthers(SilverPlayerVillage village, string cardId, string actingPlayerId)
    {
        if (village.PlayerId == actingPlayerId)
            return false; // محدودیت فقط برای دست‌درازی به روستای دیگران است

        if (village.BodyguardProtectingCardId == cardId)
            return true;

        var card = village.Cards.FirstOrDefault(c => c.CardId == cardId);
        if (card != null && card.Type == CardType.Bodyguard && card.IsPubliclyRevealed)
            return true;

        return false;
    }

    // ------------------ کمکی: چک هم‌عدد بودن با در نظر گرفتن Doppelgänger به‌عنوان wildcard ------------------

    private bool AreSameValueConsideringDoppelganger(List<SilverCard> cards)
    {
        var nonWildcards = cards.Where(c => c.Type != CardType.Doppelganger).ToList();
        if (nonWildcards.Count == 0)
            return true; // همه Doppelgänger هستن -> مجازه

        return nonWildcards.Select(c => c.Value).Distinct().Count() == 1;
    }
    // ------------------ Revealer ------------------

    private SilverActionResult HandleRevealerReveal(SilverGameState state, RevealerRevealCardAction action)
    {
        if (state.PendingAbilityCardType != CardType.Revealer || state.PendingAbilityPlayerId != action.PlayerId)
            return SilverActionResult.Fail("در حال حاضر منتظر قابلیت Revealer نیستیم.");

        if (!state.Villages.TryGetValue(action.TargetPlayerId, out var targetVillage))
            return SilverActionResult.Fail("بازیکن هدف پیدا نشد.");

        var targetCard = targetVillage.Cards.FirstOrDefault(c => c.CardId == action.TargetCardId);
        if (targetCard == null)
            return SilverActionResult.Fail("کارت هدف پیدا نشد.");
        if (targetCard.IsPubliclyRevealed)
            return SilverActionResult.Fail("این کارت از قبل رو شده است.");
        if (IsCardProtectedFromOthers(targetVillage, targetCard.CardId, action.PlayerId))
            return SilverActionResult.Fail("این کارت با Bodyguard محافظت می‌شود.");

        targetCard.IsPubliclyRevealed = true;

        ClearPendingAbility(state);

        if (CheckVillagerEndCondition(state))
            return SilverActionResult.Ok(state);

        AdvanceTurn(state);
        return SilverActionResult.Ok(state);
    }

    // ------------------ Apprentice Seer ------------------

    private SilverActionResult HandleApprenticeSeerPeek(SilverGameState state, ApprenticeSeerPeekAction action)
    {
        if (state.PendingAbilityCardType != CardType.ApprenticeSeer || state.PendingAbilityPlayerId != action.PlayerId)
            return SilverActionResult.Fail("در حال حاضر منتظر قابلیت Apprentice Seer نیستیم.");

        if (action.TargetPlayerId == action.PlayerId)
            return SilverActionResult.Fail("Apprentice Seer فقط می‌تواند روستای بازیکن دیگر را ببیند.");

        if (!state.Villages.TryGetValue(action.TargetPlayerId, out var targetVillage))
            return SilverActionResult.Fail("بازیکن هدف پیدا نشد.");

        var targetCard = targetVillage.Cards.FirstOrDefault(c => c.CardId == action.TargetCardId);
        if (targetCard == null)
            return SilverActionResult.Fail("کارت هدف پیدا نشد.");
        if (targetCard.IsPubliclyRevealed)
            return SilverActionResult.Fail("این کارت از قبل رو شده است.");
        if (IsCardProtectedFromOthers(targetVillage, targetCard.CardId, action.PlayerId))
            return SilverActionResult.Fail("این کارت با Bodyguard محافظت می‌شود.");

        var privateInfo = new Dictionary<string, CardType> { [targetCard.CardId] = targetCard.Type };

        ClearPendingAbility(state);
        AdvanceTurn(state);
        return SilverActionResult.Ok(state, privateInfo);
    }

    // ------------------ Seer ------------------

    private SilverActionResult HandleSeerPeek(SilverGameState state, SeerPeekAction action)
    {
        if (state.PendingAbilityCardType != CardType.Seer || state.PendingAbilityPlayerId != action.PlayerId)
            return SilverActionResult.Fail("در حال حاضر منتظر قابلیت Seer نیستیم.");

        if (!state.Villages.TryGetValue(action.TargetPlayerId, out var targetVillage))
            return SilverActionResult.Fail("بازیکن هدف پیدا نشد.");

        var targetCard = targetVillage.Cards.FirstOrDefault(c => c.CardId == action.TargetCardId);
        if (targetCard == null)
            return SilverActionResult.Fail("کارت هدف پیدا نشد.");
        if (targetCard.IsPubliclyRevealed)
            return SilverActionResult.Fail("این کارت از قبل رو شده است.");
        if (IsCardProtectedFromOthers(targetVillage, targetCard.CardId, action.PlayerId))
            return SilverActionResult.Fail("این کارت با Bodyguard محافظت می‌شود.");

        var privateInfo = new Dictionary<string, CardType> { [targetCard.CardId] = targetCard.Type };

        ClearPendingAbility(state);
        AdvanceTurn(state);
        return SilverActionResult.Ok(state, privateInfo);
    }

    // ------------------ Master ------------------

    private SilverActionResult HandleMasterSwap(SilverGameState state, MasterSwapAction action)
    {
        if (state.PendingAbilityCardType != CardType.Master || state.PendingAbilityPlayerId != action.PlayerId)
            return SilverActionResult.Fail("در حال حاضر منتظر قابلیت Master نیستیم.");

        var discardCard = state.DiscardPile.FirstOrDefault(c => c.CardId == action.DiscardCardId);
        if (discardCard == null)
            return SilverActionResult.Fail("این کارت در دسته‌ی دورریختنی پیدا نشد.");

        state.DiscardPile.Remove(discardCard);

        var village = state.Villages[action.PlayerId];
        var swapResult = TrySwapMultiple(village, action.OwnCardIdsToReplace, discardCard, state);
        if (!swapResult.Success)
        {
            // اگه شکست خورد، کارت رو به discard برگردون (حالت قبل از تلاش)
            state.DiscardPile.Add(discardCard);
            return swapResult;
        }

        ClearPendingAbility(state);

        if (CheckVillagerEndCondition(state))
            return SilverActionResult.Ok(state);

        AdvanceTurn(state);
        return SilverActionResult.Ok(state);
    }

    // ------------------ Witch ------------------

    private SilverActionResult HandleWitchSwap(SilverGameState state, WitchSwapAction action)
    {
        if (state.PendingAbilityCardType != CardType.Witch || state.PendingAbilityPlayerId != action.PlayerId)
            return SilverActionResult.Fail("در حال حاضر منتظر قابلیت Witch نیستیم.");

        if (state.DrawPile.Count == 0)
            return SilverActionResult.Fail("دسته‌ی اصلی خالی است.");

        var topOfDeck = state.DrawPile[^1];

        if (action.TargetPlayerId == action.PlayerId)
        {
            // تعویض با کارت(های) خودش - طبق قانون عمومی هم‌عدد بودن (با در نظر گرفتن Doppelgänger)
            state.DrawPile.RemoveAt(state.DrawPile.Count - 1);
            var village = state.Villages[action.PlayerId];
            var swapResult = TrySwapMultiple(village, action.TargetCardIds, topOfDeck, state);
            if (!swapResult.Success)
            {
                state.DrawPile.Add(topOfDeck); // برگردوندن کارت به دسته در صورت شکست
                return swapResult;
            }
        }
        else
        {
            if (action.TargetCardIds.Count != 1)
                return SilverActionResult.Fail("Witch فقط می‌تواند با یک کارت از روستای بازیکن دیگر عوض کند.");

            if (!state.Villages.TryGetValue(action.TargetPlayerId, out var targetVillage))
                return SilverActionResult.Fail("بازیکن هدف پیدا نشد.");

            var targetCardId = action.TargetCardIds[0];
            var targetCard = targetVillage.Cards.FirstOrDefault(c => c.CardId == targetCardId);
            if (targetCard == null)
                return SilverActionResult.Fail("کارت هدف پیدا نشد.");
            if (IsCardProtectedFromOthers(targetVillage, targetCardId, action.PlayerId))
                return SilverActionResult.Fail("این کارت با Bodyguard محافظت می‌شود.");

            state.DrawPile.RemoveAt(state.DrawPile.Count - 1);

            targetVillage.Cards.Remove(targetCard);
            targetCard.IsPubliclyRevealed = true;
            state.DiscardPile.Add(targetCard);

            if (targetVillage.BodyguardProtectingCardId == targetCardId)
                targetVillage.BodyguardProtectingCardId = null;

            topOfDeck.IsPubliclyRevealed = false;
            targetVillage.Cards.Add(topOfDeck);
        }

        ClearPendingAbility(state);

        if (CheckVillagerEndCondition(state))
            return SilverActionResult.Ok(state);

        AdvanceTurn(state);
        return SilverActionResult.Ok(state);
    }

    // ------------------ Robber ------------------

    private SilverActionResult HandleRobberSwap(SilverGameState state, RobberSwapAction action)
    {
        if (state.PendingAbilityCardType != CardType.Robber || state.PendingAbilityPlayerId != action.PlayerId)
            return SilverActionResult.Fail("در حال حاضر منتظر قابلیت Robber نیستیم.");

        if (!state.Villages.TryGetValue(action.TargetPlayerId, out var targetVillage))
            return SilverActionResult.Fail("بازیکن هدف پیدا نشد.");
        if (action.TargetPlayerId == action.PlayerId)
            return SilverActionResult.Fail("Robber نمی‌تواند خودش را هدف بگیرد.");

        var targetCard = targetVillage.Cards.FirstOrDefault(c => c.CardId == action.TargetCardId);
        if (targetCard == null)
            return SilverActionResult.Fail("کارت هدف پیدا نشد.");
        if (IsCardProtectedFromOthers(targetVillage, action.TargetCardId, action.PlayerId))
            return SilverActionResult.Fail("این کارت با Bodyguard محافظت می‌شود.");

        var ownVillage = state.Villages[action.PlayerId];
        var ownCard = ownVillage.Cards.FirstOrDefault(c => c.CardId == action.OwnCardId);
        if (ownCard == null)
            return SilverActionResult.Fail("کارت خودت پیدا نشد.");

        // جابه‌جایی واقعی - هیچ‌کدوم به discard نمی‌رن، فقط جای فیزیکی عوض می‌شه
        targetVillage.Cards.Remove(targetCard);
        ownVillage.Cards.Remove(ownCard);

        targetVillage.Cards.Add(ownCard);
        ownVillage.Cards.Add(targetCard);

        if (targetVillage.BodyguardProtectingCardId == targetCard.CardId)
            targetVillage.BodyguardProtectingCardId = null;
        if (ownVillage.BodyguardProtectingCardId == ownCard.CardId)
            ownVillage.BodyguardProtectingCardId = null;

        var privateInfo = new Dictionary<string, CardType> { [targetCard.CardId] = targetCard.Type };

        ClearPendingAbility(state);
        AdvanceTurn(state);
        return SilverActionResult.Ok(state, privateInfo);
    }
    private SilverActionResult HandleDrawFromDeck(SilverGameState state, SilverAction action)
    {
        if (state.DrawPile.Count == 0)
        {
            EndRound(state, RoundEndReason.DrawPileEmpty);
            return SilverActionResult.Ok(state);
        }

        var village = state.Villages[action.PlayerId];
        var revealedRascalCount = village.Cards.Count(c => c.IsPubliclyRevealed && c.Type == CardType.Rascal);
        var cardsToDrawCount = Math.Min(1 + revealedRascalCount, state.DrawPile.Count);

        if (cardsToDrawCount == 1)
        {
            var card = DrawTopOfDeck(state);
            state.PendingDrawnCard = card;
            state.DrawnCardSource = PendingDrawnCardSource.Deck;

            var privateInfo = new Dictionary<string, CardType> { [card.CardId] = card.Type }; // ← جدید
            return SilverActionResult.Ok(state, privateInfo);
        }

        var drawn = new List<SilverCard>();
        for (int i = 0; i < cardsToDrawCount; i++)
            drawn.Add(DrawTopOfDeck(state));

        state.PendingRascalChoiceOptions = drawn;

        var rascalPrivateInfo = drawn.ToDictionary(c => c.CardId, c => c.Type); // ← جدید: همه‌ی گزینه‌ها رو نشون بده
        return SilverActionResult.Ok(state, rascalPrivateInfo);
    }

    private SilverActionResult HandleChooseFromRascalDraw(SilverGameState state, ChooseFromRascalDrawAction action)
    {
        if (state.PendingRascalChoiceOptions == null)
            return SilverActionResult.Fail("کارتی برای انتخاب از Rascal در انتظار نیست.");

        var chosen = state.PendingRascalChoiceOptions.FirstOrDefault(c => c.CardId == action.ChosenCardId);
        if (chosen == null)
            return SilverActionResult.Fail("کارت انتخاب‌شده در میان کارت‌های کشیده‌شده نیست.");

        var remaining = state.PendingRascalChoiceOptions.Where(c => c.CardId != action.ChosenCardId).ToList();
        for (int i = remaining.Count - 1; i >= 0; i--)
            state.DrawPile.Add(remaining[i]);

        state.PendingRascalChoiceOptions = null;
        state.PendingDrawnCard = chosen;
        state.DrawnCardSource = PendingDrawnCardSource.Deck;

        var privateInfo = new Dictionary<string, CardType> { [chosen.CardId] = chosen.Type }; // ← جدید
        return SilverActionResult.Ok(state, privateInfo);
    }

    private SilverActionResult HandleTakeFromDiscard(SilverGameState state, SilverAction action)
    {
        if (state.DiscardPile.Count == 0)
            return SilverActionResult.Fail("دسته‌ی دورریختنی خالی است.");

        var topCard = state.DiscardPile[^1];
        state.PendingDrawnCard = topCard;
        state.DrawnCardSource = PendingDrawnCardSource.Discard; // ← جدید

        return SilverActionResult.Ok(state); // نیازی به privateInfo نیست چون این کارت از قبل عمومیه
    }

    private SilverActionResult HandleTakeSquireCard(SilverGameState state, TakeSquireCardAction action)
    {
        var squireCard = state.SquireRevealedCards.FirstOrDefault(c => c.CardId == action.SquireCardId);
        if (squireCard == null)
            return SilverActionResult.Fail("این کارت کمکی در حال حاضر در دسترس نیست.");

        state.SquireRevealedCards.Remove(squireCard);
        state.PendingDrawnCard = squireCard;
        state.DrawnCardSource = PendingDrawnCardSource.Squire; // ← جدید

        return SilverActionResult.Ok(state); // این کارت‌ها هم از قبل عمومی‌ان
    }
}