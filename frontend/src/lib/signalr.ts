"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import type { RoomInfo } from "./types";

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

export function useGameHubConnection() {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.on("RoomUpdated", (updatedRoom: RoomInfo) => {
      setRoom(updatedRoom);
    });

    connection.onreconnecting(() => setStatus("connecting"));
    connection.onreconnected(() => setStatus("connected"));
    connection.onclose(() => setStatus("disconnected"));

    setStatus("connecting");
    connection
      .start()
      .then(() => setStatus("connected"))
      .catch((err) => {
        console.error("SignalR connection failed:", err);
        setStatus("disconnected");
      });

    connectionRef.current = connection;

    return () => {
      connection.stop();
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

  return { status, room, joinError, createRoom, joinRoom };
}