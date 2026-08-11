// "use client";

// import { useEffect, useRef, useState, useCallback } from "react";
// import * as signalR from "@microsoft/signalr";
// import type { RoomInfo, GameStateView } from "./types";

// const HUB_URL = "http://localhost:5000/hubs/game";


// function getOrCreatePlayerId(): string {
//   if (typeof window === "undefined") return "";
//   const key = "silver_player_id";
//   let id = localStorage.getItem(key);
//   if (!id) {
//     id = crypto.randomUUID();
//     localStorage.setItem(key, id);
//   }
//   return id;
// }

// type ActionResult = { success: boolean; error?: string };

// export function useGameConnection() {
//   const connectionRef = useRef<signalR.HubConnection | null>(null);
//   const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
//   const [room, setRoom] = useState<RoomInfo | null>(null);
//   const [gameState, setGameState] = useState<GameStateView | null>(null);
//   const [joinError, setJoinError] = useState<string | null>(null);
//   const [lastActionError, setLastActionError] = useState<string | null>(null);
//   const [privateReveals, setPrivateReveals] = useState<Record<string, { type: string; value: number }>>({});

//   useEffect(() => {
//     const connection = new signalR.HubConnectionBuilder()
//       .withUrl(HUB_URL)
//       .withAutomaticReconnect()
//       .configureLogging(signalR.LogLevel.Information)
//       .build();

//     connection.on("RoomUpdated", (updatedRoom: RoomInfo) => setRoom(updatedRoom));
//     connection.on("GameStateUpdated", (state: GameStateView) => setGameState(state));
//     connection.on("PrivateCardsRevealed", (reveals: Record<string, { type: string; value: number }>) => {
//       setPrivateReveals((prev) => ({ ...prev, ...reveals }));
//     });
    

//     connection.onreconnecting(() => setStatus("connecting"));
//     connection.onreconnected(() => setStatus("connected"));
//     connection.onclose(() => setStatus("disconnected"));

//     setStatus("connecting");
//     connection.start().then(() => setStatus("connected")).catch(() => setStatus("disconnected"));
//     connectionRef.current = connection;

//     return () => { connection.stop(); };
//   }, []);

//   const createRoom = useCallback(async (playerName: string) => {
//     const playerId = getOrCreatePlayerId();
//     const result = await connectionRef.current?.invoke("CreateRoom", playerId, playerName);
//     setRoom(result as RoomInfo);
//     return result as RoomInfo;
//   }, []);

//   const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
//     const playerId = getOrCreatePlayerId();
//     setJoinError(null);
//     const result = await connectionRef.current?.invoke("JoinRoom", roomCode, playerId, playerName);
//     const typed = result as { success: boolean; error?: string; room?: RoomInfo };
//     if (!typed.success) {
//       setJoinError(typed.error ?? "خطای ناشناخته");
//       return null;
//     }
//     setRoom(typed.room ?? null);
//     return typed.room;
//   }, []);

//   const startGame = useCallback(async (roomCode: string) => {
//     const result = (await connectionRef.current?.invoke("StartGame", roomCode)) as ActionResult;
//     if (!result.success) setLastActionError(result.error ?? "خطا در شروع بازی");
//     return result;
//   }, []);

//   const sendAction = useCallback(async (roomCode: string, actionType: string, payload: Record<string, unknown>) => {
//     const playerId = getOrCreatePlayerId();
//     const result = (await connectionRef.current?.invoke("SendGameAction", roomCode, actionType, {
//       playerId,
//       ...payload,
//     })) as ActionResult;

//     if (!result.success) {
//       setLastActionError(result.error ?? "خطای ناشناخته");
//     } else {
//       setLastActionError(null);
//     }
//     return result;
//   }, []);

//   return {
//     status, room, gameState, joinError, lastActionError,
//     createRoom, joinRoom, startGame, sendAction,
//     myPlayerId: getOrCreatePlayerId(),
//     privateReveals,
//   };
// }
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import type { RoomInfo, GameStateView } from "./types";

const HUB_URL = "http://localhost:5000/hubs/game";


function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return "";
  const key = "silver_player_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

type ActionResult = { success: boolean; error?: string };

export function useGameConnection() {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [gameState, setGameState] = useState<GameStateView | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [lastActionError, setLastActionError] = useState<string | null>(null);
  const [privateReveals, setPrivateReveals] = useState<Record<string, { type: string; value: number }>>({});

  useEffect(() => {
    // در React Strict Mode (فقط dev)، effect دوبار اجرا می‌شود.
    // اگر connection از قبل ساخته شده، دوباره نساز تا وسط negotiation قطع نشود.
    if (connectionRef.current) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.on("RoomUpdated", (updatedRoom: RoomInfo) => setRoom(updatedRoom));
    connection.on("GameStateUpdated", (state: GameStateView) => setGameState(state));
    connection.on("PrivateCardsRevealed", (reveals: Record<string, { type: string; value: number }>) => {
      setPrivateReveals((prev) => ({ ...prev, ...reveals }));
    });

    connection.onreconnecting(() => setStatus("connecting"));
    connection.onreconnected(() => setStatus("connected"));
    connection.onclose(() => setStatus("disconnected"));

    setStatus("connecting");
    connectionRef.current = connection;
    connection.start().then(() => setStatus("connected")).catch(() => setStatus("disconnected"));

    return () => {
      // عمداً در اینجا connection.stop() صدا زده نمی‌شود تا در Strict Mode
      // (که effect را cleanup و دوباره اجرا می‌کند) اتصال واقعی از بین نرود.
    };
  }, []);

  const createRoom = useCallback(async (playerName: string) => {
    const playerId = getOrCreatePlayerId();
    const result = await connectionRef.current?.invoke("CreateRoom", playerId, playerName);
    setRoom(result as RoomInfo);
    return result as RoomInfo;
  }, []);

  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    const playerId = getOrCreatePlayerId();
    setJoinError(null);
    const result = await connectionRef.current?.invoke("JoinRoom", roomCode, playerId, playerName);
    const typed = result as { success: boolean; error?: string; room?: RoomInfo };
    if (!typed.success) {
      setJoinError(typed.error ?? "خطای ناشناخته");
      return null;
    }
    setRoom(typed.room ?? null);
    return typed.room;
  }, []);

  const startGame = useCallback(async (roomCode: string) => {
    const result = (await connectionRef.current?.invoke("StartGame", roomCode)) as ActionResult;
    if (!result.success) setLastActionError(result.error ?? "خطا در شروع بازی");
    return result;
  }, []);

  const sendAction = useCallback(async (roomCode: string, actionType: string, payload: Record<string, unknown>) => {
    const playerId = getOrCreatePlayerId();
    const result = (await connectionRef.current?.invoke("SendGameAction", roomCode, actionType, {
      playerId,
      ...payload,
    })) as ActionResult;

    if (!result.success) {
      setLastActionError(result.error ?? "خطای ناشناخته");
    } else {
      setLastActionError(null);
    }
    return result;
  }, []);

  return {
    status, room, gameState, joinError, lastActionError,
    createRoom, joinRoom, startGame, sendAction,
    myPlayerId: getOrCreatePlayerId(),
    privateReveals,
  };
}