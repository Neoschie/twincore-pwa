"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PROFILE_STORAGE_KEY = "twincore_profile";
const PARTY_STATUS_STORAGE_KEY = "twincore_party_status";

type SavedProfile = {
  displayName?: string;
  vibe?: string;
  city?: string;
};

type SavedPartyStatus = {
  status?: string;
};

export default function HomePage() {
  const [displayName, setDisplayName] = useState("Neo");
  const [vibe, setVibe] = useState("Calm but lit");
  const [city, setCity] = useState("London, ON");
  const [liveStatus, setLiveStatus] = useState("Not active");

  useEffect(() => {
    const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (rawProfile) {
      try {
        const parsed = JSON.parse(rawProfile) as SavedProfile;
        if (parsed.displayName) setDisplayName(parsed.displayName);
        if (parsed.vibe) setVibe(parsed.vibe);
        if (parsed.city) setCity(parsed.city);
      } catch {}
    }

    function loadPartyStatus() {
      const rawStatus = localStorage.getItem(PARTY_STATUS_STORAGE_KEY);

      if (!rawStatus) {
        setLiveStatus("Not active");
        return;
      }

      try {
        const parsed = JSON.parse(rawStatus) as SavedPartyStatus;
        setLiveStatus(parsed.status || "Not active");
      } catch {
        setLiveStatus("Not active");
      }
    }

    loadPartyStatus();

    const interval = setInterval(loadPartyStatus, 1000);
    return () => clearInterval(interval);
  }, []);

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
      <section style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: "#A1A1AA", marginBottom: 6 }}>
          TwinCore
        </p>

        <h1 style={{ fontSize: 34, fontWeight: 800, margin: 0 }}>
          Dashboard
        </h1>

        <p
          style={{
            color: "#A1A1AA",
            marginTop: 10,
            marginBottom: 0,
            lineHeight: 1.6,
          }}
        >
          Your social, safety, and identity hub.
        </p>
      </section>

      <section style={heroCard}>
        <p style={{ fontSize: 12, color: "#A1A1AA", marginBottom: 8 }}>
          Live System
        </p>

        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>
          Welcome back, {displayName}
        </h2>

        <p
          style={{
            color: "#D4D4D8",
            marginTop: 10,
            marginBottom: 12,
            lineHeight: 1.6,
          }}
        >
          TwinCore is active and connected across Crew, Party Mode, Contact
          Card, Profile, and Join flow.
        </p>

        <div style={{ lineHeight: 1.9, color: "#D4D4D8" }}>
          <div>
            <strong>Vibe:</strong> {vibe}
          </div>
          <div>
            <strong>City:</strong> {city}
          </div>
          <div>
            <strong>Live status:</strong>{" "}
            <span style={{ color: "white" }}>{liveStatus}</span>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 22, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Core Features</h3>
      </section>

      <div style={gridStyle}>
        <Link href="/crew" style={featureCard}>
          <div>
            <p style={labelStyle}>Social Layer</p>
            <h3 style={cardTitle}>Crew Pulse</h3>
            <p style={cardText}>
              Invite crew, join with code, and view live crew activity.
            </p>
          </div>
        </Link>

        <Link href="/party" style={featureCard}>
          <div>
            <p style={labelStyle}>Activity Layer</p>
            <h3 style={cardTitle}>Party Mode</h3>
            <p style={cardText}>
              Broadcast statuses like Outside, At club, Safe, or Heading home.
            </p>
          </div>
        </Link>

        <Link href="/contact-card" style={featureCard}>
          <div>
            <p style={labelStyle}>Sharing Layer</p>
            <h3 style={cardTitle}>Contact Card</h3>
            <p style={cardText}>
              Share your identity, crew access, and QR join experience.
            </p>
          </div>
        </Link>

        <Link href="/profile" style={featureCard}>
          <div>
            <p style={labelStyle}>Identity Layer</p>
            <h3 style={cardTitle}>Profile</h3>
            <p style={cardText}>
              Save your name, vibe, city, music, and emergency contact info.
            </p>
          </div>
        </Link>
      </div>

      <section style={{ marginTop: 28, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Quick Access</h3>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <Link href="/join" style={quickButton}>
          Join Crew
        </Link>

        <Link href="/crew" style={quickButton}>
          Open Crew
        </Link>

        <Link href="/party" style={quickButton}>
          Open Party
        </Link>

        <Link href="/profile" style={quickButton}>
          Open Profile
        </Link>
      </div>

      <section style={{ marginTop: 28 }}>
        <div style={statusCard}>
          <p style={{ fontSize: 12, color: "#A1A1AA", marginBottom: 8 }}>
            Safety Status
          </p>

          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 22 }}>
            {liveStatus === "Safe" ? "Safe" : "Monitoring"}
          </h3>

          <p style={{ margin: 0, color: "#D4D4D8", lineHeight: 1.6 }}>
            Contact Card, Crew access, Party updates, and Join flow are all
            live in your MVP.
          </p>
        </div>
      </section>
    </main>
  );
}

const heroCard: React.CSSProperties = {
  background: "linear-gradient(180deg, #151518 0%, #101012 100%)",
  border: "1px solid #232326",
  borderRadius: 24,
  padding: 22,
};

const statusCard: React.CSSProperties = {
  background: "#111113",
  border: "1px solid #232326",
  borderRadius: 20,
  padding: 18,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const featureCard: React.CSSProperties = {
  textDecoration: "none",
  color: "white",
  background: "#111113",
  border: "1px solid #232326",
  borderRadius: 20,
  padding: 18,
  minHeight: 170,
  display: "block",
};

const quickButton: React.CSSProperties = {
  textDecoration: "none",
  color: "white",
  background: "#18181B",
  border: "1px solid #27272A",
  borderRadius: 14,
  padding: "14px 16px",
  textAlign: "center",
  fontWeight: 700,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#A1A1AA",
  marginTop: 0,
  marginBottom: 8,
};

const cardTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 8,
  fontSize: 20,
};

const cardText: React.CSSProperties = {
  margin: 0,
  color: "#D4D4D8",
  lineHeight: 1.6,
};