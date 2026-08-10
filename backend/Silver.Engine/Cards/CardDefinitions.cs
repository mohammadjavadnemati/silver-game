namespace Silver.Engine.Cards;

public record CardDefinition(CardType Type, int Value, string Name, int CountInDeck);

public static class CardDefinitions
{
    public static readonly IReadOnlyDictionary<CardType, CardDefinition> All =
        new Dictionary<CardType, CardDefinition>
        {
            [CardType.Villager]       = new(CardType.Villager, 0, "Villager", 2),
            [CardType.Squire]         = new(CardType.Squire, 1, "Squire", 4),
            [CardType.Empath]         = new(CardType.Empath, 2, "Empath", 4),
            [CardType.Bodyguard]      = new(CardType.Bodyguard, 3, "Bodyguard", 4),
            [CardType.Rascal]         = new(CardType.Rascal, 4, "Rascal", 4),
            [CardType.Exposer]        = new(CardType.Exposer, 5, "Exposer", 4),
            [CardType.Revealer]       = new(CardType.Revealer, 6, "Revealer", 4),
            [CardType.Beholder]       = new(CardType.Beholder, 7, "Beholder", 4),
            [CardType.ApprenticeSeer] = new(CardType.ApprenticeSeer, 8, "Apprentice Seer", 4),
            [CardType.Seer]           = new(CardType.Seer, 9, "Seer", 4),
            [CardType.Master]         = new(CardType.Master, 10, "Master", 4),
            [CardType.Witch]          = new(CardType.Witch, 11, "Witch", 4),
            [CardType.Robber]         = new(CardType.Robber, 12, "Robber", 4),
            [CardType.Doppelganger]   = new(CardType.Doppelganger, 13, "Doppelgänger", 2),
        };

    public static int ValueOf(CardType type) => All[type].Value;

    public const int TotalCardsInDeck = 52;

    /// <summary>
    /// یک دسته‌ی کامل و شافل‌نشده از ۵۲ کارت می‌سازه (هر نمونه با CardId یکتا).
    /// شافل کردن در فاز ۴ (موتور بازی) انجام می‌شه، نه اینجا -
    /// این متد فقط مسئول ساخت درست تعداد نسخه‌هاست.
    /// </summary>
    public static List<SilverCard> BuildFullDeck()
    {
        var deck = new List<SilverCard>();
        foreach (var def in All.Values)
        {
            for (int i = 0; i < def.CountInDeck; i++)
            {
                deck.Add(new SilverCard
                {
                    CardId = $"{def.Type}_{i + 1}",
                    Type = def.Type
                });
            }
        }
        return deck;
    }
}