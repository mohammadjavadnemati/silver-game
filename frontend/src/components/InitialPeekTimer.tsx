"use client";

import { useEffect, useState } from "react";

export function InitialPeekTimer({ endsAt }: { endsAt: string | null }) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    const tick = () => setRemainingMs(Math.max(0, end - Date.now()));
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!endsAt || remainingMs <= 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-panel border border-ember rounded-full px-4 py-2 z-50">
      <span className="font-mono text-ember text-lg">{(remainingMs / 1000).toFixed(1)}s</span>
      <span className="text-xs text-silver/60 mr-2">برای دیدن کارت‌های اولیه‌ت</span>
    </div>
  );
}