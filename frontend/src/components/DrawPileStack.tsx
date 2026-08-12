"use client";

import Image from "next/image";
import { CARD_BACK_IMAGE } from "@/lib/types";

export function DrawPileStack({
  count,
  onClick,
  disabled,
}: {
  count: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        onClick={disabled ? undefined : onClick}
        className={`relative w-20 h-28 sm:w-24 sm:h-32 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:brightness-110"} transition`}
      >
        <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-md overflow-hidden -z-10 opacity-60">
          <Image src={CARD_BACK_IMAGE} alt="" fill className="object-cover" draggable={false} />
        </div>
        <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-md overflow-hidden -z-20 opacity-30">
          <Image src={CARD_BACK_IMAGE} alt="" fill className="object-cover" draggable={false} />
        </div>
        <div className="relative w-full h-full rounded-md overflow-hidden border border-silver/30">
          <Image src={CARD_BACK_IMAGE} alt="دسته اصلی" fill className="object-cover" draggable={false} />
          <div
            className="absolute inset-x-0 bottom-0 flex items-center justify-center py-1"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
          >
            <span className="font-mono text-white text-sm">{count}</span>
          </div>
        </div>
      </div>
      <span className="text-[10px] text-silver/40">دسته اصلی</span>
    </div>
  );
}