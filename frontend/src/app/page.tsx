"use client";

import { useState } from "react";
import { useGameHubConnection } from "@/lib/signalr";

export default function Home() {
  const { status, room, joinError, createRoom, joinRoom } = useGameHubConnection();
  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");

  const statusColor =
    status === "connected" ? "bg-green-500" : status === "connecting" ? "bg-yellow-500" : "bg-red-500";

  if (room) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${statusColor}`} />
            <span className="text-sm text-slate-400">وضعیت اتصال: {status}</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-800">
            <div className="text-sm text-slate-400">کد اتاق</div>
            <div className="text-3xl font-bold tracking-widest text-indigo-400">{room.roomCode}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-slate-400">بازیکنان ({room.players.length}/4)</div>
            {room.players.map((p) => (
              <div key={p.playerId} className="flex items-center gap-2 p-2 rounded bg-slate-900">
                <span className={`w-2 h-2 rounded-full ${p.isConnected ? "bg-green-500" : "bg-slate-600"}`} />
                <span>{p.name}</span>
                {p.isHost && <span className="text-xs text-amber-400">(میزبان)</span>}
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-sm mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${statusColor}`} />
          <span className="text-sm text-slate-400">وضعیت اتصال: {status}</span>
        </div>

        <input
          className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="نام تو"
        />

        <button
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={status !== "connected" || !playerName}
          onClick={() => createRoom(playerName)}
        >
          ساخت اتاق جدید
        </button>

        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <div className="flex-1 h-px bg-slate-800" />
          یا
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <input
          className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm uppercase tracking-widest"
          value={roomCodeInput}
          onChange={(e) => setRoomCodeInput(e.target.value)}
          placeholder="کد اتاق"
          maxLength={5}
        />
        <button
          className="w-full rounded-md bg-slate-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={status !== "connected" || !playerName || !roomCodeInput}
          onClick={() => joinRoom(roomCodeInput, playerName)}
        >
          پیوستن به اتاق
        </button>

        {joinError && <div className="text-sm text-red-400">{joinError}</div>}
      </div>
    </main>
  );
}