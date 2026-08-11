namespace Silver.Engine;

public class SilverActionResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public SilverGameState? UpdatedState { get; init; }

    // فقط برای بازیکنی که اکشن رو زده قابل مشاهده‌ست (فیلترش کار فاز ۵ است)
    public Dictionary<string, Cards.CardType>? PrivatelyRevealedCards { get; init; } // CardId -> نوع کارت

    public static SilverActionResult Fail(string message) => new() { Success = false, ErrorMessage = message };

    public static SilverActionResult Ok(SilverGameState state, Dictionary<string, Cards.CardType>? privateInfo = null)
        => new() { Success = true, UpdatedState = state, PrivatelyRevealedCards = privateInfo };
}