"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PROFILE_STORAGE_KEY = "twincore_profile";
const PARTY_STATUS_STORAGE_KEY = "twincore_party_status";

type SavedProfile = {
  displayName?: string;
};

type SavedPartyStatus = {
  name: string;
  status: string;
  updatedAt: string;
};

const partyStatuses = [
  "Outside",
  "Drinking",
  "At club",
  "Listening to music",
  "Watching Netflix",
  "Heading home",
  "Safe",
];

export default function PartyPage() {
  const [displayName, setDisplayName] = useState("Neo");
  const [status, setStatus] = useState("Not active");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (rawProfile) {
      try {
        const parsed = JSON.parse(rawProfile) as SavedProfile;
        if (parsed.displayName) {
          setDisplayName(parsed.displayName);
        }
      } catch {}
    }

    const rawStatus = localStorage.getItem(PARTY_STATUS_STORAGE_KEY);

    if (rawStatus) {
      try {
        const parsed = JSON.parse(rawStatus) as SavedPartyStatus;
        if (parsed.status) {
          setStatus(parsed.status);
        }
      } catch {}
    }
  }, []);

  function updateStatus(nextStatus: string) {
    setStatus(nextStatus);

    const payload: SavedPartyStatus = {
      name: displayName,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(PARTY_STATUS_STORAGE_KEY, JSON.stringify(payload));
    setStatusMessage(`${displayName} is now ${nextStatus}.`);
  }

  function sendCheckIn() {
    setStatusMessage("Check-in sent to your crew.");
    alert("Check-in sent to your crew.");
  }

  function shareContactCard() {
    setStatusMessage("Contact Card ready to share.");
    alert("Contact Card ready to share.");
  }

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
          gap: 12,
        }}
      >
        <div>
          <p style={{ fontSize: 12, color: "#A1A1AA", marginBottom: 6 }}>
            TwinCore
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>
            Party Mode
          </h1>
        </div>

        <Link href="/profile" style={navButton}>
          Profile
        </Link>
      </div>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Tonight</h2>
        <p style={{ color: "#D4D4D8", marginBottom: 8 }}>
          <strong>{displayName}</strong>
        </p>
        <p style={{ color: "#A1A1AA", marginBottom: 0 }}>
          Current status: <span style={{ color: "white" }}>{status}</span>
        </p>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 14 }}>Set Your Status</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {partyStatuses.map((item) => (
            <button
              key={item}
              onClick={() => updateStatus(item)}
              style={{
                ...statusButton,
                border:
                  status === item ? "1px solid white" : "1px solid #27272A",
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 14 }}>Quick Actions</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <button onClick={sendCheckIn} style={actionButton}>
            Send Check-In
          </button>

          <button onClick={shareContactCard} style={actionButton}>
            Share Contact Card
          </button>
        </div>
      </section>

      {statusMessage && (
        <p style={{ marginTop: 14, color: "#86EFAC" }}>{statusMessage}</p>
      )}

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
        <Link href="/crew" style={navButton}>
          Crew
        </Link>
        <Link href="/profile" style={navButton}>
          Profile
        </Link>
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#111113",
  border: "1px solid #232326",
  borderRadius: 20,
  padding: 18,
  marginBottom: 18,
};

const navButton: React.CSSProperties = {
  textDecoration: "none",
  color: "white",
  background: "#18181B",
  border: "1px solid #27272A",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 14,
  textAlign: "center",
};

const actionButton: React.CSSProperties = {
  background: "#18181B",
  color: "white",
  border: "1px solid #27272A",
  borderRadius: 14,
  padding: "14px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const statusButton: React.CSSProperties = {
  background: "#18181B",
  color: "white",
  borderRadius: 14,
  padding: "14px 16px",
  fontWeight: 700,
  cursor: "pointer",
};