"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CrewStatus = {
  id: string;
  name: string;
  status: string;
  updated_at: string;
};

function minutesAgo(time: string) {
  const now = new Date().getTime();
  const then = new Date(time).getTime();

  const diff = Math.floor((now - then) / 60000);

  if (diff <= 1) return "Just now";
  return `${diff} min ago`;
}

function isStale(time: string) {
  const now = new Date().getTime();
  const then = new Date(time).getTime();

  const diff = Math.floor((now - then) / 60000);

  return diff > 45;
}

export default function CrewPage() {
  const [crew, setCrew] = useState<CrewStatus[]>([]);

  async function loadCrew() {
    const { data } = await supabase
      .from("crew_status")
      .select("*")
      .order("updated_at", { ascending: false });

    if (data) setCrew(data);
  }

  useEffect(() => {
    loadCrew();

    const channel = supabase
      .channel("crew-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crew_status" },
        () => loadCrew()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: 20,
        color: "white"
      }}
    >
      <h1 style={{ marginBottom: 20 }}>Crew Radar</h1>

      {crew.map((member) => {
        const stale = isStale(member.updated_at);

        return (
          <div
            key={member.id}
            style={{
              background: "#18181B",
              border: stale
                ? "1px solid #7F1D1D"
                : "1px solid #27272A",
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
                      background: stale ? "#EF4444" : "#8B5CF6"
                    }}
                  />

                  {member.name}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: stale ? "#FCA5A5" : "#9CA3AF"
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
                  {minutesAgo(member.updated_at)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </main>
  );
}