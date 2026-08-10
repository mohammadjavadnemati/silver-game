"use client";

import { useState } from "react";
import { useGameHubConnection } from "@/lib/signalr";

export default function Home() {
  const { status, serverGreeting, echoLog, sendEcho } = useGameHubConnection();
  const [playerName, setPlayerName] = useState("Player1");
  const [message, setMessage] = useState("");

  const statusColor =
    status === "connected" ? "bg-green-500" : status === "connecting" ? "bg-yellow-500" : "bg-red-500";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${statusColor}`} />
          <span className="text-sm text-slate-400">وضعیت اتصال: {status}</span>
        </div>

        {serverGreeting && (
          <div className="p-3 rounded-lg bg-slate-800 text-sm">{serverGreeting}</div>
        )}

        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-sm"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="نام بازیکن"
          />
          <input
            className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-sm"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="پیام تستی"
          />
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
            disabled={status !== "connected" || !message}
            onClick={() => {
              sendEcho(playerName, message);
              setMessage("");
            }}
          >
            ارسال
          </button>
        </div>

        <div className="space-y-2">
          {echoLog.map((e, i) => (
            <div key={i} className="text-sm p-2 rounded bg-slate-900">
              <span className="text-indigo-400 font-medium">{e.playerName}: </span>
              {e.message}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}