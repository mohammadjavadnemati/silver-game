namespace Silver.Engine;

public enum RoundEndReason
{
    None,
    Call,
    DrawPileEmpty
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

    // Call
    public bool HasBeenCalled { get; set; } = false;
    public string? CallerPlayerId { get; set; }
    public RoundEndReason RoundEndReason { get; set; } = RoundEndReason.None;

    public string? WinnerPlayerId { get; set; } // فقط در پایان کل بازی (۴ راند) پر می‌شه

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}