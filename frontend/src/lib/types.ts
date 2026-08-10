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