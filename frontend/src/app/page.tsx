"use client";

import { useEffect, useState } from "react";
import { useGameConnection } from "@/lib/signalr";
import { CARD_NAMES_FA } from "@/lib/types";
import { InitialPeekTimer } from "@/components/InitialPeekTimer";
import { PeekableCard } from "@/components/PeekableCard";
import { DrawPileStack } from "@/components/DrawPileStack";
import { DrawnCardDecisionModal } from "@/components/DrawnCardDecisionModal";


export default function Home() {
  const {
    status, room, gameState, joinError, lastActionError, privateReveals,
    createRoom, joinRoom, startGame, sendAction, myPlayerId,
  } = useGameConnection();

  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [drawnCardInVillage, setDrawnCardInVillage] = useState(false);
  const [initialPeekTimeLeft, setInitialPeekTimeLeft] = useState(0);
  useEffect(() => {
  if (!gameState) {
    setInitialPeekTimeLeft(0);
    return;
  }

  const updateTimer = () => {
    const deadline = new Date(gameState.initialPeekDeadlineUtc).getTime();
    const now = Date.now();

    const remainingMs = Math.max(0, deadline - now);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    setInitialPeekTimeLeft(remainingSeconds);

    if (remainingMs <= 0) {
      setInitialPeekTimeLeft(0);
    }
  };

  updateTimer();

  const intervalId = window.setInterval(updateTimer, 100);

  return () => {
    window.clearInterval(intervalId);
  };
}, [gameState]);

  // کارت‌هایی که با InitialPeek دیده شدن، فقط تا پایان پنجره‌ی ۱۰ ثانیه‌ای نمایش داده می‌شن
  const [visiblePeeks, setVisiblePeeks] = useState<Record<string, { type: string; value: number }>>({});
  useEffect(() => {
  if (!gameState?.initialPeekDeadlineUtc) {
    return;
  }

  const deadline = new Date(
    gameState.initialPeekDeadlineUtc
  ).getTime();

  const expirePeeks = () => {
    setVisiblePeeks({});
  };

  const remainingMs = deadline - Date.now();

  if (remainingMs <= 0) {
    expirePeeks();
    return;
  }

  const timeoutId = window.setTimeout(
    expirePeeks,
    remainingMs
  );

  return () => {
    window.clearTimeout(timeoutId);
  };
}, [gameState?.initialPeekDeadlineUtc]);

  // هر وقت privateReveals جدید از سرور اومد، اضافه‌ش کن به نمایش
  useEffect(() => {
  if (!gameState?.initialPeekDeadlineUtc) {
    setVisiblePeeks({});
    return;
  }

  const deadline = new Date(
    gameState.initialPeekDeadlineUtc
  ).getTime();

  if (Date.now() >= deadline) {
    setVisiblePeeks({});
    return;
  }

  setVisiblePeeks((prev) => ({
    ...prev,
    ...privateReveals,
  }));
}, [
  privateReveals,
  gameState?.initialPeekDeadlineUtc,
]);

  // وقتی پنجره‌ی peek تموم می‌شه، خودکار پاک کن
  // useEffect(() => {
  //   if (!gameState?.InitialPeekDeadlineUtc) return;
  //   const end = new Date(gameState.initialPeekDeadlineUtc).getTime();
  //   const msLeft = end - Date.now();

  //   if (msLeft <= 0) {
  //     setVisiblePeeks({});
  //     return;
  //   }
  //   const timeout = setTimeout(() => setVisiblePeeks({}), msLeft);
  //   return () => clearTimeout(timeout);
  // }, [gameState?.InitialPeekDeadlineUtc]);
  useEffect(() => {
    setSelectedCardIds([]);
  }, [gameState?.currentPlayerId]);
  useEffect(() => {
    setDrawnCardInVillage(false);
  }, [gameState?.pendingDrawnCard?.cardId]);

  const statusColor = status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-ember" : "bg-blood-moon";

  // --- صفحه‌ی داخل بازی ---
  if (gameState) {
  const peekWindowOpen =
    gameState.initialPeekDeadlineUtc
      ? new Date(gameState.initialPeekDeadlineUtc).getTime() > Date.now()
      : false;

  const canPeek =
    peekWindowOpen &&
    gameState.myInitialPeeksRemaining > 0;

  const handlePeek = (cardId: string) => {
    if (!room) return;
    sendAction(room.roomCode, "InitialPeek", {
      ownCardId: cardId,
    });
  };
  const isMyTurn = gameState.currentPlayerId === myPlayerId;
  const isMe = true; // این overlay فقط برای صاحب نوبت رندر می‌شه، پس همیشه true (اسمش گمراه‌کننده‌ست، صرفاً برای type-consistency با پایین)
  const myPendingDrawnCard = isMyTurn ? gameState.pendingDrawnCard : null;
  

  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleDrawFromDeck = () => {
    if (!room || !isMyTurn || myPendingDrawnCard) return;
    sendAction(room.roomCode, "DrawFromDeck", {});
  };

  // وقتی روی پایل دورریختنی کلیک می‌کنیم، بسته به وضعیت یکی از این ۳ کار انجام می‌شه
  const handleDiscardPileClick = () => {
    if (!room) return;

    // حالت ۱: نوبتته، هیچی نکشیدی → بردار از دورریختنی
    if (isMyTurn && !myPendingDrawnCard) {
      sendAction(room.roomCode, "TakeFromDiscard", {});
      return;
    }

    // حالت ۲: کارت کشیدی ولی هنوز وارد روستا نکردی → مستقیم بسوزونش
    if (myPendingDrawnCard && !drawnCardInVillage) {
      handleDiscardDrawnDirectly();
      return;
    }

    // حالت ۳: کارت رو وارد روستا کردی و حالا می‌خوای کارت‌های انتخاب‌شده رو بسوزونی
    if (myPendingDrawnCard && drawnCardInVillage) {
      const drawnId = myPendingDrawnCard.cardId;
      const selectedWithoutDrawn = selectedCardIds.filter((id) => id !== drawnId);

      if (selectedCardIds.length === 0 || (selectedCardIds.length === 1 && selectedCardIds[0] === drawnId)) {
        sendAction(room.roomCode, "DiscardDrawn", { drawnCardId: drawnId });
      } else if (selectedWithoutDrawn.length > 0) {
        sendAction(room.roomCode, "SwapDrawn", {
          drawnCardId: drawnId,
          ownCardIds: selectedWithoutDrawn,
        });
      }
      setSelectedCardIds([]);
      setDrawnCardInVillage(false);
    }
  };

  const handleAddDrawnCardToVillage = () => {
    if (myPendingDrawnCard && !drawnCardInVillage) {
      setDrawnCardInVillage(true);
    }
  };

  const handleDiscardDrawnDirectly = () => {
    if (myPendingDrawnCard && !drawnCardInVillage && room) {
      sendAction(room.roomCode, "DiscardDrawn", { drawnCardId: myPendingDrawnCard.cardId });
    }
  };

  // ترتیب نوبت رو حفظ می‌کنیم ولی می‌چرخونیم که خودت همیشه اول (=پایین صفحه) باشی
  const turnOrder =
    gameState.playerIdsInTurnOrder?.length
      ? gameState.playerIdsInTurnOrder
      : Object.keys(gameState.villages);

  const myIndex = turnOrder.indexOf(myPlayerId ?? "");
  const startIndex = myIndex === -1 ? 0 : myIndex;

  const rotatedIds = [
    ...turnOrder.slice(startIndex),
    ...turnOrder.slice(0, startIndex),
  ];

  const orderedVillages = rotatedIds
    .map((id) => gameState.villages[id])
    .filter(Boolean);

  // بسته به تعداد بازیکنا، جایگاه‌ها دور صفحه چیده می‌شن (همیشه خودت پایینه)
  const POSITION_LAYOUTS: Record<number, string[]> = {
    1: ["bottom"],
    2: ["bottom", "top"],
    3: ["bottom", "right", "left"],
    4: ["bottom", "right", "top", "left"],
  };

  const positions =
    POSITION_LAYOUTS[orderedVillages.length] ??
    orderedVillages.map(() => "bottom");

  const POSITION_GRID_CLASSES: Record<string, string> = {
    bottom: "col-start-2 row-start-3",
    top: "col-start-2 row-start-1",
    left: "col-start-1 row-start-2",
    right: "col-start-3 row-start-2",
  };

    

  return (
    <main className="min-h-screen p-6 space-y-4">
      <InitialPeekTimer
        endsAt={gameState.initialPeekDeadlineUtc}
      />
      {myPendingDrawnCard && !drawnCardInVillage && (
        <DrawnCardDecisionModal
          card={myPendingDrawnCard}
          onAddToVillage={handleAddDrawnCardToVillage}
          onDiscard={handleDiscardDrawnDirectly}
        />
      )}
      

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-silver">
          راند {gameState.roundNumber} از ۴
        </h1>

        <span className="font-mono text-sm text-ember">
          {gameState.phase}
        </span>
      </div>

      <div className="bg-panel rounded-lg p-4 space-y-1">
        <div className="text-sm">
          نوبت:
          <span className="text-ember">
            {gameState.currentPlayerId}
          </span>
        </div>

        {gameState.amuletHolderPlayerId && (
          <div className="text-sm">
            🔮 آمیولت دست:
            <span className="text-silver">
              {gameState.amuletHolderPlayerId}
            </span>
          </div>
        )}
      </div>

      

      <div className="grid grid-cols-3 grid-rows-3 gap-4 items-center justify-items-center min-h-[520px]">
        <div className="col-start-2 row-start-2 flex gap-6 items-center justify-center relative">
          <DrawPileStack
            count={gameState.drawPileCount}
            onClick={handleDrawFromDeck}
            disabled={!isMyTurn || !!myPendingDrawnCard}
          />

          <div className="flex flex-col items-center gap-1">
            <div
              onClick={handleDiscardPileClick}
              className={`transition ${
                (isMyTurn && !myPendingDrawnCard) || myPendingDrawnCard
                  ? "cursor-pointer hover:brightness-110"
                  : "opacity-50 cursor-not-allowed"
              }`}
            >
              {gameState.discardPileTop ? (
                <PeekableCard
                  card={gameState.discardPileTop}
                  canPeek={false}
                  peekWindowOpen={false}
                  onPeek={() => {}}
                  peekedValue={null}
                  size="opponent"
                />
              ) : (
                <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-md border border-dashed border-silver/20 flex items-center justify-center text-silver/30 text-xs">
                  خالی
                </div>
              )}
            </div>
            <span className="text-[10px] text-silver/40">
              {myPendingDrawnCard ? "برای سوزوندن بزن" : `دورریختنی (${gameState.discardPileCount})`}
            </span>
          </div>
        </div>

        {orderedVillages.map((village, index) => {
  const isMe = village.playerId === myPlayerId;
  const isCurrentTurn = village.playerId === gameState.currentPlayerId;
  const position = positions[index] ?? "bottom";

  return (
  <div
      key={village.playerId}
      style={{
        borderColor: isCurrentTurn ? "#8B2E3A" : isMe ? "#C9D3DE" : "rgba(201,211,222,0.1)",
        borderWidth: isCurrentTurn ? "4px" : isMe ? "2px" : "1px",
        borderStyle: "solid",
        boxShadow: isCurrentTurn ? "0 0 20px rgba(139,46,58,0.6)" : "none",
      }}
      className={`bg-panel-light rounded-lg transition-all ${POSITION_GRID_CLASSES[position]} ${
        isMe ? "p-6 w-full max-w-2xl" : "p-3 w-full max-w-xs"
      }`}
    >
      <div className={`font-display mb-1 flex items-center gap-2 ${isMe ? "text-lg" : "text-sm"}`}>
        {isMe ? "روستای تو" : village.playerId}
        {isCurrentTurn && (
          <span className="text-[10px] font-body text-blood-moon animate-pulse">● نوبتشه</span>
        )}
        <span className="mr-auto">
          {" — امتیاز کل: "}
          <span className="font-mono text-ember">{gameState.cumulativeScores[village.playerId]}</span>
        </span>
      </div>

      {canPeek && (
        <div className="text-xs text-ember mb-2">
          می‌تونی {gameState.myInitialPeeksRemaining} کارت دیگه رو مخفیانه ببینی (دابل‌کلیک)
        </div>
      )}

      {/* {myPendingDrawnCard && !drawnCardInVillage && (
        <div className="text-xs text-ember mb-2">
          کارتی که کشیدی رو بکش و بنداز داخل این باکس تا وارد روستات بشه، یا روی دورریختنی بنداز تا مستقیم بسوزه.
        </div>
      )} */}
      { myPendingDrawnCard && drawnCardInVillage && (
        <div className="text-xs text-ember mb-2">
          حالا کارت(های)ی که می‌خوای بسوزونی رو انتخاب کن (باید هم‌عدد باشن)، بعد روی دورریختنی کلیک کن.
        </div>
      )}

      <div className={`flex flex-nowrap justify-center ${isMe ? "gap-3" : "gap-1"}`}>
        {village.cards.map((card) => {
          const isSelected = selectedCardIds.includes(card.cardId);
          const canSelect = isMe && !!myPendingDrawnCard && drawnCardInVillage;

          return (
            <div
              key={card.cardId}
              onClick={canSelect ? () => toggleCardSelection(card.cardId) : undefined}
              className={`transition-transform ${canSelect ? "cursor-pointer" : ""} ${
                isSelected ? "-translate-y-3 ring-4 ring-ember rounded-md" : ""
              }`}
            >
              <PeekableCard
                card={card}
                canPeek={isMe && canPeek}
                peekWindowOpen={peekWindowOpen}
                onPeek={() => handlePeek(card.cardId)}
                peekedValue={isMe ? visiblePeeks[card.cardId] ?? null : null}
                size={isMe ? "own" : "opponent"}
              />
            </div>
          );
        })}

        {/* کارت تازه‌کشیده‌شده - وقتی وارد روستا شده */}
        {isMe && myPendingDrawnCard && drawnCardInVillage && (
          <div
            onClick={() => toggleCardSelection(myPendingDrawnCard.cardId)}
            className={`cursor-pointer transition-transform ${
              selectedCardIds.includes(myPendingDrawnCard.cardId) ? "-translate-y-3 ring-4 ring-ember rounded-md" : ""
            }`}
          >
            <PeekableCard
              card={myPendingDrawnCard}
              canPeek={false}
              peekWindowOpen={false}
              onPeek={() => {}}
              peekedValue={null}
              size="own"
              forceReveal={gameState.drawnCardSource === "Discard" || gameState.drawnCardSource === "Squire"}
            />
          </div>
        )}
      </div>
    </div>
  );
})}
      </div>

      {lastActionError && (
        <div className="text-blood-moon text-sm">
          {lastActionError}
        </div>
      )}
    </main>
  );
}
  // --- صفحه‌ی داخل اتاق ---
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