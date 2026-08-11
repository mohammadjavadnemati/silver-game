namespace Silver.Engine;
using Silver.Engine.Cards;
public class SilverPlayerVillage
{
    public required string PlayerId { get; init; }
    public List<SilverCard> Cards { get; init; } = new();

    // Bodyguard می‌تونه روی یک کارت دیگه قرار بگیره؛ نگهداری این رابطه جدا از ترتیب لیست
    public string? BodyguardProtectingCardId { get; set; } // CardId کارتی که محافظت می‌شه؛ null یعنی محافظتی فعال نیست

    // Amulet: کارتی که در این راند با آمیولت پوشونده شده (غیرقابل دیدن/جابه‌جایی تا پایان راند)
    public string? AmuletCoveredCardId { get; set; }

    public int TotalScore(bool amuletHolderHadSuccessfulCall = false)
    {
        // این فقط جمع مقادیر کارت‌های باقی‌مانده‌ست؛ منطق Call bonus/zeroing در فاز محاسبه‌ی امتیاز (فاز بعد) اضافه می‌شه
        return Cards.Sum(c => c.Value);
    }
}