"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PageHeader,
  cardStyle,
  colors,
  gridTwoStyle,
  navGridThreeStyle,
  navButtonStyle,
  secondaryButtonStyle,
  shellStyle,
  sectionHeadingStyle,
} from "@/components/twincore-ui";

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
    <main style={shellStyle}>
      <PageHeader
        title="Party Mode"
        action={
          <Link href="/profile" style={navButtonStyle}>
            Profile
          </Link>
        }
      />

      <section style={cardStyle}>
        <h2 style={sectionHeadingStyle}>Tonight</h2>
        <p style={{ color: colors.soft, marginBottom: 8 }}>
          <strong>{displayName}</strong>
        </p>
        <p style={{ color: colors.muted, marginBottom: 0 }}>
          Current status: <span style={{ color: "white" }}>{status}</span>
        </p>
      </section>

      <section style={cardStyle}>
        <h2 style={{ ...sectionHeadingStyle, marginBottom: 14 }}>
          Set Your Status
        </h2>

        <div style={gridTwoStyle}>
          {partyStatuses.map((item) => (
            <button
              key={item}
              onClick={() => updateStatus(item)}
              style={{
                ...secondaryButtonStyle,
                border:
                  status === item
                    ? "1px solid white"
                    : "1px solid #27272A",
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ ...sectionHeadingStyle, marginBottom: 14 }}>
          Quick Actions
        </h2>

        <div style={gridTwoStyle}>
          <button onClick={sendCheckIn} style={secondaryButtonStyle}>
            Send Check-In
          </button>

          <button onClick={shareContactCard} style={secondaryButtonStyle}>
            Share Contact Card
          </button>
        </div>
      </section>

      {statusMessage && (
        <p style={{ marginTop: 14, color: colors.success }}>{statusMessage}</p>
      )}

      <div style={navGridThreeStyle}>
        <Link href="/" style={navButtonStyle}>
          Home
        </Link>
        <Link href="/crew" style={navButtonStyle}>
          Crew
        </Link>
        <Link href="/profile" style={navButtonStyle}>
          Profile
        </Link>
      </div>
    </main>
  );
}
