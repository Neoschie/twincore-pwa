"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PageHeader,
  cardStyle,
  inputStyle,
  labelStyle,
  navButtonStyle,
  navGridThreeStyle,
  primaryButtonStyle,
  shellStyle,
} from "@/components/twincore-ui";

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
    <main style={shellStyle}>
      <PageHeader
        title="Profile"
        action={
          <Link href="/" style={navButtonStyle}>
            Home
          </Link>
        }
      />

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

        <button onClick={saveProfile} style={primaryButtonStyle}>
          Save Profile
        </button>

        {saved && (
          <p style={{ marginTop: 12, color: "#86EFAC" }}>Profile saved.</p>
        )}
      </section>

      <div style={navGridThreeStyle}>
        <Link href="/" style={navButtonStyle}>
          Home
        </Link>
        <Link href="/crew" style={navButtonStyle}>
          Crew
        </Link>
        <Link href="/party" style={navButtonStyle}>
          Party
        </Link>
      </div>
    </main>
  );
}