"use client";

import { useEffect, useMemo, useState } from "react";
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

function getLiveNudge(live: PartyLive | null) {
  if (!live?.active) {
    return "TwinMe is standing by. Turn Party Mode on when your night starts moving.";
  }

  if (live.status === "Drinking" || live.status === "At club") {
    return "Energy is high right now. Stay close to trusted people and keep your next move slower than the room.";
  }

  if (live.status === "Heading home") {
    return "You’re in exit mode. Keep the route clean and finish the night simply.";
  }

  if (live.status === "Safe") {
    return "You’re stable. This is a good moment to check in, recover, and close the night properly.";
  }

  if (live.status === "Listening to music") {
    return "The vibe is smooth, but stay more aware than the moment feels.";
  }

  if (live.status === "Watching Netflix") {
    return "You’re in a low-pressure zone. Keep things easy and restorative.";
  }

  return "Your live state is active. Keep your movement intentional and your awareness current.";
}

function buildTwinReply(input: string, live: PartyLive | null) {
  const text = input.toLowerCase();

  if (live?.active) {
    if (live.status === "Drinking" || live.status === "At club") {
      if (text.includes("tonight") || text.includes("go out")) {
        return `You are currently in a high-energy environment (${live.status}).

Your awareness matters more than the vibe right now.

• Stay close to people you trust
• Slow your decisions, especially around movement and new people
• Keep track of your exit plan before you need it

Right now matters more than the plan. Stay in control of the moment.`;
      }

      return `You are live in ${live.status}, and your energy is already elevated.

• Keep your decisions slower than your emotions
• Stay visible to people you trust
• Avoid drifting into situations you did not choose clearly

What would help you stay most in control over the next hour?`;
    }

    if (live.status === "Heading home") {
      return `You are in transition mode (${live.status}).

This is where risk usually drops if you stay focused.

• Stick to your route
• Keep your phone accessible
• Confirm your arrival once you are in

Finish the night clean.`;
    }

    if (live.status === "Safe") {
      return `You are in a stable state right now.

This is the best time to reset.

• Check in with your crew
• Hydrate and recover
• Lock in anything you need for tomorrow

You handled the night. Close it properly.`;
    }

    if (live.status === "Listening to music") {
      return `You are in a lighter live state right now (${live.status}).

• Enjoy the moment without drifting too far from awareness
• Keep your next move intentional
• Stay aligned with how you want the night to end

What would keep tonight feeling good without becoming messy?`;
    }
  }

  if (text.includes("tonight") || text.includes("go out")) {
    return `You are deciding how to spend your energy tonight.

• Choose based on how you want to feel after
• Do not follow noise, follow alignment
• Rest is also a strong decision

What version of tonight actually benefits you?`;
  }

  if (text.includes("friend") || text.includes("crew")) {
    return `This situation may need both clarity and care.

• Keep communication simple
• Do not react too quickly
• Protect your peace while staying respectful

What outcome do you actually want here?`;
  }

  if (text.includes("tired") || text.includes("stress")) {
    return `You do not need more pressure right now.

• Choose rest or low-energy connection
• Delay big decisions
• Reduce noise around you

What would help you feel better tomorrow?`;
  }

  return `I hear you thinking this through.

• Choose what protects your peace
• Align with your current energy
• Slow down if things feel emotional

What feels right for you right now?`;
}

