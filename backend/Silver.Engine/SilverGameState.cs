namespace Silver.Engine;

using Silver.Engine.Cards;
public enum RoundEndReason
{
    None,
    Call,
    DrawPileEmpty,
    BothVillagersRevealed
}

public enum GamePhase
{
    WaitingToStart,
    RoundInProgress,
    FinalTurnsAfterCall,   // بعد از Call، نوبت‌های آخر بقیه‌ی بازیکنان
    RoundScoring,
    GameFinished
}

public class SilverGameState
{
    public required string GameId { get; init; }
    public GamePhase Phase { get; set; } = GamePhase.WaitingToStart;

    public int RoundNumber { get; set; } = 1; // ۱ تا ۴
    public const int TotalRounds = 4;

    public List<string> PlayerIdsInTurnOrder { get; init; } = new();
    public Dictionary<string, SilverPlayerVillage> Villages { get; init; } = new();
    public Dictionary<string, int> CumulativeScores { get; init; } = new(); // مجموع امتیاز کل بازی، هر راند اضافه می‌شه

    public string CurrentPlayerId { get; set; } = string.Empty;

    public List<SilverCard> DrawPile { get; init; } = new(); // پشت‌ورو، دسته‌ی اصلی
    public List<SilverCard> DiscardPile { get; init; } = new(); // فقط کارت بالایی قابل مشاهده/برداشتن است مگر Master

    public List<SilverCard> SquireRevealedCards { get; init; } = new(); // کارت‌های کمکی باز شده کنار دسته (به‌خاطر Squire)

    public string? AmuletHolderPlayerId { get; set; } // چه کسی آمیولت رو برای این راند در اختیار داره

    public Dictionary<string, int> InitialPeeksUsedByPlayer { get; init; } = new();
    public const int MaxInitialPeeksPerRound = 2;
    public const int InitialPeekDurationSeconds = 10;

    public DateTime InitialPeekDeadlineUtc { get; set; }
    // Call
    public bool HasBeenCalled { get; set; } = false;
    public string? CallerPlayerId { get; set; }
    public RoundEndReason RoundEndReason { get; set; } = RoundEndReason.None;

    public string? WinnerPlayerId { get; set; } // فقط در پایان کل بازی (۴ راند) پر می‌شه

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    // این خطوط رو به کلاس SilverGameState اضافه کن:

    public bool SideActionUsedThisTurn { get; set; } = false;

    // وقتی discard-triggered ability منتظر resolve شدنه:
    public string? PendingAbilityPlayerId { get; set; }
    public Cards.CardType? PendingAbilityCardType { get; set; }
    public string? PendingAbilityCardId { get; set; }
    // این‌ها جایگزین دیکشنری‌های داخل موتور می‌شن:
    public SilverCard? PendingDrawnCard { get; set; }
    public List<SilverCard>? PendingRascalChoiceOptions { get; set; }
    public PendingDrawnCardSource DrawnCardSource { get; set; } = PendingDrawnCardSource.None;
    // اضافه کن (به‌جای اینکه فقط شمارنده داشته باشیم):
    // public DateTime? InitialPeekWindowEndsAt { get; set; }
    // public const int InitialPeekWindowSeconds = 10;

}
public enum PendingDrawnCardSource
{
    None,
    Deck,
    Discard,
    Squire
}
