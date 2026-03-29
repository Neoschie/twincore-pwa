"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* -------------------------
   TYPES
--------------------------*/

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
  timestamp?: string;
};

type CrewStatus = {
  id: string;
  name: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
};

/* -------------------------
   DATA LOADERS
--------------------------*/

function getLiveContext(): PartyLive | null {
  try {
    const raw = localStorage.getItem("twincore_party_live");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getCrewContext(): CrewStatus[] {
  try {
    const raw = localStorage.getItem("twincore_crew_snapshot");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/* -------------------------
   🧠 TIME ENGINE
--------------------------*/

function getMinutesActive(live: PartyLive | null) {
  if (!live?.timestamp) return 0;
  return Math.floor((Date.now() - new Date(live.timestamp).getTime()) / 60000);
}

/* -------------------------
   👥 CREW AWARENESS
--------------------------*/

function getCrewInsight(crew: CrewStatus[]) {
  if (!crew.length) return "no_crew";

  const activeCrew = crew.filter((c) => c.status !== "Safe");

  if (activeCrew.length === 0) return "alone";
  if (activeCrew.length === 1) return "low";
  return "group";
}

/* -------------------------
   🧠 LIVE NUDGE
--------------------------*/

function getLiveNudge(
  live: PartyLive | null,
  minutes: number,
  crewLevel: string
) {
  if (!live?.active) {
    return "TwinMe is standing by. Turn Party Mode on when your night starts moving.";
  }

  if (crewLevel === "no_crew") {
    return "You have no crew connected. Stay extra aware of your environment.";
  }

  if (crewLevel === "alone") {
    return "You are currently alone. Increase your awareness and keep your movement intentional.";
  }

  if (live.status === "Drinking" || live.status === "At club") {
    if (minutes < 10) {
      return "Energy is rising. Stay close to your people.";
    }
    if (minutes < 25) {
      return "You’ve been active for a while. Check your crew position.";
    }
    if (minutes < 45) {
      return "High-risk window. Stay with your group and slow decisions.";
    }
    return "You’ve been out too long. Start thinking about your exit.";
  }

  if (live.status === "Heading home") {
    return "You’re heading home. Stay focused until you're fully safe.";
  }

  return "Stay aware and move intentionally.";
}

/* -------------------------
   ⚠️ ALERTS
--------------------------*/

function getAlert(
  live: PartyLive | null,
  minutes: number,
  crewLevel: string
) {
  if (!live?.active) return null;

  if (crewLevel === "alone" && minutes > 15) {
    return "⚠️ You are alone in an active state. Reconnect with your crew.";
  }

  if (
    (live.status === "Drinking" || live.status === "At club") &&
    minutes > 40
  ) {
    return "⚠️ Prolonged high-energy state. Start transitioning out.";
  }

  return null;
}

/* -------------------------
   💬 REPLY
--------------------------*/

function buildReply(input: string, live: PartyLive | null) {
  if (live?.active && (live.status === "Drinking" || live.status === "At club")) {
    return `You are in a high-energy environment.

• Stay close to your crew
• Slow your decisions
• Keep control of your movement

Stay intentional.`;
  }

  return `Think about what benefits you most right now.

• Choose alignment over noise
• Protect your energy

What feels right?`;
}

/* -------------------------
   COMPONENT
--------------------------*/

export default function TwinMePage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "twin", text: "TwinMe is now crew-aware." },
  ]);

  const [input, setInput] = useState("");
  const [live, setLive] = useState<PartyLive | null>(null);
  const [crew, setCrew] = useState<CrewStatus[]>([]);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const l = getLiveContext();
      const c = getCrewContext();

      setLive(l);
      setCrew(c);
      setMinutes(getMinutesActive(l));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const crewLevel = useMemo(() => getCrewInsight(crew), [crew]);
  const nudge = useMemo(() => getLiveNudge(live, minutes, crewLevel), [live, minutes, crewLevel]);
  const alert = useMemo(() => getAlert(live, minutes, crewLevel), [live, minutes, crewLevel]);

  function sendMessage() {
    if (!input.trim()) return;

    const user = { id: Date.now(), role: "user" as const, text: input };
    const twin = { id: Date.now() + 1, role: "twin" as const, text: buildReply(input, live) };

    setMessages((prev) => [...prev, user, twin]);
    setInput("");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#050510", color: "white", padding: 20 }}>
      <h1>TwinMe (Crew Aware)</h1>

      <div style={{ marginTop: 20, padding: 16, background: "#1e293b", borderRadius: 12 }}>
        <b>LIVE NUDGE</b>
        <div>{nudge}</div>
      </div>

      {alert && (
        <div style={{ marginTop: 10, padding: 12, background: "#7f1d1d", borderRadius: 10 }}>
          {alert}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {messages.map((m) => (
          <div key={m.id}>
            <b>{m.role}:</b> {m.text}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button onClick={sendMessage}>Send</button>
      </div>

      <Link href="/">Back</Link>
    </main>
  );
}
