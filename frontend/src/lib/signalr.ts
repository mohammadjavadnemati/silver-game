"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";

const HUB_URL = "http://localhost:5000/hubs/game";

export type EchoMessage = {
  playerName: string;
  message: string;
  timestamp: string;
};

export function useGameHubConnection() {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [serverGreeting, setServerGreeting] = useState<string | null>(null);
  const [echoLog, setEchoLog] = useState<EchoMessage[]>([]);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.on("ServerMessage", (msg: string) => {
      setServerGreeting(msg);
    });

    connection.on("ReceiveEcho", (playerName: string, message: string, timestamp: string) => {
      setEchoLog((prev) => [...prev, { playerName, message, timestamp }]);
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

  const sendEcho = useCallback((playerName: string, message: string) => {
    connectionRef.current?.invoke("SendEcho", playerName, message).catch(console.error);
  }, []);

  return { status, serverGreeting, echoLog, sendEcho };
}