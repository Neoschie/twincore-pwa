"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PageHeader,
  cardStyle,
  colors,
  gridTwoStyle,
  heroCardStyle,
  heroTitleStyle,
  labelStyle,
  navButtonStyle,
  pageSubtitleStyle,
  shellStyle,
} from "@/components/twincore-ui";

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
    <main style={shellStyle}>
      <section style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>
          TwinCore
        </p>
        <h1 style={heroTitleStyle}>Dashboard</h1>
        <p style={pageSubtitleStyle}>Your social, safety, and identity hub.</p>
      </section>

      <section style={heroCardStyle}>
        <p style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>
          Live System
        </p>

        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>
          Welcome back, {displayName}
        </h2>

        <p
          style={{
            color: colors.soft,
            marginTop: 10,
            marginBottom: 12,
            lineHeight: 1.6,
          }}
        >
          TwinCore is active and connected across Crew, Party Mode, Contact
          Card, Profile, and Join flow.
        </p>

        <div style={{ lineHeight: 1.9, color: colors.soft }}>
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

      <div style={gridTwoStyle}>
        <Link href="/crew" style={{ ...cardStyle, textDecoration: "none", color: "white", minHeight: 170, display: "block" }}>
          <p style={{ ...labelStyle, marginTop: 0 }}>Social Layer</p>
          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Crew Radar</h3>
          <p style={{ margin: 0, color: colors.soft, lineHeight: 1.6 }}>
            Invite crew, join with code, and view live crew activity.
          </p>
        </Link>

        <Link href="/party" style={{ ...cardStyle, textDecoration: "none", color: "white", minHeight: 170, display: "block" }}>
          <p style={{ ...labelStyle, marginTop: 0 }}>Activity Layer</p>
          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Party Mode</h3>
          <p style={{ margin: 0, color: colors.soft, lineHeight: 1.6 }}>
            Broadcast statuses like Outside, At club, Safe, or Heading home.
          </p>
        </Link>

        <Link href="/contact-card" style={{ ...cardStyle, textDecoration: "none", color: "white", minHeight: 170, display: "block" }}>
          <p style={{ ...labelStyle, marginTop: 0 }}>Sharing Layer</p>
          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Contact Card</h3>
          <p style={{ margin: 0, color: colors.soft, lineHeight: 1.6 }}>
            Share your identity, crew access, and QR join experience.
          </p>
        </Link>

        <Link href="/profile" style={{ ...cardStyle, textDecoration: "none", color: "white", minHeight: 170, display: "block" }}>
          <p style={{ ...labelStyle, marginTop: 0 }}>Identity Layer</p>
          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Profile</h3>
          <p style={{ margin: 0, color: colors.soft, lineHeight: 1.6 }}>
            Save your name, vibe, city, music, and emergency contact info.
          </p>
        </Link>
      </div>

      <section style={{ marginTop: 28, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Quick Access</h3>
      </section>

      <div style={gridTwoStyle}>
        <Link href="/join" style={navButtonStyle}>
          Join Crew
        </Link>
        <Link href="/crew" style={navButtonStyle}>
          Open Crew
        </Link>
        <Link href="/party" style={navButtonStyle}>
          Open Party
        </Link>
        <Link href="/profile" style={navButtonStyle}>
          Open Profile
        </Link>
      </div>

      <section style={{ marginTop: 28 }}>
        <div style={cardStyle}>
          <p style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>
            Safety Status
          </p>

          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 22 }}>
            {liveStatus === "Safe" ? "Safe" : "Monitoring"}
          </h3>

          <p style={{ margin: 0, color: colors.soft, lineHeight: 1.6 }}>
            Contact Card, Crew access, Party updates, and Join flow are all
            live in your MVP.
          </p>
        </div>
      </section>
    </main>
  );
}