"use client";

import { PeekableCard } from "@/components/PeekableCard";
import { CARD_NAMES_FA, CARD_DESCRIPTIONS_FA, type CardType } from "@/lib/types";

export function DrawnCardDecisionModal({
  card,
  onAddToVillage,
  onDiscard,
}: {
  card: { cardId: string; type: CardType | null; value: number | null; isPubliclyRevealed: boolean };
  onAddToVillage: () => void;
  onDiscard: () => void;
}) {
  const cardType = card.type;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-void/85 backdrop-blur-sm p-4">
      <div className="bg-panel rounded-xl p-6 max-w-md w-full flex flex-col items-center gap-4 border border-silver/20">
        <PeekableCard
          card={card}
          canPeek={false}
          peekWindowOpen={false}
          onPeek={() => {}}
          peekedValue={null}
          size="own"
          forceReveal
        />

        {cardType && (
          <div className="text-center space-y-2 w-full">
            <div className="font-display text-xl text-silver">
              {CARD_NAMES_FA[cardType]} <span className="font-mono text-ember">({card.value})</span>
            </div>
            <p className="text-sm text-silver/80 leading-relaxed">
              {CARD_DESCRIPTIONS_FA[cardType]}
            </p>
          </div>
        )}

        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onAddToVillage}
            className="flex-1 px-4 py-3 rounded-md bg-panel-light border border-silver/30 text-silver text-sm hover:brightness-110 transition"
          >
            بذار داخل روستام
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 px-4 py-3 rounded-md bg-blood-moon text-white text-sm hover:brightness-110 transition"
          >
            همینو بسوزون
          </button>
        </div>
      </div>
    </div>
  );
}