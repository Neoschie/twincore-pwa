"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

const PROFILE_STORAGE_KEY = "twincore_profile";
const CREW_CODE_STORAGE_KEY = "twincore_crew_code";

type ProfileData = {
  displayName?: string;
  vibe?: string;
  city?: string;
  favoriteMusic?: string;
  emergencyName?: string;
  emergencyPhone?: string;
};

export default function ContactCardPage() {
  const [profile, setProfile] = useState<ProfileData>({});
  const [crewCode, setCrewCode] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }

    const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (rawProfile) {
      try {
        const parsed = JSON.parse(rawProfile) as ProfileData;
        setProfile(parsed);
      } catch {}
    }

    const savedCrewCode = localStorage.getItem(CREW_CODE_STORAGE_KEY);
    if (savedCrewCode) {
      setCrewCode(savedCrewCode);
    }
  }, []);

  const joinLink = useMemo(() => {
    const resolvedBaseUrl = baseUrl || "https://twincore.co";

    return crewCode
      ? `${resolvedBaseUrl}/join?code=${crewCode}`
      : `${resolvedBaseUrl}/join`;
  }, [crewCode, baseUrl]);

  function shareCard() {
    alert("TwinCore Contact Card ready to share.");
  }

  function copyJoinLink() {
    navigator.clipboard
      .writeText(joinLink)
      .then(() => alert("Join link copied."))
      .catch(() => alert("Could not copy join link."));
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
            Contact Card
          </h1>
        </div>

        <Link href="/profile" style={navButton}>
          Profile
        </Link>
      </div>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>
          {profile.displayName || "Your Name"}
        </h2>

        <p style={{ color: "#A1A1AA", marginTop: 0, marginBottom: 14 }}>
          {profile.vibe || "Your vibe"}
        </p>

        <div style={{ lineHeight: 1.9 }}>
          <div>
            <strong>City:</strong> {profile.city || "Not set"}
          </div>

          <div>
            <strong>Favorite Music:</strong>{" "}
            {profile.favoriteMusic || "Not set"}
          </div>

          <div>
            <strong>Emergency Contact:</strong>{" "}
            {profile.emergencyName || "Not set"}
          </div>

          <div>
            <strong>Emergency Phone:</strong>{" "}
            {profile.emergencyPhone || "Not set"}
          </div>

          <div>
            <strong>Crew Code:</strong> {crewCode || "Not available"}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Join Link</h3>

        <div
          style={{
            background: "#18181B",
            border: "1px solid #27272A",
            borderRadius: 14,
            padding: 12,
            marginBottom: 14,
            color: "#D4D4D8",
            wordBreak: "break-all",
          }}
        >
          {joinLink}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={shareCard} style={buttonStyle}>
            Share Card
          </button>

          <button onClick={copyJoinLink} style={buttonStyle}>
            Copy Join Link
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Scan to Join</h3>

        <p style={{ color: "#A1A1AA" }}>
          This QR opens your live TwinCore join page.
        </p>

        <div
          style={{
            background: "white",
            padding: 16,
            borderRadius: 14,
            width: "fit-content",
          }}
        >
          <QRCodeCanvas value={joinLink} size={220} />
        </div>
      </section>

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

        <Link href="/profile" style={navButton}>
          Profile
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

const buttonStyle: React.CSSProperties = {
  background: "#18181B",
  color: "white",
  border: "1px solid #27272A",
  borderRadius: 14,
  padding: "14px",
  fontWeight: 700,
  cursor: "pointer",
};