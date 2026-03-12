"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CrewMember = {
  name: string;
  activity: string;
  updatedAt?: string;
};

type SavedProfile = {
  displayName?: string;
};

type SavedPartyStatus = {
  name?: string;
  status?: string;
  updatedAt?: string;
};

const PROFILE_STORAGE_KEY = "twincore_profile";
const PARTY_STATUS_STORAGE_KEY = "twincore_party_status";

function generateCrewCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TC-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getSignalColor(status: string) {
  const s = status.toLowerCase();

  if (s === "safe") return "#22C55E";
  if (s === "drinking") return "#F59E0B";
  if (s === "at club" || s === "outside" || s === "heading home") return "#3B82F6";
  if (s === "not active") return "#EF4444";
  return "#A855F7";
}

function formatTimeAgo(updatedAt?: string) {
  if (!updatedAt) return "No recent update";

  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes <= 0) return "Just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hr ago";
  return `${hours} hrs ago`;
}

export default function CrewPage() {
  const [displayName, setDisplayName] = useState("Neo");
  const [liveStatus, setLiveStatus] = useState("Not active");
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | undefined>();
  const [crewCode, setCrewCode] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [tick, setTick] = useState(0);

  const [crew, setCrew] = useState<CrewMember[]>([
    {
      name: "Marcus",
      activity: "Listening to music",
      updatedAt: new Date(Date.now() - 8 * 60000).toISOString(),
    },
    {
      name: "Angellette",
      activity: "Watching Netflix",
      updatedAt: new Date(Date.now() - 3 * 60000).toISOString(),
    },
    {
      name: "Jade",
      activity: "Heading out",
      updatedAt: new Date(Date.now() - 18 * 60000).toISOString(),
    },
  ]);

  useEffect(() => {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as SavedProfile;
      if (parsed.displayName) {
        setDisplayName(parsed.displayName);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const savedCrewCode = localStorage.getItem("twincore_crew_code");

    if (savedCrewCode) {
      setCrewCode(savedCrewCode);
    } else {
      const newCode = generateCrewCode();
      setCrewCode(newCode);
      localStorage.setItem("twincore_crew_code", newCode);
    }
  }, []);

  useEffect(() => {
    function loadPartyStatus() {
      const rawStatus = localStorage.getItem(PARTY_STATUS_STORAGE_KEY);

      if (!rawStatus) {
        setLiveStatus("Not active");
        setLiveUpdatedAt(undefined);
        return;
      }

      try {
        const parsed = JSON.parse(rawStatus) as SavedPartyStatus;
        const nextStatus = parsed.status || "Not active";
        const nextUpdatedAt = parsed.updatedAt;

        setLiveStatus(nextStatus);
        setLiveUpdatedAt(nextUpdatedAt);

        setCrew((prev) => {
          const others = prev.filter((m) => m.name !== displayName);
          return [
            {
              name: displayName,
              activity: nextStatus,
              updatedAt: nextUpdatedAt,
            },
            ...others,
          ];
        });
      } catch {}
    }

    loadPartyStatus();

    const interval = setInterval(() => {
      loadPartyStatus();
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [displayName]);

  const inviteLink = useMemo(() => {
    return `http://localhost:3000/join?code=${crewCode}`;
  }, [crewCode]);

  function handleInviteCrew() {
    setInviteOpen((prev) => !prev);
  }

  function regenerateCode() {
    const newCode = generateCrewCode();
    setCrewCode(newCode);
    localStorage.setItem("twincore_crew_code", newCode);
  }

  function handleJoinCrew() {
    if (!joinCode.trim()) {
      setStatusMessage("Enter a crew code first.");
      return;
    }

    setStatusMessage(
      `${displayName} joined crew with code ${joinCode.toUpperCase()}.`
    );
    setJoinCode("");
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setStatusMessage("Invite link copied.");
    } catch {
      setStatusMessage("Could not copy invite link.");
    }
  }

  const staleWarning =
    liveUpdatedAt &&
    Date.now() - new Date(liveUpdatedAt).getTime() > 45 * 60000;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0A0A0B",
        color: "white",
        padding: "24px 16px 120px",
        maxWidth: 680,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <p style={{ fontSize: 12, color: "#A1A1AA", marginBottom: 6 }}>
            TwinCore
          </p>

          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>
            Crew Radar
          </h1>
        </div>

        <Link href="/profile" style={navButton}>
          Profile
        </Link>
      </div>

      <section style={radarCard}>
        <p style={{ fontSize: 12, color: "#A1A1AA", marginBottom: 6 }}>
          Live Crew Signal
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: getSignalColor(liveStatus),
              boxShadow: `0 0 14px ${getSignalColor(liveStatus)}`,
              display: "inline-block",
            }}
          />
          <h2 style={{ margin: 0, fontSize: 24 }}>
            {displayName} — {liveStatus}
          </h2>
        </div>

        <p style={{ color: "#D4D4D8", marginTop: 10, marginBottom: 0 }}>
          Last update: {formatTimeAgo(liveUpdatedAt)}
        </p>

        {staleWarning && (
          <p style={{ color: "#F59E0B", marginTop: 10, marginBottom: 0 }}>
            Warning: no recent update in over 45 minutes.
          </p>
        )}
      </section>

      <section style={cardStyle}>
        <button onClick={handleInviteCrew} style={primaryButton}>
          {inviteOpen ? "Close Invite" : "Invite Crew"}
        </button>

        {inviteOpen && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 10 }}>
              <strong>Crew Code:</strong> {crewCode}
            </div>

            <div style={{ marginBottom: 10 }}>
              <strong>Invite Link:</strong>
              <div style={{ color: "#D4D4D8", wordBreak: "break-all" }}>
                {inviteLink}
              </div>
            </div>

            <button onClick={copyInviteLink} style={secondaryButton}>
              Copy Invite Link
            </button>

            <button
              onClick={regenerateCode}
              style={{ ...secondaryButton, marginLeft: 10 }}
            >
              New Code
            </button>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Join Crew</h3>

        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter crew code"
          style={inputStyle}
        />

        <button onClick={handleJoinCrew} style={primaryButton}>
          Join
        </button>

        {statusMessage && (
          <p style={{ marginTop: 12, color: "#86EFAC" }}>{statusMessage}</p>
        )}
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Crew Pulse</h3>

        <div style={{ display: "grid", gap: 12 }}>
          {crew.map((member, index) => (
            <div key={`${member.name}-${index}`} style={memberCard}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: getSignalColor(member.activity),
                      boxShadow: `0 0 12px ${getSignalColor(member.activity)}`,
                      display: "inline-block",
                    }}
                  />
                  <div style={{ fontWeight: 700 }}>{member.name}</div>
                </div>

                <div style={{ fontSize: 12, color: "#A1A1AA" }}>
                  {formatTimeAgo(member.updatedAt)}
                </div>
              </div>

              <div style={{ color: "#A1A1AA", marginTop: 8 }}>
                {member.activity}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginTop: 20,
        }}
      >
        <Link href="/" style={navButton}>
          Home
        </Link>

        <Link href="/party" style={navButton}>
          Party
        </Link>

        <Link href="/contact-card" style={navButton}>
          Contact Card
        </Link>
      </div>
    </main>
  );
}

const radarCard: React.CSSProperties = {
  background: "linear-gradient(180deg,#16161A,#0E0E10)",
  border: "1px solid #232326",
  borderRadius: 24,
  padding: 20,
  marginBottom: 18,
};

const cardStyle: React.CSSProperties = {
  background: "#111113",
  border: "1px solid #232326",
  borderRadius: 20,
  padding: 18,
  marginBottom: 18,
};

const memberCard: React.CSSProperties = {
  background: "#18181B",
  border: "1px solid #27272A",
  borderRadius: 14,
  padding: 14,
};

const navButton: React.CSSProperties = {
  textDecoration: "none",
  color: "white",
  background: "#18181B",
  border: "1px solid #27272A",
  borderRadius: 12,
  padding: "10px 14px",
  textAlign: "center",
};

const primaryButton: React.CSSProperties = {
  background: "white",
  color: "black",
  border: "none",
  borderRadius: 14,
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  background: "#18181B",
  color: "white",
  border: "1px solid #27272A",
  borderRadius: 14,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#18181B",
  color: "white",
  border: "1px solid #27272A",
  borderRadius: 14,
  padding: "12px",
  marginTop: 10,
  marginBottom: 10,
};