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

type ActionResult = {
  success: boolean;
  error?: string;
};

type PrivateReveal = {
  type: string;
  value: number;
};

export function useGameConnection() {
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const [status, setStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [gameState, setGameState] = useState<GameStateView | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [lastActionError, setLastActionError] = useState<string | null>(null);

  const [privateReveals, setPrivateReveals] = useState<
    Record<string, PrivateReveal>
  >({});

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connectionRef.current = connection;

    connection.on("RoomUpdated", (updatedRoom: RoomInfo) => {
      setRoom(updatedRoom);
    });

    connection.on("GameStateUpdated", (state: GameStateView) => {
      setGameState(state);
    });

    connection.on(
      "PrivateCardsRevealed",
      (reveals: Record<string, PrivateReveal>) => {
        setPrivateReveals((prev) => ({
          ...prev,
          ...reveals,
        }));
      }
    );

    connection.on("PrivateCardsExpired", () => {
      setPrivateReveals({});
    });

    connection.onreconnecting(() => {
      setStatus("connecting");
    });

    connection.onreconnected(() => {
      setStatus("connected");
    });

    connection.onclose(() => {
      setStatus("disconnected");
    });

    setStatus("connecting");

    connection
      .start()
      .then(() => {
        setStatus("connected");
      })
      .catch((error) => {
        console.error("SignalR connection failed:", error);
        setStatus("disconnected");
      });

    return () => {
      connection.off("RoomUpdated");
      connection.off("GameStateUpdated");
      connection.off("PrivateCardsRevealed");
      connection.off("PrivateCardsExpired");

      connection.stop();

      connectionRef.current = null;
    };
  }, []);

  const createRoom = useCallback(async (playerName: string) => {
    const connection = connectionRef.current;

    if (!connection) {
      throw new Error("SignalR هنوز متصل نشده است.");
    }

    if (connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("اتصال به سرور برقرار نیست.");
    }

    const playerId = getOrCreatePlayerId();

    const result = await connection.invoke<RoomInfo>(
      "CreateRoom",
      playerId,
      playerName
    );

    setRoom(result);

    return result;
  }, []);

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string) => {
      const connection = connectionRef.current;

      if (!connection) {
        setJoinError("اتصال به سرور برقرار نیست.");
        return null;
      }

      if (connection.state !== signalR.HubConnectionState.Connected) {
        setJoinError("اتصال به سرور برقرار نیست.");
        return null;
      }

      const playerId = getOrCreatePlayerId();

      setJoinError(null);

      try {
        const result = await connection.invoke<{
          success: boolean;
          error?: string;
          room?: RoomInfo;
        }>("JoinRoom", roomCode, playerId, playerName);

        if (!result.success) {
          setJoinError(result.error ?? "خطای ناشناخته");
          return null;
        }

        setRoom(result.room ?? null);

        return result.room ?? null;
      } catch (error) {
        console.error("JoinRoom failed:", error);
        setJoinError("خطا در اتصال به اتاق.");
        return null;
      }
    },
    []
  );

  const startGame = useCallback(async (roomCode: string) => {
    const connection = connectionRef.current;

    if (!connection) {
      return {
        success: false,
        error: "اتصال به سرور برقرار نیست.",
      };
    }

    if (connection.state !== signalR.HubConnectionState.Connected) {
      return {
        success: false,
        error: "اتصال به سرور برقرار نیست.",
      };
    }

    try {
      const result = await connection.invoke<ActionResult>(
        "StartGame",
        roomCode
      );

      if (!result.success) {
        setLastActionError(result.error ?? "خطا در شروع بازی");
      } else {
        setLastActionError(null);
      }

      return result;
    } catch (error) {
      console.error("StartGame failed:", error);

      const result = {
        success: false,
        error: "خطا در شروع بازی.",
      };

      setLastActionError(result.error);

      return result;
    }
  }, []);

  const sendAction = useCallback(
    async (
      roomCode: string,
      actionType: string,
      payload: Record<string, unknown>
    ) => {
      const connection = connectionRef.current;

      if (!connection) {
        const result = {
          success: false,
          error: "اتصال به سرور برقرار نیست.",
        };

        setLastActionError(result.error);

        return result;
      }

      if (connection.state !== signalR.HubConnectionState.Connected) {
        const result = {
          success: false,
          error: "اتصال به سرور برقرار نیست.",
        };

        setLastActionError(result.error);

        return result;
      }

      const playerId = getOrCreatePlayerId();

      try {
        const result = await connection.invoke<ActionResult>(
          "SendGameAction",
          roomCode,
          actionType,
          {
            playerId,
            ...payload,
          }
        );

        if (!result.success) {
          setLastActionError(result.error ?? "خطای ناشناخته");
        } else {
          setLastActionError(null);
        }

        return result;
      } catch (error) {
        console.error("SendGameAction failed:", error);

        const result = {
          success: false,
          error: "خطا در ارسال اکشن.",
        };

        setLastActionError(result.error);

        return result;
      }
    },
    []
  );

  return {
    status,
    room,
    gameState,
    joinError,
    lastActionError,
    privateReveals,

    createRoom,
    joinRoom,
    startGame,
    sendAction,

    myPlayerId: getOrCreatePlayerId(),
  };
}