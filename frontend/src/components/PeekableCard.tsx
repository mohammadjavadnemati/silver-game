"use client";

import Image from "next/image";
import {
  CARD_BACK_IMAGE,
  CARD_DESCRIPTIONS_FA,
  CARD_IMAGES,
  CARD_NAMES_FA,
  type CardType,
} from "@/lib/types";

type PeekedValue = {
  type: string;
  value: number;
};

type CardSize = "own" | "opponent";

type PeekableCardProps = {
  card: {
    cardId: string;
    type: CardType | null;
    value: number | null;
    isPubliclyRevealed: boolean;
  };
  canPeek: boolean;
  peekWindowOpen: boolean;
  onPeek: () => void;
  peekedValue: PeekedValue | null;
  size?: CardSize;
  forceReveal?: boolean; // ← جدید: کارت کشیده‌شده‌ی خودت، صرف‌نظر از isPubliclyRevealed، باید رو نشون داده بشه
  onClick?: () => void;
};

export function PeekableCard({
  card,
  canPeek,
  peekWindowOpen,
  onPeek,
  peekedValue,
  size = "opponent",
  forceReveal = false,
  onClick,
}: PeekableCardProps) {
  const isOwn = size === "own";

  const boxClasses = isOwn
    ? "w-32 h-44 sm:w-40 sm:h-56 md:w-48 md:h-68 lg:w-56 lg:h-80 shrink-0"
    : "w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-40 lg:w-32 lg:h-44 shrink-0";

  const publicDisplay =
    (card.isPubliclyRevealed || forceReveal) && card.type !== null
      ? { type: card.type, value: card.value ?? 0 }
      : null;

  const privateDisplay =
    !publicDisplay && peekWindowOpen ? peekedValue : null;

  const display = publicDisplay ?? privateDisplay;
  const showFace = display !== null;

  const cardType = display?.type as CardType | undefined;
  const imageSrc =
    showFace && cardType ? CARD_IMAGES[cardType] : CARD_BACK_IMAGE;
  const description = cardType ? CARD_DESCRIPTIONS_FA[cardType] : undefined;

  const handleDoubleClick = () => {
    if (!canPeek) return;
    if (!peekWindowOpen) return;
    if (showFace) return;
    onPeek();
  };

  // اولویت رنگ حاشیه: انتخاب‌شده برای سوزوندن (نارنجی) > تازه‌کشیده‌شده (قرمز) > حالت عادی
  const stateBorderClass = forceReveal
    ? "border-blood-moon border-2"
    : "border-silver/30";

  return (
    <div
      onDoubleClick={handleDoubleClick}
      onClick={onClick}
      className={`
        ${boxClasses}
        relative
        rounded-md
        overflow-hidden
        select-none
        transition
        border
        ${stateBorderClass}
        ${!showFace ? "bg-void" : ""}
        ${forceReveal ? "shadow-lg shadow-blood-moon/40" : ""}
        ${
          canPeek && peekWindowOpen && !showFace
            ? "cursor-pointer hover:border-ember hover:border-2"
            : ""
        }
      `}
    >
      <Image
        src={imageSrc}
        alt={showFace && cardType ? CARD_NAMES_FA[cardType] : "پشت کارت"}
        fill
        sizes={isOwn ? "(min-width: 1024px) 224px, (min-width: 768px) 192px, (min-width: 640px) 160px, 128px" : "(min-width: 1024px) 128px, (min-width: 768px) 112px, 96px"}
        className="object-cover"
        draggable={false}
      />

      {showFace && (
        <div
          className={`
            absolute inset-x-0 bottom-0 z-10
            ${isOwn ? "pt-10 pb-2 px-2" : "pt-4 pb-1 px-1.5"}
          `}
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0) 100%)",
          }}
        >
          <div
            className={`font-mono text-white leading-none ${
              isOwn ? "text-2xl" : "text-xs sm:text-sm"
            }`}
          >
            {display!.value}
          </div>

          <div
            className={`text-white font-medium leading-tight truncate ${
              isOwn ? "text-base mt-1" : "text-[10px] sm:text-xs"
            }`}
          >
            {CARD_NAMES_FA[cardType!]}
          </div>

          {isOwn && description && (
            <div className="text-white/90 text-xs leading-snug mt-1">
              {description}
            </div>
          )}
        </div>
      )}

      {!showFace && canPeek && peekWindowOpen && (
        <span className="absolute inset-0 flex items-center justify-center text-silver/40 text-2xl sm:text-3xl">
          ؟
        </span>
      )}
    </div>
  );
}