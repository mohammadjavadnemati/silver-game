"use client";

import { useEffect, useState } from "react";
import { useGameConnection } from "@/lib/signalr";
import { CARD_NAMES_FA, CardType } from "@/lib/types";
import { InitialPeekTimer } from "@/components/InitialPeekTimer";
import { PeekableCard } from "@/components/PeekableCard";
import { DrawPileStack } from "@/components/DrawPileStack";
import { DrawnCardDecisionModal } from "@/components/DrawnCardDecisionModal";
function RoundSummaryOverlay({
  gameState,
  showDetails,
  onToggleDetails,
  onStartNextRound,
  getPlayerName,
}: {
  gameState: any;
  showDetails: boolean;
  onToggleDetails: () => void;
  onStartNextRound: () => void;
  getPlayerName: (playerId: string | null | undefined) => string;
}) {
  const isGameFinished = gameState.phase === "GameFinished";

  const lastRoundScores: Record<string, number> = gameState.lastRoundScores ?? {};
  const cumulativeScores: Record<string, number> = gameState.cumulativeScores ?? {};

  const rankedByLastRound = Object.entries(lastRoundScores).sort(([, a], [, b]) => a - b);
  const rankedByTotal = Object.entries(cumulativeScores).sort(([, a], [, b]) => a - b);

  const roundWinnerName = rankedByLastRound[0]?.[0];
  const gameWinnerName = gameState.winnerPlayerId;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
      <div className="bg-panel rounded-lg p-6 max-w-md w-full space-y-4 text-center">
        <h2 className="font-display text-2xl text-silver">
          {isGameFinished ? "پایان بازی" : `پایان دور ${gameState.roundNumber}`}
        </h2>

        <div className="text-ember">
          {isGameFinished
            ? `برنده‌ی نهایی: ${getPlayerName(gameWinnerName)}`
            : `برنده‌ی این دور: ${getPlayerName(roundWinnerName)}`}
        </div>

        <div className="space-y-2">
          {rankedByLastRound.map(([playerId], index) => (
            <div
              key={getPlayerName(playerId)}
              className="flex items-center justify-between bg-panel-light rounded px-3 py-2"
            >
              <span className="text-sm">
                {index + 1}. {getPlayerName(playerId)}
              </span>
              {showDetails && (
                <span className="font-mono text-xs text-silver/70">
                  این دور: {lastRoundScores[getPlayerName(playerId)]} — کل: {cumulativeScores[getPlayerName(playerId)]}
                </span>
              )}
            </div>
          ))}
        </div>

        {isGameFinished && showDetails && (
          <div className="pt-2 border-t border-silver/10 space-y-1">
            <div className="text-xs text-silver/50 mb-1">رتبه‌بندی نهایی بر اساس مجموع امتیاز</div>
            {rankedByTotal.map(([playerId, score], index) => (
              <div key={getPlayerName(playerId)} className="flex items-center justify-between text-sm">
                <span>{index + 1}. {getPlayerName(playerId)}</span>
                <span className="font-mono text-ember">{score}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-2 pt-2">
          {!isGameFinished && (
            <button
              className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium hover:brightness-110 transition"
              onClick={onStartNextRound}
            >
              شروع دور جدید
            </button>
          )}
          <button
            className="rounded-md bg-panel-light px-4 py-2 text-sm font-medium hover:bg-panel transition"
            onClick={onToggleDetails}
          >
            {showDetails ? "بستن جمع‌بندی" : "جمع‌بندی"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const {
    status, room, gameState, joinError, lastActionError, privateReveals,
    createRoom, joinRoom, startGame, sendAction, myPlayerId,
  } = useGameConnection();
  const playerNames: Record<string, string> = Object.fromEntries(
  (room?.players ?? []).map((p: any) => [p.playerId, p.name])
);
const displayName = (playerId: string | null | undefined) =>
  playerId ? playerNames[playerId] ?? playerId : "-";

  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [drawnCardInVillage, setDrawnCardInVillage] = useState(false);
  const [initialPeekTimeLeft, setInitialPeekTimeLeft] = useState(0);
  const [robberTargetPlayerId, setRobberTargetPlayerId] = useState<string | null>(null);
  const [robberTargetCardId, setRobberTargetCardId] = useState<string | null>(null);
  const [robberOwnCardId, setRobberOwnCardId] = useState<string | null>(null);
  const [witchTargetPlayerId, setWitchTargetPlayerId] = useState<string | null>(null);
  const [witchTargetCardId, setWitchTargetCardId] = useState<string | null>(null);
  const [masterTargetDiscardCardId, setMasterTargetDiscardCardId] = useState<string | null>(null);
  const [masterOwnCardId, setMasterOwnCardId] = useState<string | null>(null);
  const [seerTargetPlayerId, setSeerTargetPlayerId] = useState<string | null>(null);
  const [seerTargetCardId, setSeerTargetCardId] = useState<string | null>(null);
  const [seerPeekedCard, setSeerPeekedCard] = useState<{ type: string; value: number } | null>(null);
  const [apprenticeSeerTargetPlayerId, setApprenticeSeerTargetPlayerId] = useState<string | null>(null);
  const [apprenticeSeerTargetCardId, setApprenticeSeerTargetCardId] = useState<string | null>(null);
  const [apprenticeSeerPeekedCard, setApprenticeSeerPeekedCard] = useState<{ type: string; value: number } | null>(null);
 const [beholderTargetCardIds, setBeholderTargetCardIds] = useState<string[]>([]);
const [beholderPeekedCards, setBeholderPeekedCards] = useState<Record<string, { type: string; value: number }>>({});
const [beholderRequestPending, setBeholderRequestPending] = useState(false);
const [exposerTargetCardId, setExposerTargetCardId] = useState<string | null>(null);
const [revealerTargetPlayerId, setRevealerTargetPlayerId] = useState<string | null>(null);
const [revealerTargetCardId, setRevealerTargetCardId] = useState<string | null>(null);
const [rascalSelectedCardId, setRascalSelectedCardId] = useState<string | null>(null);
const [bodyguardCardId, setBodyguardCardId] = useState<string | null>(null);
const [bodyguardTargetCardId, setBodyguardTargetCardId] = useState<string | null>(null);
const [amuletSelectedCardId, setAmuletSelectedCardId] = useState<string | null>(null);
const [amuletTargetCardId, setAmuletTargetCardId] = useState<string | null>(null);

useEffect(() => {
  setAmuletSelectedCardId(null);
  setAmuletTargetCardId(null);
}, [gameState?.currentPlayerId]);
const [empathSelectedCardIds, setEmpathSelectedCardIds] = useState<string[]>([]);
const [empathPeekedCards, setEmpathPeekedCards] = useState<Record<string, { type: string; value: number }>>({});
const [empathRequestPending, setEmpathRequestPending] = useState(false);
const [showRoundSummaryDetails, setShowRoundSummaryDetails] = useState(false);

useEffect(() => {
  setShowRoundSummaryDetails(false);
}, [gameState?.roundNumber]);
useEffect(() => {
  setEmpathSelectedCardIds([]);
  setEmpathPeekedCards({});
  setEmpathRequestPending(false);
}, [gameState?.currentPlayerId]);

useEffect(() => {
   console.log("[Empath] effect fired - pending:", empathRequestPending, "privateReveals:", privateReveals);
  if (!empathRequestPending) return;
  if (empathSelectedCardIds.length === 0) return;

  const revealed = privateReveals as Record<string, { type: string; value: number }> | undefined;
  if (!revealed) return;

  const matched: Record<string, { type: string; value: number }> = {};
  for (const id of empathSelectedCardIds) {
    if (revealed[id]) matched[id] = revealed[id];
  }

  if (Object.keys(matched).length === empathSelectedCardIds.length) {
    setEmpathPeekedCards(matched);
    setEmpathRequestPending(false);
  }
}, [privateReveals, empathSelectedCardIds, empathRequestPending]);
// بعد از این‌که کارت‌های Empath نشون داده شدن، ۵ ثانیه بعد خودکار دوباره پشت‌ورو می‌شن
useEffect(() => {
  if (Object.keys(empathPeekedCards).length === 0) return;

  const timeout = setTimeout(() => {
    setEmpathPeekedCards({});
    setEmpathSelectedCardIds([]);
  }, 5000);

  return () => clearTimeout(timeout);
}, [empathPeekedCards]);

useEffect(() => {
  setBodyguardCardId(null);
  setBodyguardTargetCardId(null);
}, [gameState?.currentPlayerId]);

useEffect(() => {
  setRascalSelectedCardId(null);
}, [gameState?.pendingRascalChoiceOptions]);

useEffect(() => {
  setRevealerTargetPlayerId(null);
  setRevealerTargetCardId(null);
}, [gameState?.pendingAbilityPlayerId, gameState?.pendingAbilityCardType]);

useEffect(() => {
  setExposerTargetCardId(null);
}, [gameState?.pendingAbilityPlayerId, gameState?.pendingAbilityCardType]);


useEffect(() => {
  if (!beholderRequestPending) return;
  if (beholderTargetCardIds.length === 0) return;

  const revealed = privateReveals as Record<string, { type: string; value: number }> | undefined;
  if (!revealed) return;

  const matched: Record<string, { type: string; value: number }> = {};
  for (const id of beholderTargetCardIds) {
    if (revealed[id]) matched[id] = revealed[id];
  }

  // فقط وقتی قبول کن که هر چند کارتی که انتخاب شده (۱ یا ۲ تا)، همه‌شون رسیده باشن
  if (Object.keys(matched).length === beholderTargetCardIds.length) {
    setBeholderPeekedCards(matched);
    setBeholderRequestPending(false);
  }
}, [privateReveals, beholderTargetCardIds, beholderRequestPending]);

  useEffect(() => {
    setApprenticeSeerTargetPlayerId(null);
    setApprenticeSeerTargetCardId(null);
    setApprenticeSeerPeekedCard(null);
  }, [gameState?.pendingAbilityPlayerId, gameState?.pendingAbilityCardType]);

  useEffect(() => {
    if (!apprenticeSeerTargetCardId) return;
    const revealed = (privateReveals as Record<string, { type: string; value: number }> | undefined)?.[apprenticeSeerTargetCardId];
    if (revealed) setApprenticeSeerPeekedCard(revealed);
  }, [privateReveals, apprenticeSeerTargetCardId]);

    useEffect(() => {
      setSeerTargetPlayerId(null);
      setSeerTargetCardId(null);
      setSeerPeekedCard(null);
    }, [gameState?.pendingAbilityPlayerId, gameState?.pendingAbilityCardType]);

    useEffect(() => {
      if (!seerTargetCardId) return;
      const revealed = (privateReveals as Record<string, { type: string; value: number }> | undefined)?.[seerTargetCardId];
      if (revealed) setSeerPeekedCard(revealed);
    }, [privateReveals, seerTargetCardId]);

    useEffect(() => {
      setMasterTargetDiscardCardId(null);
      setMasterOwnCardId(null);
    }, [gameState?.pendingAbilityPlayerId, gameState?.pendingAbilityCardType]);

    useEffect(() => {
      setWitchTargetPlayerId(null);
      setWitchTargetCardId(null);
    }, [gameState?.pendingAbilityPlayerId, gameState?.pendingAbilityCardType]);

    useEffect(() => {
      setRobberTargetPlayerId(null);
      setRobberTargetCardId(null);
      setRobberOwnCardId(null);
    }, [gameState?.pendingAbilityPlayerId, gameState?.pendingAbilityCardType]);
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
  const isRobberAbilityPending =
  gameState.pendingAbilityCardType === "Robber" &&
  gameState.pendingAbilityPlayerId === myPlayerId;

const handleSelectOpponentCardForRobber = (targetPlayerId: string, cardId: string) => {
  if (!isRobberAbilityPending || targetPlayerId === myPlayerId) return;
  setRobberTargetPlayerId(targetPlayerId);
  setRobberTargetCardId(cardId);
};
const handleDeclareFinalRound = () => {
  if (!room) return;
  sendAction(room.roomCode, "DeclareFinalRound", {});
};

const canDeclareFinalRound =
  isMyTurn &&
  !myPendingDrawnCard &&
  !gameState.pendingAbilityPlayerId &&
  !gameState.hasBeenCalled &&
  !gameState.isFinalRoundDeclared;
const handleSelectOwnCardForRobber = (cardId: string) => {
  if (!isRobberAbilityPending) return;
  setRobberOwnCardId((prev) => (prev === cardId ? null : cardId));
};
const isMasterAbilityPending =
  gameState.pendingAbilityCardType === "Master" &&
  gameState.pendingAbilityPlayerId === myPlayerId;

const handleSelectDiscardCardForMaster = (cardId: string) => {
  if (!isMasterAbilityPending) return;
  setMasterTargetDiscardCardId((prev) => (prev === cardId ? null : cardId));
};

const handleSelectOwnCardForMaster = (cardId: string) => {
  if (!isMasterAbilityPending) return;
  setMasterOwnCardId((prev) => (prev === cardId ? null : cardId));
};

const handleConfirmMasterSwap = () => {
  console.log("master swap click", { room, masterTargetDiscardCardId, masterOwnCardId });
  if (!room || !masterTargetDiscardCardId || !masterOwnCardId) return;
  sendAction(room.roomCode, "MasterSwap", {
    discardCardId: masterTargetDiscardCardId,
    ownCardId: masterOwnCardId,
  });
};

const handleConfirmRobberSwap = () => {
  if (!room || !robberTargetPlayerId || !robberTargetCardId || !robberOwnCardId) return;
  sendAction(room.roomCode, "RobberSwap", {
    targetPlayerId: robberTargetPlayerId,
    targetCardId: robberTargetCardId,
    ownCardId: robberOwnCardId,
  });
};

const handleSkipAbility = () => {
  if (!room) return;
  sendAction(room.roomCode, "SkipAbility", {});
};
const isWitchAbilityPending =
  gameState.pendingAbilityCardType === "Witch" &&
  gameState.pendingAbilityPlayerId === myPlayerId;
  const isExposerAbilityPending =
  gameState.pendingAbilityCardType === "Exposer" &&
  gameState.pendingAbilityPlayerId === myPlayerId;

const handleSelectCardForExposer = (cardId: string) => {
  if (!isExposerAbilityPending || gameState.abilityUsedThisTurn) return;
  setExposerTargetCardId((prev: string | null) => (prev === cardId ? null : cardId));
};

const handleConfirmExposerReveal = () => {
  if (!room || !exposerTargetCardId) return;
  sendAction(room.roomCode, "ExposerReveal", {
    ownCardIdToReveal: exposerTargetCardId,
  });
};
const isSeerAbilityPending =
  gameState.pendingAbilityCardType === "Seer" &&
  gameState.pendingAbilityPlayerId === myPlayerId;

const handleSelectCardForSeer = (targetPlayerId: string, cardId: string) => {
  if (!isSeerAbilityPending || seerPeekedCard) return;
  setSeerTargetPlayerId(targetPlayerId);
  setSeerTargetCardId(cardId);
};

const handleShowSeerCard = () => {
  if (!room || !seerTargetPlayerId || !seerTargetCardId) return;
  sendAction(room.roomCode, "SeerPeek", {
    targetPlayerId: seerTargetPlayerId,
    targetCardId: seerTargetCardId,
  });
};
const isBeholderAbilityPending =
  gameState.pendingAbilityCardType === "Beholder" &&
  gameState.pendingAbilityPlayerId === myPlayerId;

const handleToggleCardForBeholder = (cardId: string) => {
  // بعد از فرستادن درخواست یا بعد از دیدن نتیجه، دیگه اجازه‌ی تغییر انتخاب نده
  if (!isBeholderAbilityPending || beholderRequestPending || Object.keys(beholderPeekedCards).length > 0) return;

  setBeholderTargetCardIds((prev) => {
    if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
    if (prev.length >= 2) return prev; // حداکثر ۲ تا
    return [...prev, cardId];
  });
};

const handleShowBeholderCards = () => {
  if (!room || beholderTargetCardIds.length === 0 || beholderRequestPending) return;
  setBeholderRequestPending(true);
  sendAction(room.roomCode, "BeholderPeek", {
    ownCardIds: beholderTargetCardIds,
  });
};
const isRevealerAbilityPending =
  gameState.pendingAbilityCardType === "Revealer" &&
  gameState.pendingAbilityPlayerId === myPlayerId;

const handleSelectCardForRevealer = (targetPlayerId: string, cardId: string) => {
  if (!isRevealerAbilityPending || gameState.abilityUsedThisTurn) return;
  setRevealerTargetPlayerId(targetPlayerId);
  setRevealerTargetCardId(cardId);
};

const handleConfirmRevealerReveal = () => {
  if (!room || !revealerTargetPlayerId || !revealerTargetCardId) return;
  sendAction(room.roomCode, "RevealerReveal", {
    targetPlayerId: revealerTargetPlayerId,
    targetCardId: revealerTargetCardId,
  });
};
const isApprenticeSeerAbilityPending =
  gameState.pendingAbilityCardType === "ApprenticeSeer" &&
  gameState.pendingAbilityPlayerId === myPlayerId;

const handleSelectCardForApprenticeSeer = (targetPlayerId: string, cardId: string) => {
  if (!isApprenticeSeerAbilityPending || apprenticeSeerPeekedCard) return;
  if (targetPlayerId === myPlayerId) return; // نمی‌تونه دهکده‌ی خودش رو انتخاب کنه
  setApprenticeSeerTargetPlayerId(targetPlayerId);
  setApprenticeSeerTargetCardId(cardId);
};

const handleShowApprenticeSeerCard = () => {
  if (!room || !apprenticeSeerTargetPlayerId || !apprenticeSeerTargetCardId) return;
  sendAction(room.roomCode, "ApprenticeSeerPeek", {
    targetPlayerId: apprenticeSeerTargetPlayerId,
    targetCardId: apprenticeSeerTargetCardId,
  });
};
const handleSelectCardForWitch = (targetPlayerId: string, cardId: string) => {
  if (!isWitchAbilityPending) return;
  setWitchTargetPlayerId(targetPlayerId);
  setWitchTargetCardId(cardId);
};

const handleConfirmWitchSwap = () => {
  if (!room || !witchTargetPlayerId || !witchTargetCardId) return;
  sendAction(room.roomCode, "WitchSwap", {
    targetPlayerId: witchTargetPlayerId,
    targetCardIds: [witchTargetCardId],
  });
};

  const handleDrawFromDeck = () => {
  if (!room || !isMyTurn || myPendingDrawnCard) return;
  if (gameState.pendingRascalChoiceOptions?.length) return;
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
  const handleSelectRascalCard = (cardId: string) => {
  setRascalSelectedCardId((prev) => (prev === cardId ? null : cardId));
};

const handleConfirmRascalChoice = () => {
  if (!room || !rascalSelectedCardId) return;
  sendAction(room.roomCode, "ChooseFromRascalDraw", { chosenCardId: rascalSelectedCardId });
};
const canUseBodyguard = isMyTurn && !gameState.sideActionUsedThisTurn && !myPendingDrawnCard;
const myVillage = gameState.villages[myPlayerId ?? ""];
const revealedEmpathCount = myVillage
  ? myVillage.cards.filter((c) => c.isPubliclyRevealed && c.type === "Empath").length
  : 0;
const canUseEmpath =
  isMyTurn && !gameState.sideActionUsedThisTurn && !myPendingDrawnCard && revealedEmpathCount > 0;

const handleToggleCardForEmpath = (cardId: string) => {
  if (!canUseEmpath || empathRequestPending || Object.keys(empathPeekedCards).length > 0) return;
  setEmpathSelectedCardIds((prev) => {
    if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
    if (prev.length >= revealedEmpathCount) return prev;
    return [...prev, cardId];
  });
  
};

// const handleShowEmpathCards = () => {
//   if (!room || empathSelectedCardIds.length === 0 || empathRequestPending) return;
//   setEmpathRequestPending(true);
//   sendAction(room.roomCode, "UseEmpath", { ownCardIds: empathSelectedCardIds });
// };
const handleShowEmpathCards = () => {
  console.log("[Empath] click - room:", room?.roomCode, "selected:", empathSelectedCardIds, "pending:", empathRequestPending);
  if (!room || empathSelectedCardIds.length === 0 || empathRequestPending) {
    console.log("[Empath] blocked by guard clause");
    return;
  }
  setEmpathRequestPending(true);
  sendAction(room.roomCode, "UseEmpath", { ownCardIds: empathSelectedCardIds }).then((res) => {
    console.log("[Empath] server response:", res);
  });
};
const handleStartNextRound = () => {
  if (!room) return;
  sendAction(room.roomCode, "StartNextRound", {});
};

const handleSelectBodyguardCard = (cardId: string) => {
  if (!canUseBodyguard) return;
  setBodyguardCardId((prev) => (prev === cardId ? null : cardId));
  setBodyguardTargetCardId(null);
};

const handleSelectBodyguardTarget = (cardId: string) => {
  if (!canUseBodyguard || !bodyguardCardId) return;
  if (cardId === bodyguardCardId) return; // محافظ نمی‌تونه از خودش محافظت کنه
  setBodyguardTargetCardId((prev) => (prev === cardId ? null : cardId));
};

const handleConfirmBodyguardProtect = () => {
  if (!room || !bodyguardCardId || !bodyguardTargetCardId) return;
  sendAction(room.roomCode, "MoveBodyguard", {
    bodyguardCardId,
    targetOwnCardId: bodyguardTargetCardId,
  });
  setBodyguardCardId(null);
  setBodyguardTargetCardId(null);
  
};

const myVillage = gameState.villages[myPlayerId ?? ""];
const myHasAmulet = !!myVillage?.cards.some((c: any) => c.type === "Amulet");
const amuletAlreadyLocked = !!myVillage?.amuletCoveredCardId;
const canUseAmulet = isMyTurn && myHasAmulet && !amuletAlreadyLocked;

const handleClickAmuletCard = (cardId: string) => {
  if (!canUseAmulet) return;
  setAmuletSelectedCardId((prev) => (prev === cardId ? null : cardId));
  setAmuletTargetCardId(null);
};

const handleSelectAmuletTarget = (cardId: string) => {
  if (!canUseAmulet || !amuletSelectedCardId || cardId === amuletSelectedCardId) return;
  setAmuletTargetCardId((prev) => (prev === cardId ? null : cardId));
};

const handleConfirmAmuletProtect = () => {
  if (!room || !amuletTargetCardId) return;
  sendAction(room.roomCode, "SetAmuletProtection", { targetOwnCardId: amuletTargetCardId });
  setAmuletSelectedCardId(null);
  setAmuletTargetCardId(null);
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
      {(gameState.phase === "RoundScoring" || gameState.phase === "GameFinished") && (
  <RoundSummaryOverlay
  gameState={gameState}
  showDetails={showRoundSummaryDetails}
  onToggleDetails={() => setShowRoundSummaryDetails((v) => !v)}
  onStartNextRound={handleStartNextRound}
  getPlayerName={displayName}
/>
)}
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
        {gameState.isFinalRoundDeclared && (
  <div className="text-sm text-ember">
    دور آخر توسط {displayName(gameState.finalRoundDeclarerPlayerId)} اعلام شده — با رسیدن نوبت به او، این دور تمام می‌شود.
  </div>
)}

{canDeclareFinalRound && (
  <button
    className="rounded-md bg-panel-light px-3 py-1.5 text-xs font-medium hover:bg-panel transition mt-1"
    onClick={handleDeclareFinalRound}
  >
    دور آخر
  </button>
)}
        <div className="text-sm">
          نوبت:
          <span className="text-ember">
            {displayName(gameState.currentPlayerId)}
          </span>
        </div>

        {gameState.amuletHolderPlayerId && (
          <div className="text-sm">
            🔮 آمیولت دست:
            <span className="text-silver">
              {displayName(gameState.amuletHolderPlayerId)}
            </span>
          </div>
        )}
      </div>

      

      <div className="grid grid-cols-3 grid-rows-3 gap-4 items-center justify-items-center min-h-[520px]">
        <div className="col-start-2 row-start-2 flex gap-6 items-center justify-center relative">
          <DrawPileStack
            count={gameState.drawPileCount}
            onClick={handleDrawFromDeck}
            disabled={!isMyTurn || !!myPendingDrawnCard || !!gameState.pendingRascalChoiceOptions?.length}
          />
          {!!gameState.squireRevealedCards?.length && (
  <div className="flex flex-col items-center gap-1">
    <div className="flex gap-1">
      {gameState.squireRevealedCards.map((card: any) => (
        <div
          key={card.cardId}
          onClick={() => {
            if (!room || !isMyTurn || myPendingDrawnCard) return;
            sendAction(room.roomCode, "TakeSquireCard", { squireCardId: card.cardId });
          }}
          className={`transition ${
            isMyTurn && !myPendingDrawnCard
              ? "cursor-pointer hover:brightness-110"
              : "opacity-60 cursor-not-allowed"
          }`}
        >
          <PeekableCard
            card={card}
            canPeek={false}
            peekWindowOpen={false}
            onPeek={() => {}}
            peekedValue={null}
            size="opponent"
          />
        </div>
      ))}
    </div>
    <span className="text-[10px] text-silver/40">کارت‌های کمکی</span>
  </div>
)}

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
        {isMe ? "روستای تو" : displayName(village.playerId)}
        {isCurrentTurn && (
          <span className="text-[10px] font-body text-blood-moon animate-pulse">● نوبتشه</span>
        )}
        <span className="mr-auto">
          {" — امتیاز کل: "}
          <span className="font-mono text-ember">{gameState.cumulativeScores[displayName(village.playerId)]}</span>
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
  const canSelectForSwap = isMe && !!myPendingDrawnCard && drawnCardInVillage;

  const isRobberOwnSelectable = isMe && isRobberAbilityPending;
  const isRobberOwnSelected = robberOwnCardId === card.cardId;

  const bodyguardKnownAndBlocked = card.isPubliclyRevealed && card.type === "Bodyguard";
  const isRobberTargetSelectable = !isMe && isRobberAbilityPending && !bodyguardKnownAndBlocked;
  const isRobberTargetSelected = robberTargetCardId === card.cardId;

  const isWitchSelectable = isWitchAbilityPending && !bodyguardKnownAndBlocked;
  const isWitchSelected = witchTargetCardId === card.cardId;
  const isMasterOwnSelectable = isMe && isMasterAbilityPending;
  const isMasterOwnSelected = masterOwnCardId === card.cardId;
  const isSeerSelectable = isSeerAbilityPending && !seerPeekedCard && !card.isPubliclyRevealed;
  const isSeerSelected = seerTargetCardId === card.cardId;
  const isApprenticeSeerSelectable =
  isApprenticeSeerAbilityPending && !isMe && !apprenticeSeerPeekedCard && !card.isPubliclyRevealed;
const isApprenticeSeerSelected = apprenticeSeerTargetCardId === card.cardId;
const isBeholderSelectable =
  isBeholderAbilityPending && isMe && Object.keys(beholderPeekedCards).length === 0 && !card.isPubliclyRevealed;
const isBeholderSelected = beholderTargetCardIds.includes(card.cardId);
const isExposerSelectable =
  isExposerAbilityPending && isMe && !gameState.abilityUsedThisTurn && !card.isPubliclyRevealed;
const isExposerSelected = exposerTargetCardId === card.cardId;
const isBodyguardCardItself = isMe && canUseBodyguard && card.isPubliclyRevealed && card.type === "Bodyguard";
const isEmpathSelectable =
  isMe && canUseEmpath && Object.keys(empathPeekedCards).length === 0 && !card.isPubliclyRevealed;
const isEmpathSelected = empathSelectedCardIds.includes(card.cardId);
const isBodyguardSelected = bodyguardCardId === card.cardId;

const isBodyguardTargetSelectable = isMe && canUseBodyguard && !!bodyguardCardId && card.cardId !== bodyguardCardId;
const isBodyguardTargetSelected = bodyguardTargetCardId === card.cardId;
const isBodyguardCardCurrentlyProtecting =
  isMe && card.isPubliclyRevealed && card.type === "Bodyguard" && !!village.bodyguardProtectingCardId;

// اگه این کارت خودِ بادیگارده و الان داره از یه کارت دیگه محافظت می‌کنه،
// جای عادیش خالی می‌مونه؛ چون بادیگارد رو روی کارتی که ازش محافظت می‌کنه نشون می‌دیم.
if (isBodyguardCardCurrentlyProtecting) return null;

const isThisCardProtected =
  isMe && !!village.bodyguardProtectingCardId && card.cardId === village.bodyguardProtectingCardId;
const protectingBodyguardCard = isThisCardProtected
  ? village.cards.find((c) => c.isPubliclyRevealed && c.type === "Bodyguard")
  : null;
const bodyguardKnownAndBlockedForRevealer =
  !isMe && card.isPubliclyRevealed && card.type === "Bodyguard";
const isRevealerSelectable =
  isRevealerAbilityPending &&
  !gameState.abilityUsedThisTurn &&
  !card.isPubliclyRevealed &&
  !bodyguardKnownAndBlockedForRevealer;
const isRevealerSelected = revealerTargetCardId === card.cardId;

 const canClick =
  canSelectForSwap ||
  isRobberOwnSelectable || isRobberTargetSelectable ||
  isWitchSelectable ||
  isMasterOwnSelectable ||
  isSeerSelectable ||
  isApprenticeSeerSelectable ||
  isBeholderSelectable ||
  isExposerSelectable ||
  isRevealerSelectable ||
  isBodyguardCardItself ||
  isBodyguardTargetSelectable ||
  isEmpathSelectable;

const handleClick = () => {
  if (canSelectForSwap) toggleCardSelection(card.cardId);
  else if (isRobberOwnSelectable) handleSelectOwnCardForRobber(card.cardId);
  else if (isRobberTargetSelectable) handleSelectOpponentCardForRobber(village.playerId, card.cardId);
  else if (isWitchSelectable) handleSelectCardForWitch(village.playerId, card.cardId);
  else if (isMasterOwnSelectable) handleSelectOwnCardForMaster(card.cardId);
  else if (isSeerSelectable) handleSelectCardForSeer(village.playerId, card.cardId);
  else if (isApprenticeSeerSelectable) handleSelectCardForApprenticeSeer(village.playerId, card.cardId);
  else if (isBeholderSelectable) handleToggleCardForBeholder(card.cardId);
  else if (isExposerSelectable) handleSelectCardForExposer(card.cardId);
  else if (isRevealerSelectable) handleSelectCardForRevealer(village.playerId, card.cardId);
  else if (bodyguardCardId && isBodyguardTargetSelectable) handleSelectBodyguardTarget(card.cardId);
  else if (isBodyguardCardItself) handleSelectBodyguardCard(card.cardId);
  else if (isEmpathSelectable) handleToggleCardForEmpath(card.cardId);
};

 return (
  <div key={card.cardId} className={isThisCardProtected ? "relative" : undefined}>
    <div
      onClick={canClick ? handleClick : undefined}
      className={`transition-transform ${canClick ? "cursor-pointer" : ""} ${
        isSelected || isRobberOwnSelected || isRobberTargetSelected || isWitchSelected ||
        isMasterOwnSelected || isSeerSelected || isApprenticeSeerSelected || isBeholderSelected ||
        isExposerSelected || isRevealerSelected || isBodyguardSelected || isBodyguardTargetSelected ||
        isEmpathSelected
          ? "-translate-y-3 ring-4 ring-ember rounded-md"
          : ""
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

    {protectingBodyguardCard && (
      <div
        onClick={
          canUseBodyguard
            ? () => handleSelectBodyguardCard(protectingBodyguardCard.cardId)
            : undefined
        }
        className={`absolute -top-3 -right-3 z-10 rotate-6 scale-75 transition-transform ${
          canUseBodyguard ? "cursor-pointer hover:brightness-110" : ""
        } ${
          bodyguardCardId === protectingBodyguardCard.cardId
            ? "ring-4 ring-ember rounded-md -translate-y-1"
            : ""
        }`}
      >
        <PeekableCard
          card={protectingBodyguardCard}
          canPeek={false}
          peekWindowOpen={false}
          onPeek={() => {}}
          peekedValue={null}
          size="own"
        />
      </div>
    )}
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
      {isMyTurn && !!gameState.pendingRascalChoiceOptions?.length && (
  <div className="flex flex-col items-center gap-3">
    <div className="flex gap-3">
      {gameState.pendingRascalChoiceOptions.map((card: any) => {
        const isSelected = rascalSelectedCardId === card.cardId;
        return (
          <div
            key={card.cardId}
            onClick={() => handleSelectRascalCard(card.cardId)}
            className={`cursor-pointer transition-transform ${
              isSelected ? "-translate-y-3 ring-4 ring-ember rounded-md" : "hover:brightness-110"
            }`}
          >
            <PeekableCard
              card={card}
              canPeek={false}
              peekWindowOpen={false}
              onPeek={() => {}}
              peekedValue={null}
              size="own"
              forceReveal
            />
          </div>
        );
      })}
    </div>

    <button
      className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
      disabled={!rascalSelectedCardId}
      onClick={handleConfirmRascalChoice}
    >
      انتخاب این کارت
    </button>
  </div>
)}
      {isRobberAbilityPending && (
  <div className="flex justify-center gap-2">
    <button
      className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
      disabled={!robberTargetCardId || !robberOwnCardId}
      onClick={handleConfirmRobberSwap}
    >
      جابه‌جایی کارت‌ها
    </button>
    <button
      className="rounded-md bg-panel-light px-4 py-2 text-sm font-medium hover:bg-panel transition"
      onClick={handleSkipAbility}
    >
      پایان نوبت
    </button>
  </div>
)}
{bodyguardCardId && (
  <div className="flex justify-center gap-2">
    <button
      className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
      disabled={!bodyguardTargetCardId}
      onClick={handleConfirmBodyguardProtect}
    >
      محافظت
    </button>
    <button
      className="rounded-md bg-panel-light px-4 py-2 text-sm font-medium hover:bg-panel transition"
      onClick={() => {
        setBodyguardCardId(null);
        setBodyguardTargetCardId(null);
      }}
    >
      انصراف
    </button>
  </div>
)}
{/* {canUseEmpath && ( */}
{(canUseEmpath || Object.keys(empathPeekedCards).length > 0) && (
  <div className="flex flex-col items-center gap-3">
    {Object.keys(empathPeekedCards).length > 0 ? (
      <div className="flex gap-2">
        {empathSelectedCardIds.map((cardId) => {
          const peeked = empathPeekedCards[cardId];
          if (!peeked) return null;
          return (
            <PeekableCard
              key={cardId}
              card={{
                cardId,
                type: peeked.type as CardType,
                value: peeked.value,
                isPubliclyRevealed: false,
              }}
              canPeek={false}
              peekWindowOpen={false}
              onPeek={() => {}}
              peekedValue={null}
              size="own"
              forceReveal
            />
          );
        })}
      </div>
    ) : (
      <button
        className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
        disabled={empathSelectedCardIds.length === 0 || empathRequestPending}
        onClick={handleShowEmpathCards}
      >
        {empathRequestPending
          ? "در حال دریافت..."
          : `دیدن کارت${empathSelectedCardIds.length > 1 ? "‌ها" : ""} (${empathSelectedCardIds.length}/${revealedEmpathCount})`}
      </button>
    )}
  </div>
)}
{isExposerAbilityPending && (
  <div className="flex justify-center gap-2">
    {!gameState.abilityUsedThisTurn && (
      <button
        className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
        disabled={!exposerTargetCardId}
        onClick={handleConfirmExposerReveal}
      >
        رو کردن کارت
      </button>
    )}
    <button
      className="rounded-md bg-panel-light px-4 py-2 text-sm font-medium hover:bg-panel transition"
      onClick={handleSkipAbility}
    >
      پایان نوبت
    </button>
  </div>
)}
{isRevealerAbilityPending && (
  <div className="flex justify-center gap-2">
    {!gameState.abilityUsedThisTurn && (
      <button
        className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
        disabled={!revealerTargetCardId}
        onClick={handleConfirmRevealerReveal}
      >
        رو کردن کارت
      </button>
    )}
    <button
      className="rounded-md bg-panel-light px-4 py-2 text-sm font-medium hover:bg-panel transition"
      onClick={handleSkipAbility}
    >
      پایان نوبت
    </button>
  </div>
)}
{isSeerAbilityPending && (
  <div className="flex flex-col items-center gap-3">
    {seerPeekedCard && (
      <PeekableCard
        card={{
          cardId: seerTargetCardId!,
          type: seerPeekedCard.type as CardType,
          value: seerPeekedCard.value,
          isPubliclyRevealed: false,
        }}
        canPeek={false}
        peekWindowOpen={false}
        onPeek={() => {}}
        peekedValue={null}
        size="own"
        forceReveal
      />
    )}

    <div className="flex gap-2">
      {!seerPeekedCard && (
        <button
          className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
          disabled={!seerTargetCardId}
          onClick={handleShowSeerCard}
        >
          نمایش کارت
        </button>
      )}
      <button
        className="rounded-md bg-panel-light px-4 py-2 text-sm font-medium hover:bg-panel transition"
        onClick={handleSkipAbility}
      >
        پایان نوبت
      </button>
    </div>
  </div>
)}
{isApprenticeSeerAbilityPending && (
  <div className="flex flex-col items-center gap-3">
    {apprenticeSeerPeekedCard && (
      <PeekableCard
        card={{
          cardId: apprenticeSeerTargetCardId!,
          type: apprenticeSeerPeekedCard.type as CardType,
          value: apprenticeSeerPeekedCard.value,
          isPubliclyRevealed: false,
        }}
        canPeek={false}
        peekWindowOpen={false}
        onPeek={() => {}}
        peekedValue={null}
        size="own"
        forceReveal
      />
    )}

    <div className="flex gap-2">
      {!apprenticeSeerPeekedCard && (
        <button
          className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
          disabled={!apprenticeSeerTargetCardId}
          onClick={handleShowApprenticeSeerCard}
        >
          نمایش کارت
        </button>
      )}
      <button
        className="rounded-md bg-panel-light px-4 py-2 text-sm font-medium hover:bg-panel transition"
        onClick={handleSkipAbility}
      >
        پایان نوبت
      </button>
    </div>
  </div>
)}
{isBeholderAbilityPending && (
  <div className="flex flex-col items-center gap-3">
    {Object.keys(beholderPeekedCards).length > 0 && (
      <div className="flex gap-2">
        {beholderTargetCardIds.map((cardId) => {
          const peeked = beholderPeekedCards[cardId];
          if (!peeked) return null;
          return (
            <PeekableCard
              key={cardId}
              card={{
                cardId,
                type: peeked.type as CardType,
                value: peeked.value,
                isPubliclyRevealed: false,
              }}
              canPeek={false}
              peekWindowOpen={false}
              onPeek={() => {}}
              peekedValue={null}
              size="own"
              forceReveal
            />
          );
        })}
      </div>
    )}

    <div className="flex gap-2">
      {Object.keys(beholderPeekedCards).length === 0 && (
        <button
        className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
        disabled={beholderTargetCardIds.length === 0 || beholderRequestPending}
        onClick={handleShowBeholderCards}
      >
                {beholderRequestPending ? "در حال دریافت..." : `نمایش کارت${beholderTargetCardIds.length === 2 ? "‌ها" : ""}`}
      </button>
      )}
      <button
        className="rounded-md bg-panel-light px-4 py-2 text-sm font-medium hover:bg-panel transition"
        onClick={handleSkipAbility}
      >
        پایان نوبت
      </button>
    </div>
  </div>
)}
{isWitchAbilityPending && (
  <div className="flex flex-col items-center gap-2">
    {gameState.pendingWitchCard && (
      <PeekableCard
        card={gameState.pendingWitchCard}
        canPeek={false}
        peekWindowOpen={false}
        onPeek={() => {}}
        peekedValue={null}
        size="own"
        forceReveal
      />
    )}
    <div className="flex gap-2">
      <button
        className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
        disabled={!witchTargetCardId}
        onClick={handleConfirmWitchSwap}
      >
        جابه‌جایی کارت‌ها
      </button>
      <button
        className="rounded-md bg-panel-light px-4 py-2 text-sm font-medium hover:bg-panel transition"
        onClick={handleSkipAbility}
      >
        پایان نوبت
      </button>
    </div>
  </div>
)}
{isMasterAbilityPending && (
  <div className="flex flex-col items-center gap-3">
    <div className="w-full max-w-3xl overflow-x-auto">
      <div className="flex gap-2 px-2 py-3 bg-panel rounded-lg">
        {gameState.discardPile.map((card: any) => {
          const isSelected = masterTargetDiscardCardId === card.cardId;
          return (
            <div
              key={card.cardId}
              onClick={() => handleSelectDiscardCardForMaster(card.cardId)}
              className={`shrink-0 cursor-pointer transition-transform ${
                isSelected ? "-translate-y-2 ring-4 ring-ember rounded-md" : "hover:brightness-110"
              }`}
            >
              <PeekableCard
                card={card}
                canPeek={false}
                peekWindowOpen={false}
                onPeek={() => {}}
                peekedValue={null}
                size="opponent"
              />
            </div>
          );
        })}
      </div>
    </div>

    <div className="flex gap-2">
      <button
        className="rounded-md bg-blood-moon px-4 py-2 text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
        disabled={!masterTargetDiscardCardId || !masterOwnCardId}
        onClick={handleConfirmMasterSwap}
      >
        جابه‌جایی کارت‌ها
      </button>
      <button
        className="rounded-md bg-panel-light px-4 py-2 text-sm font-medium hover:bg-panel transition"
        onClick={handleSkipAbility}
      >
        پایان نوبت
      </button>
    </div>
  </div>
)}

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