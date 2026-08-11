"use client";

import { useState } from "react";
import { useGameConnection } from "@/lib/signalr";
import { CARD_NAMES_FA } from "@/lib/types";

function PeekableCard({
  card,
  canPeek,
  onPeek,
  peekedValue,
}: {
  card: { cardId: string; type: string | null; value: number | null; isPubliclyRevealed: boolean };
  canPeek: boolean;
  onPeek: () => void;
  peekedValue: { type: string; value: number } | null;
}) {
  const showFace = card.type !== null || peekedValue !== null;
  const display = card.type ? { type: card.type, value: card.value! } : peekedValue;

  return (
    <div
      onDoubleClick={canPeek && !showFace ? onPeek : undefined}
      className={`w-16 h-24 rounded-md flex flex-col items-center justify-center text-xs font-mono select-none transition
        ${showFace ? "bg-parchment text-void" : "bg-void border border-silver/30 text-silver/40"}
        ${canPeek && !showFace ? "cursor-pointer hover:border-ember hover:border-2" : ""}`}
      title={canPeek && !showFace ? "دابل‌کلیک برای دیدن مخفیانه" : undefined}
    >
      {display ? (
        <>
          <span className="font-display text-lg">{display.value}</span>
          <span className="text-[9px] text-center px-1">{CARD_NAMES_FA[display.type as keyof typeof CARD_NAMES_FA]}</span>
        </>
      ) : "؟"}
    </div>
  );
}

