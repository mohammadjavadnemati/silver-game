namespace Silver.Engine.Cards;

using Silver.Engine.Cards;

public class SilverCard
{
    public required string CardId { get; init; } // شناسه‌ی یکتای این نسخه‌ی فیزیکی کارت
    public required CardType Type { get; init; }
    public int Value => CardDefinitions.ValueOf(Type);

    // اگر true باشه، برای همه (public) روشه - مثل Exposer/Revealer یا Squire کنار دسته
    public bool IsPubliclyRevealed { get; set; } = false;

    public SilverCard Clone() => new()
    {
        CardId = CardId,
        Type = Type,
        IsPubliclyRevealed = IsPubliclyRevealed
    };
}