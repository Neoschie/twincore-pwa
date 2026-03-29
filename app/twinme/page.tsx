"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Message = {
  id: number;
  role: "user" | "twin";
  text: string;
};

type PartyLive = {
  active: boolean;
  status: string;
  mood: string;
  heartbeatBpm: number;
  ghostMode: boolean;
  trustedOnly: boolean;
  vibeLabel?: string;
  autoTracking?: boolean;
  timestamp?: string;
};

const STARTER_PROMPTS = [
  "What should I do tonight?",
  "Help me think this through",
  "Should I go out tonight?",
  "What fits my mood today?",
];

function getLiveContext(): PartyLive | null {
  try {
    const raw = localStorage.getItem("twincore_party_live");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* -------------------------
   🧠 TIME + SAFETY ENGINE
--------------------------*/

function getEscalationLevel(minutes: number) {
  if (minutes < 10) return 1;
  if (minutes < 25) return 2;
  if (minutes < 45) return 3;
  return 4;
}

function getLiveNudge(live: PartyLive | null, minutes: number) {
  if (!live?.active) {
    return "TwinMe is standing by. Turn Party Mode on when your night starts moving.";
  }

  const level = getEscalationLevel(minutes);

  if (live.status === "Drinking" || live.status === "At club") {
    if (level === 1)
      return "Energy is rising. Stay close to your people and stay intentional.";

    if (level === 2)
      return "You’ve been in a high-energy state for a while. Check your crew and your position.";

    if (level === 3)
      return "You are deep in a high-risk window. Slow down and start thinking about your exit.";

    return "You’ve been in this state too long. Prioritize your safety and start transitioning out.";
  }

  if (live.status === "Heading home") {
    return "You’re in exit mode. Keep your route simple and complete the night clean.";
  }

  if (live.status === "Safe") {
    return "You’re stable. Reset, hydrate, and close the night properly.";
  }

  return "Stay aware and keep your movement intentional.";
}

/* -------------------------
   ⚠️ SILENT ALERT SYSTEM
--------------------------*/

function getSilentAlert(live: PartyLive | null, minutes: number) {
  if (!live?.active) return null;

  if (
    (live.status === "Drinking" || live.status === "At club") &&
    live.heartbeatBpm > 100 &&
    minutes > 15
  ) {
    return "⚠️ Slow down. Your energy is outpacing your awareness.";
  }

  if (
    (live.status === "Drinking" || live.status === "At club") &&
    minutes > 40
  ) {
    return "⚠️ You’ve been active for a long time. Start thinking about your exit.";
  }

  return null;
}

/* -------------------------
   💬 REPLY ENGINE
--------------------------*/

function buildTwinReply(input: string, live: PartyLive | null) {
  const text = input.toLowerCase();

  if (live?.active) {
    if (live.status === "Drinking" || live.status === "At club") {
      return `You are currently in a high-energy environment (${live.status}).

Your awareness matters more than the vibe right now.

• Stay close to people you trust
• Slow your decisions
• Keep your exit plan ready

Stay in control of the moment.`;
    }

    if (live.status === "Heading home") {
      return `You are in transition mode.

• Stay focused
• Keep your route clean
• Confirm your arrival

Finish strong.`;
    }
  }

  return `You are deciding how to spend your energy tonight.

• Choose based on how you want to feel after
• Do not follow noise
• Rest is a valid move

What benefits you most tonight?`;
}

/* -------------------------
   🧩 COMPONENT
--------------------------*/

export default function TwinMePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "twin",
      text: "TwinMe is synced with your live state.",
    },
  ]);

  const [input, setInput] = useState("");
  const [liveState, setLiveState] = useState<PartyLive | null>(null);
  const [minutesActive, setMinutesActive] = useState(0);
  const pulseRef = useRef(false);

  /* -------------------------
     ⏱️ TRACK TIME ACTIVE
  --------------------------*/

  useEffect(() => {
    const interval = setInterval(() => {
      const live = getLiveContext();
      setLiveState(live);

      if (live?.active && live.timestamp) {
        const start = new Date(live.timestamp).getTime();
        const now = Date.now();
        const minutes = Math.floor((now - start) / 60000);
        setMinutesActive(minutes);
      } else {
        setMinutesActive(0);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const liveNudge = useMemo(
    () => getLiveNudge(liveState, minutesActive),
    [liveState, minutesActive]
  );

  const silentAlert = useMemo(
    () => getSilentAlert(liveState, minutesActive),
    [liveState, minutesActive]
  );

  /* -------------------------
     💬 SEND MESSAGE
  --------------------------*/

  function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: input,
    };

    const twinMessage: Message = {
      id: Date.now() + 1,
      role: "twin",
      text: buildTwinReply(input, liveState),
    };

    setMessages((prev) => [...prev, userMessage, twinMessage]);
    setInput("");
  }

  /* -------------------------
     ✨ UI
  --------------------------*/

  return (
    <main style={{ minHeight: "100vh", background: "#050510", color: "white", padding: 20 }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        <h1 style={{ fontSize: 32, fontWeight: 900 }}>TwinMe</h1>

        {/* 🔥 LIVE NUDGE */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 20,
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.3)",
            animation: "pulse 2.5s infinite",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.6 }}>LIVE NUDGE</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>
            {liveNudge}
          </div>
        </div>

        {/* ⚠️ ALERT */}
        {silentAlert && (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 16,
              background: "rgba(239,68,68,0.2)",
              border: "1px solid rgba(239,68,68,0.4)",
              fontWeight: 700,
            }}
          >
            {silentAlert}
          </div>
        )}

        {/* 💬 CHAT */}
        <div style={{ marginTop: 20 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 10 }}>
              <b>{m.role === "user" ? "You" : "TwinMe"}:</b> {m.text}
            </div>
          ))}
        </div>

        {/* INPUT */}
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ flex: 1, padding: 10 }}
          />
          <button onClick={sendMessage}>Send</button>
        </div>

        <Link href="/" style={{ display: "block", marginTop: 20 }}>
          Back Home
        </Link>
      </div>
    </main>
  );
}