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
// --- اکشن‌های جانبی اختیاری (یک‌بار در نوبت، مستقل از Draw/Discard) ---

public class UseEmpathAction : SilverAction
{
    public required string EmpathCardId { get; init; }   // کدوم Empath رو‌شده‌ی خودت استفاده می‌شه
    public required string OwnCardIdToPeek { get; init; } // کدوم کارت خودتو می‌بینی
}

public class MoveBodyguardAction : SilverAction
{
    public required string BodyguardCardId { get; init; }
    public string? TargetOwnCardId { get; init; } // null یعنی محافظت رو برمی‌داری
}

// --- اکشن انتخاب از میان کارت‌های اضافه‌ی Rascal ---

public class ChooseFromRascalDrawAction : SilverAction
{
    public required string ChosenCardId { get; init; }
}

// --- حل قابلیت کارت‌های discard-triggered (فقط این دوتا در فاز ۴-ب) ---

public class ExposerRevealOwnCardAction : SilverAction
{
    public required string OwnCardIdToReveal { get; init; }
}

public class BeholderPeekAction : SilverAction
{
    public required string FirstOwnCardId { get; init; }
    public required string SecondOwnCardId { get; init; }
}

public class SkipCardAbilityAction : SilverAction { }
public class RevealerRevealCardAction : SilverAction
{
    public required string TargetPlayerId { get; init; }
    public required string TargetCardId { get; init; }
}

public class ApprenticeSeerPeekAction : SilverAction
{
    public required string TargetPlayerId { get; init; } // نباید خودِ بازیکن باشه
    public required string TargetCardId { get; init; }
}

public class SeerPeekAction : SilverAction
{
    public required string TargetPlayerId { get; init; } // می‌تونه خودش هم باشه
    public required string TargetCardId { get; init; }
}

public class MasterSwapAction : SilverAction
{
    public required string DiscardCardId { get; init; } // هر کارتی از discard، نه فقط بالایی
    public required List<string> OwnCardIdsToReplace { get; init; }
}

public class WitchSwapAction : SilverAction
{
    public required string TargetPlayerId { get; init; } // خودش یا بازیکن دیگه
    public required List<string> TargetCardIds { get; init; } // اگه خودشه: می‌تونه چندتا هم‌عدد باشه؛ اگه دیگریه: فقط ۱ کارت
}

public class RobberSwapAction : SilverAction
{
    public required string TargetPlayerId { get; init; }
    public required string TargetCardId { get; init; }
    public required string OwnCardId { get; init; }
}