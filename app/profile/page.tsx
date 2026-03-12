"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "twincore_profile";

type ProfileData = {
  displayName: string;
  vibe: string;
  city: string;
};

const defaultProfile: ProfileData = {
  displayName: "Neo",
  vibe: "Calm but lit",
  city: "London, ON",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as ProfileData;
      setProfile({
        displayName: parsed.displayName || "Neo",
        vibe: parsed.vibe || "Calm but lit",
        city: parsed.city || "London, ON",
      });
    } catch {}
  }, []);

  function saveProfile() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setSaved(true);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0A0A0B",
        color: "white",
        padding: "24px 16px",
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
            Profile
          </h1>
        </div>

        <Link href="/" style={navButton}>
          Home
        </Link>
      </div>

      <section style={cardStyle}>
        <label style={labelStyle}>Display Name</label>
        <input
          value={profile.displayName}
          onChange={(e) =>
            setProfile({ ...profile, displayName: e.target.value })
          }
          style={inputStyle}
        />

        <label style={labelStyle}>Vibe</label>
        <input
          value={profile.vibe}
          onChange={(e) => setProfile({ ...profile, vibe: e.target.value })}
          style={inputStyle}
        />

        <label style={labelStyle}>City</label>
        <input
          value={profile.city}
          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
          style={inputStyle}
        />

        <button onClick={saveProfile} style={primaryButton}>
          Save Profile
        </button>

        {saved && (
          <p style={{ marginTop: 12, color: "#86EFAC" }}>Profile saved.</p>
        )}
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
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
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#111113",
  border: "1px solid #232326",
  borderRadius: 20,
  padding: 18,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#A1A1AA",
  marginBottom: 6,
  marginTop: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#18181B",
  color: "white",
  border: "1px solid #27272A",
  borderRadius: 14,
  padding: "14px",
  fontSize: 14,
  boxSizing: "border-box",
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
  marginTop: 18,
  background: "white",
  color: "black",
  border: "none",
  borderRadius: 14,
  padding: "14px 18px",
  fontWeight: 700,
  cursor: "pointer",
};