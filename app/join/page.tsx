"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PROFILE_STORAGE_KEY = "twincore_profile";

export default function JoinPage() {
  const [displayName, setDisplayName] = useState("Guest");
  const [crewCode, setCrewCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (rawProfile) {
      try {
        const parsed = JSON.parse(rawProfile);
        if (parsed.displayName) {
          setDisplayName(parsed.displayName);
        }
      } catch {}
    }

    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("code");

    if (codeFromUrl) {
      setCrewCode(codeFromUrl.toUpperCase());
    }
  }, []);

  function joinCrew() {
    if (!crewCode.trim()) {
      setStatusMessage("No crew code found.");
      return;
    }

    localStorage.setItem("twincore_joined_crew_code", crewCode);
    setStatusMessage(`${displayName} joined crew ${crewCode}.`);
    alert(`${displayName} joined crew ${crewCode}.`);
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
            Join Crew
          </h1>
        </div>

        <Link href="/" style={navButton}>
          Home
        </Link>
      </div>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Crew Invite</h2>

        <div style={{ lineHeight: 1.9, color: "#D4D4D8" }}>
          <div>
            <strong>Your name:</strong> {displayName}
          </div>
          <div>
            <strong>Crew code:</strong> {crewCode || "No code found"}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Join</h3>

        <div style={{ lineHeight: 1.9, color: "#D4D4D8" }}>
          <div>• Join this TwinCore crew</div>
          <div>• Save the crew code locally</div>
          <div>• Use Party Mode with this crew later</div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={joinCrew} style={primaryButton}>
            Join This Crew
          </button>
        </div>
      </section>

      {statusMessage && (
        <p style={{ marginTop: 14, color: "#86EFAC" }}>{statusMessage}</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
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

const primaryButton: React.CSSProperties = {
  background: "white",
  color: "black",
  border: "none",
  borderRadius: 14,
  padding: "14px 18px",
  fontWeight: 700,
  cursor: "pointer",
};