"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Message = {
  id: number;
  role: "user" | "twin";
  text: string;
};

const STARTER_PROMPTS = [
  "What should I do tonight?",
  "Help me think this through",
  "Should I go out tonight?",
  "What fits my mood today?",
];

function buildTwinReply(input: string) {
  const text = input.toLowerCase();

  if (text.includes("tonight") || text.includes("go out") || text.includes("event")) {
    return `You sound like you're weighing your energy against what could be a good experience tonight.

Your strongest options could be:

• Choose a lighter social plan if you want connection without draining yourself
• Pick the event that matches your mood, not just the loudest option
• Stay in tonight and protect your energy if your body is asking for rest

Which option feels most aligned with how you want to feel by the end of the night?`;
  }

  if (text.includes("friend") || text.includes("crew")) {
    return `It sounds like this situation may need both clarity and care.

Your strongest options could be:

• Check in directly and keep the conversation simple
• Give the moment some space if emotions feel elevated
• Protect your peace while still being respectful

Which approach would best protect both the relationship and your own well-being?`;
  }

  if (text.includes("tired") || text.includes("overwhelmed") || text.includes("stress")) {
    return `You sound like you may need relief, not more pressure.

Your strongest options could be:

• Choose rest and remove unnecessary pressure from tonight
• Do something low-energy that still gives you a sense of connection
• Delay any major decisions until you feel more grounded

What would leave you feeling most restored tomorrow?`;
  }

  if (text.includes("relationship") || text.includes("ex") || text.includes("dating")) {
    return `This sounds like a moment where your emotions and your long-term peace may not want the same thing.

Your strongest options could be:

• Pause before responding and give yourself more room to think
• Re-engage only if your intentions are clear
• Protect your peace if this interaction risks reopening confusion

What outcome are you actually hoping for from this situation?`;
  }

  return `I hear that you're trying to think this through carefully.

Your strongest options could be:

• Choose the path that best protects your peace
• Go with the option that aligns most with your current goals and energy
• Slow the moment down before acting if the situation feels emotionally charged

Which option feels most in your best interest right now?`;
}

export default function TwinMePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "twin",
      text: "Talk it through with your twin. I’ll help you think through social events, personal situations, and everyday decisions with thoughtful suggestions — you decide.",
    },
  ]);
  const [input, setInput] = useState("");
  const [promptCount, setPromptCount] = useState(0);

  const freeLimit = 10;
  const remaining = useMemo(() => Math.max(0, freeLimit - promptCount), [promptCount]);

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
      text: buildTwinReply(finalText),
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
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        {/* Header */}
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
                Talk it through with your twin. TwinMe helps users think through
                social events, personal situations, and everyday life with
                suggestions in their best interest.
              </p>
            </div>

            <Link href="/" style={secondaryButton}>
              Back Home
            </Link>
          </div>
        </section>

        {/* Limit card */}
        <section style={limitCard}>
          <div>
            <div style={sectionLabel}>FREE TIER</div>
            <div
              style={{
                marginTop: 8,
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {remaining} prompts left today
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#d4d4d8",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Upgrade to TwinCore Premium for unlimited TwinMe conversations.
            </div>
          </div>

          <div
            style={{
              minWidth: 140,
            }}
          >
            <div
              style={{
                borderRadius: 18,
                padding: "14px 16px",
                background: "rgba(168,85,247,0.16)",
                border: "1px solid rgba(216,180,254,0.3)",
                textAlign: "center",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Premium $23.99
            </div>
          </div>
        </section>

        {/* Prompt chips */}
        <section style={{ ...card, marginTop: 16 }}>
          <div style={sectionLabel}>QUICK STARTERS</div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 14,
            }}
          >
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

        {/* Chat area */}
        <section
          style={{
            ...card,
            marginTop: 16,
            paddingBottom: 20,
          }}
        >
          <div style={sectionLabel}>CONVERSATION</div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 12,
            }}
          >
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
                      border: isUser
                        ? "none"
                        : "1px solid rgba(63,63,70,0.8)",
                      color: "white",
                      boxShadow: isUser
                        ? "0 0 20px rgba(168,85,247,0.22)"
                        : "none",
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

          {promptCount >= freeLimit && (
            <div
              style={{
                marginTop: 16,
                borderRadius: 18,
                padding: "16px 18px",
                background: "rgba(88,28,135,0.22)",
                border: "1px solid rgba(216,180,254,0.28)",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                You’ve reached today’s TwinMe limit.
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#e4e4e7",
                  lineHeight: 1.5,
                  fontSize: 14,
                }}
              >
                Upgrade to TwinCore Premium for unlimited guidance and deeper
                conversations.
              </div>
            </div>
          )}
        </section>

        {/* Input area */}
        <section
          style={{
            ...card,
            marginTop: 16,
          }}
        >
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
              placeholder="What should I do tonight? Help me think this through. What fits my mood today?"
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
                boxShadow:
                  !input.trim() || promptCount >= freeLimit
                    ? "none"
                    : "0 0 20px rgba(168,85,247,0.28)",
              }}
            >
              Send
            </button>
          </div>
        </section>
      </div>

      {/* Bottom nav */}
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