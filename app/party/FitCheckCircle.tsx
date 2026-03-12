"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import CrewMemberRow from "@/components/CrewMemberRow";
import { mockCircle } from "@/data/mockCircle";

const STORAGE_KEY = "twincore_party_members";

export default function PartyPage() {
  const [members, setMembers] = useState(mockCircle.members);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMembers(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  }, [members]);

  const readyCount = members.filter((m) => m.status === "ready").length;
  const preparingCount = members.filter((m) => m.status === "preparing").length;
  const missingCount = members.filter((m) => m.status === "not_joined").length;

  function handleReady() {
    const updated = members.map((m) =>
      m.isCurrentUser ? { ...m, status: "ready" } : m
    );
    setMembers(updated);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#09090B",
        color: "white",
        padding: 24,
        fontFamily: "Inter, Arial, Helvetica, sans-serif",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          Fit Check Circle
        </h1>

        <p style={{ color: "#A1A1AA", marginBottom: 20 }}>
          Get aligned before heading out
        </p>

        <div
          style={{
            backgroundColor: "#111827",
            borderRadius: 18,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Tonight's crew
          </h2>

          {members.map((member) => (
            <CrewMemberRow key={member.id} member={member} />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            backgroundColor: "#111827",
            borderRadius: 18,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <p style={{ color: "#A1A1AA", fontSize: 12 }}>Ready</p>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{readyCount}</p>
          </div>

          <div>
            <p style={{ color: "#A1A1AA", fontSize: 12 }}>Preparing</p>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{preparingCount}</p>
          </div>

          <div>
            <p style={{ color: "#A1A1AA", fontSize: 12 }}>Not Joined</p>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{missingCount}</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <button
            style={{
              backgroundColor: "#2563EB",
              color: "white",
              padding: "16px",
              borderRadius: 14,
              border: "none",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            Invite Crew
          </button>

          <button
            onClick={handleReady}
            style={{
              backgroundColor: "#22C55E",
              color: "#052E16",
              padding: "16px",
              borderRadius: 14,
              border: "none",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            I'm Ready
          </button>

          <Link href="/party/dashboard">
            <button
              style={{
                backgroundColor: "#18181B",
                color: "white",
                padding: "16px",
                borderRadius: 14,
                border: "1px solid #27272A",
                fontWeight: 700,
                fontSize: 16,
                width: "100%",
              }}
            >
              Start Party Mode
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}