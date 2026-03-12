"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearCrew,
  getCrew,
  updateCrewStatus,
  type CrewMember,
  type CrewStatus,
} from "../store";

type TimelineEvent = {
  id: number;
  time: string;
  message: string;
};

const TABS: CrewStatus[] = ["At Party", "Preparing", "Heading Home", "Home Safe"];

export default function PartyDashboardPage() {
  const [activeTab, setActiveTab] = useState<CrewStatus>("At Party");
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  function refreshCrew() {
    setCrew(getCrew());
  }

  useEffect(() => {
    refreshCrew();
  }, []);

  function getCurrentTime() {
    return new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function addTimelineEvent(message: string) {
    const newEvent: TimelineEvent = {
      id: Date.now(),
      time: getCurrentTime(),
      message,
    };

    setTimeline((prev) => [newEvent, ...prev]);
  }

  function updateMember(name: string, status: CrewStatus) {
    updateCrewStatus(name, status);
    refreshCrew();

    if (name === "Neo") {
      if (status === "At Party") addTimelineEvent("Neo checked in");
      if (status === "Preparing") addTimelineEvent("Neo preparing");
      if (status === "Heading Home") addTimelineEvent("Neo heading home");
      if (status === "Home Safe") addTimelineEvent("Neo arrived home safe");
    } else {
      if (status === "At Party") addTimelineEvent(`${name} checked in`);
      if (status === "Preparing") addTimelineEvent(`${name} preparing`);
      if (status === "Heading Home") addTimelineEvent(`${name} heading home`);
      if (status === "Home Safe") addTimelineEvent(`${name} arrived home safe`);
    }
  }

  async function copyInviteLink() {
    const inviteUrl = `${window.location.origin}/party/join`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert("Invite link copied!");
    } catch {
      alert(`Copy this link: ${inviteUrl}`);
    }
  }

  function resetCrew() {
    clearCrew();
    refreshCrew();
    setTimeline([]);
  }

  const filteredCrew = useMemo(() => {
    return crew.filter((member) => member.status === activeTab);
  }, [crew, activeTab]);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#0B0B0F",
        color: "#FFFFFF",
        padding: "24px 16px 80px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            border: "1px solid #27272A",
            background: "linear-gradient(180deg, #18181B 0%, #111113 100%)",
            borderRadius: 28,
            padding: 22,
            boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "#A1A1AA",
                  marginBottom: 8,
                }}
              >
                Party Mode
              </div>

              <h1
                style={{
                  fontSize: 30,
                  lineHeight: 1.1,
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                Crew Dashboard
              </h1>

              <p
                style={{
                  margin: "10px 0 0",
                  color: "#D4D4D8",
                  fontSize: 15,
                  lineHeight: 1.5,
                }}
              >
                Your live safety layer for the night.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={copyInviteLink} style={topButtonStyle}>
                Invite Crew
              </button>

              <button
                onClick={resetCrew}
                style={{
                  ...topButtonStyle,
                  backgroundColor: "#18181B",
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <button onClick={() => updateMember("Neo", "At Party")} style={actionButtonStyle}>
              Check In
            </button>
            <button onClick={() => updateMember("Neo", "Preparing")} style={actionButtonStyle}>
              Preparing
            </button>
            <button onClick={() => updateMember("Neo", "Heading Home")} style={actionButtonStyle}>
              Heading Home
            </button>
            <button onClick={() => updateMember("Neo", "Home Safe")} style={actionButtonStyle}>
              Arrived Safe
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4,
              marginBottom: 18,
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    backgroundColor: isActive ? "#FFFFFF" : "#18181B",
                    color: isActive ? "#0B0B0F" : "#FFFFFF",
                    border: isActive ? "1px solid #FFFFFF" : "1px solid #27272A",
                    borderRadius: 999,
                    padding: "10px 14px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <section
            style={{
              backgroundColor: "#101014",
              border: "1px solid #232328",
              borderRadius: 22,
              padding: 18,
              marginBottom: 18,
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {activeTab}
            </h2>

            {filteredCrew.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: "#A1A1AA",
                  fontSize: 14,
                }}
              >
                No one here right now.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filteredCrew.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      backgroundColor: "#15151A",
                      border: "1px solid #27272A",
                      borderRadius: 16,
                      padding: "14px 16px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        {member.name}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#A1A1AA",
                          marginBottom: 10,
                        }}
                      >
                        Status: {member.status}
                      </div>

                      {member.name !== "Neo" && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            onClick={() => updateMember(member.name, "At Party")}
                            style={miniButtonStyle}
                          >
                            Check In
                          </button>
                          <button
                            onClick={() => updateMember(member.name, "Preparing")}
                            style={miniButtonStyle}
                          >
                            Preparing
                          </button>
                          <button
                            onClick={() => updateMember(member.name, "Heading Home")}
                            style={miniButtonStyle}
                          >
                            Heading Home
                          </button>
                          <button
                            onClick={() => updateMember(member.name, "Home Safe")}
                            style={miniButtonStyle}
                          >
                            Safe
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: 18 }}>
                      {member.status === "At Party" && "🟢"}
                      {member.status === "Preparing" && "🟡"}
                      {member.status === "Heading Home" && "🔵"}
                      {member.status === "Home Safe" && "🏠"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            style={{
              backgroundColor: "#09090B",
              border: "1px solid #232328",
              borderRadius: 24,
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 19,
                  fontWeight: 700,
                }}
              >
                Crew Timeline
              </h2>

              <div
                style={{
                  fontSize: 12,
                  color: "#A1A1AA",
                }}
              >
                Memory layer of the night
              </div>
            </div>

            {timeline.length === 0 ? (
              <div
                style={{
                  backgroundColor: "#111113",
                  border: "1px solid #232328",
                  borderRadius: 18,
                  padding: "14px 16px",
                  color: "#A1A1AA",
                  fontSize: 14,
                }}
              >
                No events yet tonight.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {timeline.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      backgroundColor: "#111113",
                      border: "1px solid #232328",
                      borderRadius: 18,
                      padding: "14px 16px",
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "#F4F4F5",
                    }}
                  >
                    <span style={{ color: "#D4D4D8" }}>{event.time}</span> — {event.message}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

const topButtonStyle: React.CSSProperties = {
  backgroundColor: "#27272A",
  color: "#FFFFFF",
  border: "1px solid #3F3F46",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const actionButtonStyle: React.CSSProperties = {
  backgroundColor: "#18181B",
  color: "#FFFFFF",
  border: "1px solid #27272A",
  borderRadius: 16,
  padding: "14px 16px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

const miniButtonStyle: React.CSSProperties = {
  backgroundColor: "#18181B",
  color: "#FFFFFF",
  border: "1px solid #27272A",
  borderRadius: 12,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};