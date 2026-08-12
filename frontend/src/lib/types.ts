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
  initialPeekDeadlineUtc: string;
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
  InitialPeekDeadlineUtc: string | null;   // ← جدید
  myInitialPeeksRemaining: number; 
  drawnCardSource: "None" | "Deck" | "Discard" | "Squire";
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
export const CARD_IMAGES: Record<CardType, string> = {
  Villager: "/cards/Villager.jpg",
  Squire: "/cards/Squire.jpg",
  Empath: "/cards/Empath.jpg",
  Bodyguard: "/cards/Bodyguard.jpg",
  Rascal: "/cards/Rascal.jpg",
  Exposer: "/cards/Exposer.jpg",
  Revealer: "/cards/Revealer.jpg",
  Beholder: "/cards/Beholder.jpg",
  ApprenticeSeer: "/cards/apprenticeseer.jpg",
  Seer: "/cards/Seer.jpg",
  Master: "/cards/Master.jpg",
  Witch: "/cards/Witch.jpg",
  Robber: "/cards/Robber.jpg",
  Doppelganger: "/cards/Doppelganger.jpg",
};

export const CARD_BACK_IMAGE = "/cards/back.png";

// توضیح توانایی هر کارت — متن دلخواه خودتو جای این‌ها بذار
export const CARD_DESCRIPTIONS_FA: Record<CardType, string> = { 
  Villager: "با رو شدن هر دو مزرعه‌دار، راند فوراً تمام می‌شود.", 
  Squire: "به ازای هر سرباز جوان رو‌شده، یک کارت کنار دسته اصلی رو می‌شود.", 
  Empath: "یک کارت پشت‌ورو از روستای خودت را مخفیانه ببین.", 
  Bodyguard: "این کارت را روی کارت دیگری بگذار تا از آن محافظت کند.", 
  Rascal: "به ازای هر شیطون رو‌شده، یک کارت اضافه از دسته بکش و یکی را انتخاب کن.", 
  Exposer: "یک کارت پشت‌ورو از روستای خودت را رو کن.", 
  Revealer: "یک کارت پشت‌ورو از هر روستایی را رو کن.", 
  Beholder: "دو کارت پشت‌ورو از روستای خودت را مخفیانه ببین.",
  ApprenticeSeer: "یک کارت پشت‌ورو از روستای بازیکن دیگر را مخفیانه ببین.", 
  Seer: "یک کارت پشت‌ورو را مخفیانه ببین.",
  Master: "هر کارت دلخواه از دسته دورریختنی را برای تعویض انتخاب کن.", 
  Witch: "کارت بالای دسته را مخفیانه ببین و با کارت روستای خودت یا بازیکن دیگر تعویض کن.", 
  Robber: "یک کارت از روستای بازیکن دیگر را با یکی از کارت‌های خودت تعویض کن.", 
  Doppelganger: "هنگام تعویض چندتایی، می‌تواند با هر عددی هم‌عدد محسوب شود.", };
  