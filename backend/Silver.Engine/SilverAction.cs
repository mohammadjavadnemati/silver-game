namespace Silver.Engine;

using Silver.Engine.Cards;

public abstract class SilverAction
{
    public required string PlayerId { get; init; }
}

// نوبت با یکی از این ۳ اکشن شروع می‌شه:

public class DrawFromDeckAction : SilverAction { }

public class TakeFromDiscardAction : SilverAction { }

public class TakeSquireCardAction : SilverAction
{
    public required string SquireCardId { get; init; } // کدوم کارت باز شده‌ی کنار دسته
}

public class CallAction : SilverAction { }

// بعد از DrawFromDeck (یا TakeSquireCard که معادلشه)، تصمیم بعدی:

public class DiscardDrawnCardAction : SilverAction
{
    public required string DrawnCardId { get; init; }
    // برای کارت‌هایی با قابلیت انتخابی (مثل Empath/Bodyguard/Robber و...)، جزئیات هدف اکشن جدا میاد (فاز ۴)
}

public class SwapDrawnCardWithOwnAction : SilverAction
{
    public required string DrawnCardId { get; init; }
    public required List<string> OwnCardIdsToReplace { get; init; } // باید همه هم‌عدد باشن (طبق قانون تعویض چندتایی)
}

// بعد از TakeFromDiscard، فقط یک مسیر ممکنه: تعویض (چون قابلیتش قابل اجرا نیست)

public class SwapDiscardCardWithOwnAction : SilverAction
{
    public required string DiscardCardId { get; init; }
    public required List<string> OwnCardIdsToReplace { get; init; }
}