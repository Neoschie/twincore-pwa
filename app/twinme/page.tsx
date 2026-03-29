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
  latitude?: number | null;
  longitude?: number | null;
};

type CrewStatus = {
  id: string;
  name: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
};

type PositionPoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
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
   📍 MOVEMENT AWARENESS
--------------------------*/

function getDistanceBetweenPoints(a: PositionPoint, b: PositionPoint) {
  const dx = a.latitude - b.latitude;
  const dy = a.longitude - b.longitude;
  return Math.sqrt(dx * dx + dy * dy);
}

function getMovementInsight(history: PositionPoint[]) {
  if (history.length < 2) return "stable";

  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const first = history[0];

  const recentMove = getDistanceBetweenPoints(last, prev);
  const totalMove = getDistanceBetweenPoints(last, first);

  if (recentMove > 0.0007) return "moving";
  if (totalMove > 0.0025) return "drifting";
  return "stable";
}

/* -------------------------
   🧠 LIVE NUDGE
--------------------------*/

function getLiveNudge(
  live: PartyLive | null,
  minutes: number,
  crewLevel: string,
  movementLevel: string
) {
  if (!live?.active) {
    return "TwinMe is standing by. Turn Party Mode on when your night starts moving.";
  }

  if (crewLevel === "no_crew") {
    return "You have no crew connected. Stay extra aware of your environment.";
  }

  if (crewLevel === "alone" && movementLevel === "moving") {
    return "You are alone and moving. Slow down and keep your direction intentional.";
  }

  if (crewLevel === "alone") {
    return "You are currently alone. Increase your awareness and keep your movement intentional.";
  }

  if (movementLevel === "drifting") {
    return "You’re drifting across positions. Pause and re-orient before your next move.";
  }

  if (movementLevel === "moving" && (live.status === "Drinking" || live.status === "At club")) {
    return "You’re moving while in a high-energy state. Slow the pace down and stay with your people.";
  }

  if (movementLevel === "moving") {
    return "You’re actively moving. Keep your next stop intentional, not random.";
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
  crewLevel: string,
  movementLevel: string
) {
  if (!live?.active) return null;

  if (crewLevel === "alone" && movementLevel === "moving") {
    return "⚠️ You are moving alone in an active state. Reduce movement and reassess.";
  }

  if (movementLevel === "drifting" && (live.status === "Drinking" || live.status === "At club")) {
    return "⚠️ You are drifting in a high-energy state. Pause before your next move.";
  }

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

function buildReply(
  input: string,
  live: PartyLive | null,
  movementLevel: string
) {
  if (movementLevel === "drifting") {
    return `You’ve been drifting across positions.

• Pause before making your next move
• Re-orient to where you actually want to be
• Avoid letting the night move you more than you move the night

Stability matters more than momentum right now.`;
  }

  if (movementLevel === "moving" && live?.active) {
    return `You are moving right now.

• Keep your direction clear
• Slow your pace enough to stay aware
• Make sure your next move is chosen, not drifted into

Control matters more than motion.`;
  }

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
    { id: 1, role: "twin", text: "TwinMe is now crew-aware and movement-aware." },
  ]);

  const [input, setInput] = useState("");
  const [live, setLive] = useState<PartyLive | null>(null);
  const [crew, setCrew] = useState<CrewStatus[]>([]);
  const [minutes, setMinutes] = useState(0);
  const [positionHistory, setPositionHistory] = useState<PositionPoint[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const l = getLiveContext();
      const c = getCrewContext();

      setLive(l);
      setCrew(c);
      setMinutes(getMinutesActive(l));

      if (
        l?.active &&
        typeof l.latitude === "number" &&
        typeof l.longitude === "number" &&
        l.timestamp
      ) {
        setPositionHistory((prev) => {
          const nextPoint: PositionPoint = {
            latitude: l.latitude,
            longitude: l.longitude,
            timestamp: l.timestamp,
          };

          const last = prev[prev.length - 1];
          const isDuplicate =
            last &&
            last.latitude === nextPoint.latitude &&
            last.longitude === nextPoint.longitude &&
            last.timestamp === nextPoint.timestamp;

          if (isDuplicate) return prev;
          return [...prev.slice(-7), nextPoint];
        });
      }

      if (!l?.active) {
        setPositionHistory([]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const crewLevel = useMemo(() => getCrewInsight(crew), [crew]);
  const movementLevel = useMemo(
    () => getMovementInsight(positionHistory),
    [positionHistory]
  );

  const nudge = useMemo(
    () => getLiveNudge(live, minutes, crewLevel, movementLevel),
    [live, minutes, crewLevel, movementLevel]
  );

  const alert = useMemo(
    () => getAlert(live, minutes, crewLevel, movementLevel),
    [live, minutes, crewLevel, movementLevel]
  );

  function sendMessage() {
    if (!input.trim()) return;

    const user = { id: Date.now(), role: "user" as const, text: input };
    const twin = {
      id: Date.now() + 1,
      role: "twin" as const,
      text: buildReply(input, live, movementLevel),
    };

    setMessages((prev) => [...prev, user, twin]);
    setInput("");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#050510", color: "white", padding: 20 }}>
      <h1>TwinMe (Crew + Movement Aware)</h1>

      <div style={{ marginTop: 20, padding: 16, background: "#1e293b", borderRadius: 12 }}>
        <b>LIVE NUDGE</b>
        <div>{nudge}</div>
      </div>

      {alert && (
        <div style={{ marginTop: 10, padding: 12, background: "#7f1d1d", borderRadius: 10 }}>
          {alert}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: "#111827",
          borderRadius: 10,
        }}
      >
        <div><b>Crew:</b> {crewLevel}</div>
        <div><b>Movement:</b> {movementLevel}</div>
      </div>

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

      <Link href="/" style={{ display: "block", marginTop: 20 }}>
        Back
      </Link>
    </main>
  );
}