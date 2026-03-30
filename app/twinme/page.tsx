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

type SpotsSnapshot = {
  visibleCount?: number;
  nearbyCount?: number;
  hotspotCount?: number;
  riskCount?: number;
  safeCount?: number;
  trustedVisibleCount?: number;
  selectedTone?: "lit" | "safe" | "risk" | "chill" | null;
  selectedName?: string | null;
  radarEnergy?: "risk" | "lit" | "safe" | "calm" | null;
  timestamp?: string;
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

function getSpotsContext(): SpotsSnapshot | null {
  try {
    const raw = localStorage.getItem("twincore_spots_snapshot");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* -------------------------
   TIME ENGINE
--------------------------*/

function getMinutesActive(live: PartyLive | null) {
  if (!live?.timestamp) return 0;
  return Math.floor((Date.now() - new Date(live.timestamp).getTime()) / 60000);
}

/* -------------------------
   CREW AWARENESS
--------------------------*/

function getCrewInsight(crew: CrewStatus[]) {
  if (!crew.length) return "no_crew";

  const activeCrew = crew.filter((c) => c.status !== "Safe");

  if (activeCrew.length === 0) return "alone";
  if (activeCrew.length === 1) return "low";
  return "group";
}

/* -------------------------
   MOVEMENT AWARENESS
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
   ENVIRONMENT AWARENESS
--------------------------*/

function getEnvironmentInsight(spots: SpotsSnapshot | null) {
  if (!spots) return "unknown";

  if ((spots.riskCount || 0) > 0 && (spots.safeCount || 0) === 0) {
    return "unsafe";
  }

  if ((spots.safeCount || 0) > 0 && (spots.nearbyCount || 0) > 0) {
    return "supported";
  }

  if ((spots.hotspotCount || 0) > 0 && (spots.riskCount || 0) > 0) {
    return "volatile";
  }

  if ((spots.nearbyCount || 0) === 0) {
    return "thin";
  }

  return "balanced";
}

/* -------------------------
   LIVE NUDGE
--------------------------*/

function getLiveNudge(
  live: PartyLive | null,
  minutes: number,
  crewLevel: string,
  movementLevel: string,
  environmentLevel: string,
  spots: SpotsSnapshot | null
) {
  if (!live?.active) {
    return "TwinMe is standing by. Turn Party Mode on when your night starts moving.";
  }

  if (environmentLevel === "unsafe") {
    return "You do not have a strong safe-zone layer nearby right now. Reduce drift and move more deliberately.";
  }

  if (environmentLevel === "volatile") {
    return "This environment is unstable. Hotspots and risk are mixing, so your next move needs to be intentional.";
  }

  if (environmentLevel === "thin") {
    return "Your environment looks thin right now. There are not many nearby signals or support points.";
  }

  if (environmentLevel === "supported" && movementLevel === "stable") {
    return "You have some support nearby. This is a better moment to stay grounded and avoid unnecessary movement.";
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

  if (
    movementLevel === "moving" &&
    (live.status === "Drinking" || live.status === "At club")
  ) {
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

  if (spots?.selectedTone === "safe") {
    return "Your current environment looks more stable. Keep it simple and do not trade a safe zone for noise.";
  }

  return "Stay aware and move intentionally.";
}

/* -------------------------
   ALERTS
--------------------------*/

function getAlert(
  live: PartyLive | null,
  minutes: number,
  crewLevel: string,
  movementLevel: string,
  environmentLevel: string,
  spots: SpotsSnapshot | null
) {
  if (!live?.active) return null;

  if (
    environmentLevel === "unsafe" &&
    (live.status === "Drinking" || live.status === "At club")
  ) {
    return "⚠️ High-energy state with weak environment support. Prioritize a safer zone now.";
  }

  if (environmentLevel === "volatile" && movementLevel === "drifting") {
    return "⚠️ You are drifting inside an unstable environment. Pause before your next move.";
  }

  if (crewLevel === "alone" && movementLevel === "moving") {
    return "⚠️ You are moving alone in an active state. Reduce movement and reassess.";
  }

  if (
    movementLevel === "drifting" &&
    (live.status === "Drinking" || live.status === "At club")
  ) {
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

  if ((spots?.safeCount || 0) === 0 && (spots?.riskCount || 0) > 0) {
    return "⚠️ No nearby safe-zone signal is visible while risk is present.";
  }

  return null;
}

/* -------------------------
   REPLY
--------------------------*/

function buildReply(
  input: string,
  live: PartyLive | null,
  movementLevel: string,
  environmentLevel: string,
  spots: SpotsSnapshot | null
) {
  const text = input.toLowerCase();

  if (environmentLevel === "unsafe") {
    return `Your environment does not look supportive right now.

• Prioritize safer ground over momentum
• Do not drift deeper into weak-support areas
• Make your next move about stability, not excitement

Safer options matter more than vibe right now.`;
  }

  if (environmentLevel === "volatile") {
    return `This area looks unstable.

• Hotspots and risk are mixing
• Slow down before changing locations
• Pick the safer option even if it feels less exciting

You do not need more stimulation right now — you need control.`;
  }

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

  if (
    spots?.selectedTone === "safe" &&
    (text.includes("go") || text.includes("move") || text.includes("where"))
  ) {
    return `Your environment looks more stable right now.

• Stay near the safer layer if possible
• Do not trade safety for extra noise
• Use the stable zone to reset your decisions

The best move is usually the cleaner one.`;
  }

  if (text.includes("tonight") || text.includes("go out")) {
    return `You are deciding how to spend your energy tonight.

• Choose based on how you want to feel after
• Do not follow noise
• Rest is a valid move

What benefits you most tonight?`;
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
    {
      id: 1,
      role: "twin",
      text: "TwinMe is now crew-aware, movement-aware, and environment-aware.",
    },
  ]);

  const [input, setInput] = useState("");
  const [live, setLive] = useState<PartyLive | null>(null);
  const [crew, setCrew] = useState<CrewStatus[]>([]);
  const [spots, setSpots] = useState<SpotsSnapshot | null>(null);
  const [minutes, setMinutes] = useState(0);
  const [positionHistory, setPositionHistory] = useState<PositionPoint[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const l = getLiveContext();
      const c = getCrewContext();
      const s = getSpotsContext();

      setLive(l);
      setCrew(c);
      setSpots(s);
      setMinutes(getMinutesActive(l));

      if (
        l?.active &&
        typeof l.latitude === "number" &&
        typeof l.longitude === "number" &&
        typeof l.timestamp === "string"
      ) {
        const safeLatitude = l.latitude;
        const safeLongitude = l.longitude;
        const safeTimestamp = l.timestamp;

        setPositionHistory((prev) => {
          const nextPoint: PositionPoint = {
            latitude: safeLatitude,
            longitude: safeLongitude,
            timestamp: safeTimestamp,
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
  const environmentLevel = useMemo(
    () => getEnvironmentInsight(spots),
    [spots]
  );

  const nudge = useMemo(
    () =>
      getLiveNudge(
        live,
        minutes,
        crewLevel,
        movementLevel,
        environmentLevel,
        spots
      ),
    [live, minutes, crewLevel, movementLevel, environmentLevel, spots]
  );

  const alert = useMemo(
    () =>
      getAlert(
        live,
        minutes,
        crewLevel,
        movementLevel,
        environmentLevel,
        spots
      ),
    [live, minutes, crewLevel, movementLevel, environmentLevel, spots]
  );

  function sendMessage() {
    if (!input.trim()) return;

    const user = { id: Date.now(), role: "user" as const, text: input };
    const twin = {
      id: Date.now() + 1,
      role: "twin" as const,
      text: buildReply(input, live, movementLevel, environmentLevel, spots),
    };

    setMessages((prev) => [...prev, user, twin]);
    setInput("");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050510",
        color: "white",
        padding: 20,
      }}
    >
      <h1>TwinMe (Crew + Movement + Environment Aware)</h1>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          background: "#1e293b",
          borderRadius: 12,
        }}
      >
        <b>LIVE NUDGE</b>
        <div>{nudge}</div>
      </div>

      {alert && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            background: "#7f1d1d",
            borderRadius: 10,
          }}
        >
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
        <div>
          <b>Crew:</b> {crewLevel}
        </div>
        <div>
          <b>Movement:</b> {movementLevel}
        </div>
        <div>
          <b>Environment:</b> {environmentLevel}
        </div>
        <div>
          <b>Selected Spot:</b> {spots?.selectedName || "none"}
        </div>
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