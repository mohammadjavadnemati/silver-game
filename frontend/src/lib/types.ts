export type PlayerInfo = {
  playerId: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
};

export type RoomInfo = {
  roomCode: string;
  status: "WaitingForPlayers" | "InGame" | "Finished";
  players: PlayerInfo[];
};

export type CardType =
  | "Villager" | "Squire" | "Empath" | "Bodyguard" | "Rascal"
  | "Exposer" | "Revealer" | "Beholder" | "ApprenticeSeer" | "Seer"
  | "Master" | "Witch" | "Robber" | "Doppelganger";

export type CardView = {
  cardId: string;
  type: CardType | null;   // null یعنی پشت‌ورو و برای تو قابل دیدن نیست
  value: number | null;
  isPubliclyRevealed: boolean;
};

export type VillageView = {
  playerId: string;
  bodyguardProtectingCardId: string | null; // فقط برای صاحب روستا پر می‌شه
  cards: CardView[];
};

export type GamePhase =
  | "WaitingToStart" | "RoundInProgress" | "FinalTurnsAfterCall"
  | "RoundScoring" | "GameFinished";

export type GameStateView = {
  gameId: string;
  phase: GamePhase;
  roundNumber: number;
  currentPlayerId: string;
  playerIdsInTurnOrder: string[];
  cumulativeScores: Record<string, number>;
  hasBeenCalled: boolean;
  callerPlayerId: string | null;
  amuletHolderPlayerId: string | null;
  drawPileCount: number;
  discardPileTop: CardView | null;
  discardPileCount: number;
  squireRevealedCards: CardView[];
  pendingAbilityPlayerId: string | null;
  pendingAbilityCardType: CardType | null;
  pendingDrawnCard: CardView | null;
  villages: Record<string, VillageView>;
  winnerPlayerId: string | null;
  myInitialPeeksRemaining: number;
};

export const CARD_NAMES_FA: Record<CardType, string> = {
  Villager: "اهل دهکده",
  Squire: "سرباز جوان",
  Empath: "همدل",
  Bodyguard: "محافظ",
  Rascal: "شیطون",
  Exposer: "افشاگر",
  Revealer: "آشکارساز",
  Beholder: "بیننده",
  ApprenticeSeer: "شاگرد غیب‌گو",
  Seer: "غیب‌گو",
  Master: "استاد",
  Witch: "جادوگر",
  Robber: "دزد",
  Doppelganger: "بدل",
};