export default function TwinMePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "twin",
      text: "LIVE TWINME IS ACTIVE. I’m synced with your live state and can respond based on where you are and how you're moving.",
    },
  ]);
  const [input, setInput] = useState("");
  const [promptCount, setPromptCount] = useState(0);
  const [liveState, setLiveState] = useState<PartyLive | null>(null);

  const freeLimit = 10;
  const remaining = useMemo(() => Math.max(0, freeLimit - promptCount), [promptCount]);

  const liveNudge = useMemo(() => getLiveNudge(liveState), [liveState]);

  useEffect(() => {
    const load = () => {
      setLiveState(getLiveContext());
    };

    load();
    const interval = window.setInterval(load, 3000);
    return () => window.clearInterval(interval);
  }, []);

  function sendMessage(customText?: string) {
    const finalText = (customText ?? input).trim();
    if (!finalText) return;
    if (promptCount >= freeLimit) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: finalText,
    };

    const twinMessage: Message = {
      id: Date.now() + 1,
      role: "twin",
      text: buildTwinReply(finalText, liveState),
    };

    setMessages((prev) => [...prev, userMessage, twinMessage]);
    setPromptCount((prev) => prev + 1);
    setInput("");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(168,85,247,0.18), transparent 24%), #050510",
        color: "white",
        padding: "20px 16px 110px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <section style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: "#a1a1aa",
                  marginBottom: 8,
                }}
              >
                TwinCore
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 34,
                  lineHeight: 1.05,
                  fontWeight: 900,
                  textShadow: "0 0 16px rgba(192,132,252,0.35)",
                }}
              >
                TwinMe
              </h1>

              <p
                style={{
                  marginTop: 10,
                  color: "#d4d4d8",
                  fontSize: 15,
                  lineHeight: 1.5,
                  maxWidth: 620,
                }}
              >
                Live-aware TwinMe is connected to Party Mode.
              </p>
            </div>

            <Link href="/" style={secondaryButton}>
              Back Home
            </Link>
          </div>
        </section>

        <section style={liveNudgeCard}>
          <div style={sectionLabel}>LIVE NUDGE</div>
          <div
            style={{
              marginTop: 10,
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.5,
            }}
          >
            {liveNudge}
          </div>
        </section>

        {liveState?.active && (
          <section style={liveCard}>
            <div style={sectionLabel}>LIVE STATE</div>
            <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800 }}>
              {liveState.status} • {liveState.mood} • {liveState.heartbeatBpm} BPM
            </div>
            <div style={{ marginTop: 8, color: "#d4d4d8", fontSize: 14 }}>
              Ghost: {liveState.ghostMode ? "On" : "Off"} • Trusted only:{" "}
              {liveState.trustedOnly ? "On" : "Off"}
            </div>
          </section>
        )}

        <section style={limitCard}>
          <div>
            <div style={sectionLabel}>FREE TIER</div>
            <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>
              {remaining} prompts left today
            </div>
          </div>
        </section>

        <section style={{ ...card, marginTop: 16 }}>
          <div style={sectionLabel}>QUICK STARTERS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={promptCount >= freeLimit}
                style={{
                  ...chipButton,
                  opacity: promptCount >= freeLimit ? 0.55 : 1,
                  cursor: promptCount >= freeLimit ? "not-allowed" : "pointer",
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section style={{ ...card, marginTop: 16, paddingBottom: 20 }}>
          <div style={sectionLabel}>CONVERSATION</div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "82%",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                      fontSize: 15,
                      borderRadius: 20,
                      padding: "14px 16px",
                      background: isUser
                        ? "linear-gradient(90deg, #a855f7, #3b82f6)"
                        : "rgba(17,24,39,0.95)",
                      border: isUser ? "none" : "1px solid rgba(63,63,70,0.8)",
                      color: "white",
                    }}
                  >
                    {!isUser && (
                      <div
                        style={{
                          fontSize: 11,
                          letterSpacing: 1.2,
                          textTransform: "uppercase",
                          color: "#d8b4fe",
                          fontWeight: 800,
                          marginBottom: 8,
                        }}
                      >
                        TwinMe
                      </div>
                    )}
                    {message.text}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ ...card, marginTop: 16 }}>
          <div style={sectionLabel}>ASK TWINME ANYTHING</div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What should I do tonight?"
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                borderRadius: 18,
                border: "1px solid rgba(63,63,70,0.85)",
                background: "#0b1020",
                color: "white",
                padding: "14px 16px",
                fontSize: 15,
                lineHeight: 1.5,
                outline: "none",
              }}
            />

            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || promptCount >= freeLimit}
              style={{
                alignSelf: "end",
                border: "none",
                borderRadius: 18,
                padding: "14px 18px",
                background:
                  !input.trim() || promptCount >= freeLimit
                    ? "#3f3f46"
                    : "linear-gradient(90deg, #a855f7, #3b82f6)",
                color: "white",
                fontWeight: 900,
                fontSize: 15,
                cursor:
                  !input.trim() || promptCount >= freeLimit
                    ? "not-allowed"
                    : "pointer",
                minWidth: 120,
              }}
            >
              Send
            </button>
          </div>
        </section>
      </div>

      <nav
        style={{
          position: "fixed",
          left: 12,
          right: 12,
          bottom: 12,
          maxWidth: 760,
          margin: "0 auto",
          background: "rgba(10,10,20,0.94)",
          border: "1px solid rgba(63,63,70,0.85)",
          borderRadius: 22,
          padding: 10,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
          backdropFilter: "blur(12px)",
        }}
      >
        <Link href="/" style={navItem}>
          Home
        </Link>
        <Link href="/party" style={navItem}>
          Party
        </Link>
        <Link href="/twinme" style={navItemActive}>
          TwinMe
        </Link>
        <Link href="/crew" style={navItem}>
          Crew
        </Link>
        <Link href="/profile" style={navItem}>
          Profile
        </Link>
      </nav>
    </main>
  );
}

const card: React.CSSProperties = {
  border: "1px solid rgba(63,63,70,0.78)",
  background: "rgba(10,10,20,0.88)",
  borderRadius: 24,
  padding: 18,
};

const liveCard: React.CSSProperties = {
  border: "1px solid rgba(168,85,247,0.3)",
  background: "linear-gradient(135deg, rgba(88,28,135,0.28), rgba(17,24,39,0.86))",
  borderRadius: 24,
  padding: 18,
  marginTop: 16,
};

const liveNudgeCard: React.CSSProperties = {
  border: "1px solid rgba(59,130,246,0.26)",
  background: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(88,28,135,0.18))",
  borderRadius: 24,
  padding: 18,
  marginTop: 16,
  boxShadow: "0 0 24px rgba(59,130,246,0.10)",
};

const limitCard: React.CSSProperties = {
  border: "1px solid rgba(168,85,247,0.3)",
  background: "linear-gradient(135deg, rgba(88,28,135,0.28), rgba(17,24,39,0.86))",
  borderRadius: 24,
  padding: 18,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
  boxShadow: "0 0 26px rgba(168,85,247,0.14)",
  marginTop: 16,
};

const sectionLabel: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 1.2,
  textTransform: "uppercase",
};

const secondaryButton: React.CSSProperties = {
  textDecoration: "none",
  textAlign: "center",
  background: "#111827",
  color: "white",
  border: "1px solid rgba(63,63,70,0.85)",
  borderRadius: 18,
  padding: "14px 16px",
  fontWeight: 800,
};

const chipButton: React.CSSProperties = {
  border: "1px solid rgba(216,180,254,0.28)",
  background: "rgba(168,85,247,0.14)",
  color: "white",
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 700,
  fontSize: 14,
};

const navItem: React.CSSProperties = {
  textDecoration: "none",
  textAlign: "center",
  padding: "12px 8px",
  borderRadius: 14,
  color: "#d4d4d8",
  fontWeight: 700,
  fontSize: 14,
};

const navItemActive: React.CSSProperties = {
  ...navItem,
  background: "rgba(168,85,247,0.16)",
  color: "white",
  border: "1px solid rgba(216,180,254,0.28)",
};