export default function Home() {
  const {
    status, room, gameState, joinError, lastActionError,
    createRoom, joinRoom, startGame, sendAction, myPlayerId,
    privateReveals,
  } = useGameConnection();

  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");

  const statusColor = status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-ember" : "bg-blood-moon";

  // --- صفحه‌ی داخل بازی (خام، فقط برای تست دیتا) ---
  if (gameState) {
    const handleInitialPeek = (cardId: string) => {
      sendAction(room!.roomCode, "InitialPeek", { ownCardId: cardId });
    };

    return (
      <main className="min-h-screen p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-silver">راند {gameState.roundNumber} از ۴</h1>
          <span className="font-mono text-sm text-ember">{gameState.phase}</span>
        </div>

        {gameState.myInitialPeeksRemaining > 0 && (
          <div className="text-xs text-ember">
            می‌تونی {gameState.myInitialPeeksRemaining} کارت دیگه از روستای خودتو مخفیانه ببینی (دابل‌کلیک)
          </div>
        )}

        <div className="bg-panel rounded-lg p-4 space-y-1">
          <div className="text-sm">نوبت: <span className="text-ember">{gameState.currentPlayerId}</span></div>
          {gameState.amuletHolderPlayerId && (
            <div className="text-sm">🔮 آمیولت دست: <span className="text-silver">{gameState.amuletHolderPlayerId}</span></div>
          )}
        </div>

        {/* دسته‌ی اصلی و دورریختنی */}
        <div className="flex gap-6 items-center justify-center py-4">
          <div className="flex flex-col items-center gap-1">
            <div
              onClick={() => sendAction(room!.roomCode, "DrawFromDeck", {})}
              className="w-16 h-24 rounded-md bg-void border-2 border-silver/40 flex items-center justify-center
                         cursor-pointer hover:border-ember transition relative"
            >
              <div className="absolute inset-0 rounded-md bg-void border border-silver/20 translate-x-1 translate-y-1 -z-10" />
              <div className="absolute inset-0 rounded-md bg-void border border-silver/10 translate-x-2 translate-y-2 -z-20" />
              <span className="font-mono text-silver/60 text-sm">{gameState.drawPileCount}</span>
            </div>
            <span className="text-[10px] text-silver/40">دسته اصلی</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div
              onClick={() => sendAction(room!.roomCode, "TakeFromDiscard", {})}
              className="w-16 h-24 rounded-md bg-parchment text-void flex flex-col items-center justify-center cursor-pointer hover:brightness-95 transition"
            >
              {gameState.discardPileTop ? (
                <>
                  <span className="font-display text-lg">{gameState.discardPileTop.value}</span>
                  <span className="text-[9px] text-center px-1">{CARD_NAMES_FA[gameState.discardPileTop.type!]}</span>
                </>
              ) : "خالی"}
            </div>
            <span className="text-[10px] text-silver/40">دورریختنی ({gameState.discardPileCount})</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(gameState.villages).map((village) => (
            <div
              key={village.playerId}
              className={`bg-panel-light rounded-lg p-4 ${village.playerId === myPlayerId ? "ring-2 ring-silver" : ""}`}
            >
              <div className="font-display text-lg mb-2">
                {village.playerId === myPlayerId ? "روستای تو" : village.playerId}
                {" — امتیاز کل: "}
                <span className="font-mono text-ember">{gameState.cumulativeScores[village.playerId]}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {village.cards.map((card) => (
                  <PeekableCard
                    key={card.cardId}
                    card={card}
                    canPeek={village.playerId === myPlayerId && gameState.myInitialPeeksRemaining > 0}
                    onPeek={() => handleInitialPeek(card.cardId)}
                    peekedValue={privateReveals[card.cardId] ?? null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {lastActionError && <div className="text-blood-moon text-sm">{lastActionError}</div>}
      </main>
    );
  }

  // --- صفحه‌ی داخل اتاق، منتظر شروع ---
  if (room) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="max-w-xl w-full space-y-6">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${statusColor}`} />
            <span className="text-sm text-silver/60">وضعیت اتصال: {status}</span>
          </div>

          <div className="p-4 rounded-lg bg-panel">
            <div className="text-sm text-silver/60">کد اتاق</div>
            <div className="font-display text-3xl tracking-widest text-ember">{room.roomCode}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-silver/60">بازیکنان ({room.players.length}/4)</div>
            {room.players.map((p) => (
              <div key={p.playerId} className="flex items-center gap-2 p-2 rounded bg-panel-light">
                <span className={`w-2 h-2 rounded-full ${p.isConnected ? "bg-emerald-500" : "bg-silver/20"}`} />
                <span>{p.name}</span>
                {p.isHost && <span className="text-xs text-ember">(میزبان)</span>}
              </div>
            ))}
          </div>

          {room.players.filter((p) => p.isConnected).length >= 2 && (
            <button
              className="w-full rounded-md bg-blood-moon px-4 py-3 font-display text-lg hover:brightness-110 transition"
              onClick={() => startGame(room.roomCode)}
            >
              شروع بازی
            </button>
          )}
        </div>
      </main>
    );
  }

  // --- صفحه‌ی ورود ---
  return (
    <main className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-sm w-full space-y-6">
        <h1 className="font-display text-4xl text-center text-silver">Silver — طلسم</h1>

        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${statusColor}`} />
          <span className="text-sm text-silver/60">وضعیت اتصال: {status}</span>
        </div>

        <input
          className="w-full rounded-md bg-panel px-3 py-2 text-sm border border-silver/10 focus:outline-none focus:ring-2 focus:ring-silver"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="نام تو"
        />

        <button
          className="w-full rounded-md bg-panel-light px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-panel transition"
          disabled={status !== "connected" || !playerName}
          onClick={() => createRoom(playerName)}
        >
          ساخت اتاق جدید
        </button>

        <div className="flex items-center gap-2 text-silver/40 text-xs">
          <div className="flex-1 h-px bg-silver/10" />
          یا
          <div className="flex-1 h-px bg-silver/10" />
        </div>

        <input
          className="w-full rounded-md bg-panel px-3 py-2 text-sm uppercase tracking-widest border border-silver/10 focus:outline-none focus:ring-2 focus:ring-silver"
          value={roomCodeInput}
          onChange={(e) => setRoomCodeInput(e.target.value)}
          placeholder="کد اتاق"
          maxLength={5}
        />
        <button
          className="w-full rounded-md bg-panel-light px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-panel transition"
          disabled={status !== "connected" || !playerName || !roomCodeInput}
          onClick={() => joinRoom(roomCodeInput, playerName)}
        >
          پیوستن به اتاق
        </button>

        {joinError && <div className="text-sm text-blood-moon">{joinError}</div>}
      </div>
    </main>
  );
}