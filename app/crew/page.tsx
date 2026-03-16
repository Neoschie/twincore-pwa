"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  cardStyle,
  colors,
  heroCardStyle,
  inputStyle,
  navButtonStyle,
  navGridThreeStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  shellStyle,
  sectionHeadingStyle,
} from "@/components/twincore-ui";

type CrewMember = {
  name: string;
  activity: string;
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

export default function CrewPage() {
  const [displayName, setDisplayName] = useState("Neo");
  const [liveStatus, setLiveStatus] = useState("Not active");
  const [crewCode, setCrewCode] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [crew, setCrew] = useState<CrewMember[]>([
    { name: "Marcus", activity: "Listening to music" },
    { name: "Angellette", activity: "Watching Netflix" },
    { name: "Jade", activity: "Heading out" },
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
        return;
      }

      try {
        const parsed = JSON.parse(rawStatus) as SavedPartyStatus;
        const nextStatus = parsed.status || "Not active";
        setLiveStatus(nextStatus);

        setCrew((prev) => {
          const others = prev.filter((m) => m.name !== displayName);
          return [{ name: displayName, activity: nextStatus }, ...others];
        });
      } catch {}
    }

    loadPartyStatus();
    const interval = setInterval(loadPartyStatus, 1000);
    return () => clearInterval(interval);
  }, [displayName]);

  const inviteLink = useMemo(() => {
    return `https://twincore.co/join?code=${crewCode}`;
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

  return (
    <main style={shellStyle}>
      <PageHeader
        title="Crew Radar"
        action={
          <Link href="/profile" style={navButtonStyle}>
            Profile
          </Link>
        }
      />

      <section style={heroCardStyle}>
        <p style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>
          Live Crew Signal
        </p>

        <h2 style={{ margin: 0, fontSize: 24 }}>
          {displayName} — {liveStatus}
        </h2>

        <p style={{ color: colors.soft, marginTop: 10, marginBottom: 0 }}>
          Crew statuses update live from Party Mode.
        </p>
      </section>

      <section style={cardStyle}>
        <button onClick={handleInviteCrew} style={primaryButtonStyle}>
          {inviteOpen ? "Close Invite" : "Invite Crew"}
        </button>

        {inviteOpen && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 10 }}>
              <strong>Crew Code:</strong> {crewCode}
            </div>

            <div style={{ marginBottom: 10 }}>
              <strong>Invite Link:</strong>
              <div style={{ color: colors.soft, wordBreak: "break-all" }}>
                {inviteLink}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={copyInviteLink} style={secondaryButtonStyle}>
                Copy Invite Link
              </button>

              <button onClick={regenerateCode} style={secondaryButtonStyle}>
                New Code
              </button>
            </div>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h3 style={sectionHeadingStyle}>Join Crew</h3>

        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter crew code"
          style={inputStyle}
        />

        <div style={{ marginTop: 10 }}>
          <button onClick={handleJoinCrew} style={primaryButtonStyle}>
            Join
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={sectionHeadingStyle}>Crew Pulse</h3>

        <div style={{ display: "grid", gap: 12 }}>
          {crew.map((member) => (
            <div
              key={member.name}
              style={{
                background: "#18181B",
                border: "1px solid #27272A",
                borderRadius: 14,
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 700 }}>{member.name}</div>
              <div style={{ color: colors.muted }}>{member.activity}</div>
            </div>
          ))}
        </div>
      </section>

      {statusMessage && (
        <p style={{ marginTop: 14, color: colors.success }}>{statusMessage}</p>
      )}

      <div style={navGridThreeStyle}>
        <Link href="/" style={navButtonStyle}>
          Home
        </Link>

        <Link href="/party" style={navButtonStyle}>
          Party
        </Link>

        <Link href="/contact-card" style={navButtonStyle}>
          Contact Card
        </Link>
      </div>
    </main>
  );
}