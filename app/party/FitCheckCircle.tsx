"use client";

import { useState } from "react";

type CrewStatus =
  | "ready"
  | "not_ready"
  | "outside"
  | "drinking"
  | "at_club"
  | "listening"
  | "watching_netflix"
  | "heading_home"
  | "safe";

type CrewMember = {
  id: string;
  name: string;
  status: CrewStatus;
  batteryLevel?: number;
  isCurrentUser?: boolean;
};

const initialMembers: CrewMember[] = [
  {
    id: "1",
    name: "Neo",
    status: "not_ready",
    batteryLevel: 82,
    isCurrentUser: true,
  },
  {
    id: "2",
    name: "Angellette",
    status: "ready",
    batteryLevel: 67,
  },
  {
    id: "3",
    name: "Marcus",
    status: "outside",
    batteryLevel: 54,
  },
];

export default function FitCheckCircle() {
  const [members, setMembers] = useState<CrewMember[]>(initialMembers);

  function markCurrentUserReady() {
    const updated: CrewMember[] = members.map((member) =>
      member.isCurrentUser ? { ...member, status: "ready" as CrewStatus } : member
    );
    setMembers(updated);
  }

  function getStatusLabel(status: CrewStatus) {
    switch (status) {
      case "ready":
        return "Ready";
      case "not_ready":
        return "Not Ready";
      case "outside":
        return "Outside";
      case "drinking":
        return "Drinking";
      case "at_club":
        return "At Club";
      case "listening":
        return "Listening to Music";
      case "watching_netflix":
        return "Watching Netflix";
      case "heading_home":
        return "Heading Home";
      case "safe":
        return "Safe";
      default:
        return status;
    }
  }

  return (
    <section
      style={{
        background: "#111113",
        border: "1px solid #232326",
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Fit Check Circle</h3>
          <p style={{ margin: "6px 0 0", color: "#A1A1AA" }}>
            Quick crew readiness snapshot
          </p>
        </div>

        <button
          onClick={markCurrentUserReady}
          style={{
            background: "white",
            color: "black",
            border: "none",
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          I’m Ready
        </button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {members.map((member) => (
          <div
            key={member.id}
            style={{
              background: "#18181B",
              border: "1px solid #27272A",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  {member.name}
                  {member.isCurrentUser ? " (You)" : ""}
                </div>
                <div style={{ color: "#A1A1AA", marginTop: 4 }}>
                  {getStatusLabel(member.status)}
                </div>
              </div>

              <div style={{ color: "#A1A1AA", fontSize: 14 }}>
                {member.batteryLevel ?? "--"}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}