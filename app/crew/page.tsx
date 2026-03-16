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
import {
  formatTimeAgo,
  getStatusTone,
  isStaleCheckIn,
} from "@/components/status-utils";

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
const STALE_MINUTES = 45;

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
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | undefined>();
  const [crewCode, setCrewCode] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

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
      activity: "Outside",
      updatedAt: new Date(Date.now() - 62 * 60000).toISOString(),
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
    const interval = setInterval(loadPartyStatus, 1000);
    return () => clearInterval(interval);
  }, [displayName]);

  const inviteLink = useMemo(() => {
    return `https://twincore.co/join?code=${crewCode}`;
  }, [crewCode]);

  const liveTone = getStatusTone(liveStatus);
  const liveIsStale = isStaleCheckIn(liveUpdatedAt, STALE_MINUTES);

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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: liveIsStale ? "#EF4444" : liveTone.dot,
              display: "inline-block",
              boxShadow: `0 0 12px ${liveIsStale ? "#EF4444" : liveTone.dot}`,
            }}
          />
          <h2 style={{ margin: 0, fontSize: 24 }}>
            {displayName} — {liveIsStale ? "No recent update" : liveTone.label}
          </h2>
        </div>

        <p style={{ color: colors.soft, marginTop: 10, marginBottom: 6 }}>
          Crew statuses update live from Party Mode.
        </p>

        <p style={{ color: colors.muted, margin: 0 }}>
          Last check-in: {formatTimeAgo(liveUpdatedAt)}
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
          {crew.map((member) => {
            const tone = getStatusTone(member.activity);
            const stale = isStaleCheckIn(member.updatedAt, STALE_MINUTES);

            return (
              <div
                key={member.name}
                style={{
                  background: "#18181B",
                  border: stale ? "1px solid #7F1D1D" : "1px solid #27272A",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: stale ? "#EF4444" : tone.dot,
                          display: "inline-block",
                          boxShadow: `0 0 10px ${stale ? "#EF4444" : tone.dot}`,
                        }}
                      />
                      {member.name}
                    </div>

                    <div
                      style={{
                        color: stale ? "#FCA5A5" : colors.muted,
                        marginTop: 6,
                        fontWeight: stale ? 700 : 400,
                      }}
                    >
                      {stale ? "No recent update" : tone.label}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 6,
                    }}
                  >
                    {stale && (
                      <span
                        style={{
                          background: "#7F1D1D",
                          color: "#FECACA",
                          border: "1px solid #991B1B",
                          borderRadius: 999,
                          padding: "4px 8px",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        WARNING
                      </span>
                    )}

                    <div
                      style={{
                        color: stale ? "#FCA5A5" : colors.soft,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatTimeAgo(member.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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