"use client";

import Link from "next/link";

type CrewMember = {
  name: string;
  status: string;
  minutesAgo: number;
};

const STALE_MINUTES = 10;

const crew: CrewMember[] = [
  { name: "Neo", status: "Listening to music", minutesAgo: 36 },
  { name: "Marcus", status: "Listening to music", minutesAgo: 8 },
  { name: "Angellette", status: "Watching Netflix", minutesAgo: 3 },
  { name: "Jade", status: "Heading out", minutesAgo: 18 }
];

export default function CrewPage() {
  return (
    <main
      style={{
        padding: 20,
        maxWidth: 700,
        margin: "0 auto",
        color: "white"
      }}
    >
      <h1 style={{ marginBottom: 20 }}>Crew Pulse</h1>

      {crew.map((member) => {
        const stale = member.minutesAgo > STALE_MINUTES;

        return (
          <div
            key={member.name}
            style={{
              background: "#18181B",
              border: stale ? "1px solid #7F1D1D" : "1px solid #27272A",
              borderRadius: 14,
              padding: 16,
              marginBottom: 14
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontWeight: 700
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: stale ? "#EF4444" : "#8B5CF6",
                      boxShadow: `0 0 10px ${stale ? "#EF4444" : "#8B5CF6"}`
                    }}
                  />

                  {member.name}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: stale ? "#FCA5A5" : "#9CA3AF",
                    fontWeight: stale ? 600 : 400
                  }}
                >
                  {stale ? "No recent update" : member.status}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                {stale && (
                  <div
                    style={{
                      background: "#7F1D1D",
                      color: "#FECACA",
                      borderRadius: 999,
                      padding: "4px 8px",
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 6
                    }}
                  >
                    WARNING
                  </div>
                )}

                <div style={{ fontSize: 13 }}>
                  {member.minutesAgo} min ago
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginTop: 20
        }}
      >
        <Link href="/">Home</Link>
        <Link href="/party">Party</Link>
        <Link href="/contact-card">Contact Card</Link>
      </div>
    </main>
  );
}