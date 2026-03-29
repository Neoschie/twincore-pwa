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
const GHOST_MODE_KEY = "twincore_ghost_mode";
const TRUSTED_KEY = "twincore_trusted";

type ProfileData = {
  displayName: string;
  vibe: string;
  city: string;
  ghostMode: boolean;
  ghostLabel: string;
  blurPresence: boolean;
  trustedOnly: boolean;
  trustedList: string[];
};

const defaultProfile: ProfileData = {
  displayName: "Neo",
  vibe: "Calm but lit",
  city: "London, ON",
  ghostMode: false,
  ghostLabel: "Low Visibility",
  blurPresence: true,
  trustedOnly: false,
  trustedList: [],
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [saved, setSaved] = useState(false);
  const [newTrusted, setNewTrusted] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const trustedRaw = localStorage.getItem(TRUSTED_KEY);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<ProfileData>;

        setProfile((prev) => ({
          ...prev,
          ...parsed,
        }));
      } catch {}
    }

    if (trustedRaw) {
      try {
        const parsed = JSON.parse(trustedRaw);
        setProfile((prev) => ({
          ...prev,
          trustedList: parsed || [],
        }));
      } catch {}
    }
  }, []);

  function addTrusted() {
    if (!newTrusted.trim()) return;

    setProfile({
      ...profile,
      trustedList: [...profile.trustedList, newTrusted.trim()],
    });

    setNewTrusted("");
  }

  function removeTrusted(index: number) {
    const updated = [...profile.trustedList];
    updated.splice(index, 1);

    setProfile({
      ...profile,
      trustedList: updated,
    });
  }

  function saveProfile() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(TRUSTED_KEY, JSON.stringify(profile.trustedList));

    localStorage.setItem(
      GHOST_MODE_KEY,
      JSON.stringify({
        enabled: profile.ghostMode,
        label: profile.ghostLabel,
        blurPresence: profile.blurPresence,
      })
    );

    localStorage.setItem("twincore_display_name", profile.displayName);

    setSaved(true);

    setTimeout(() => setSaved(false), 2000);
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

      {/* BASIC */}
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
          onChange={(e) =>
            setProfile({ ...profile, vibe: e.target.value })
          }
          style={inputStyle}
        />

        <label style={labelStyle}>City</label>
        <input
          value={profile.city}
          onChange={(e) =>
            setProfile({ ...profile, city: e.target.value })
          }
          style={inputStyle}
        />
      </section>

      {/* GHOST MODE */}
      <section style={cardStyle}>
        <label style={labelStyle}>Ghost Mode</label>

        <button
          onClick={() =>
            setProfile({ ...profile, ghostMode: !profile.ghostMode })
          }
          style={primaryButtonStyle}
        >
          {profile.ghostMode ? "Ghost Mode On" : "Ghost Mode Off"}
        </button>

        <label style={labelStyle}>Ghost Label</label>
        <input
          value={profile.ghostLabel}
          onChange={(e) =>
            setProfile({ ...profile, ghostLabel: e.target.value })
          }
          style={inputStyle}
        />

        <button
          onClick={() =>
            setProfile({
              ...profile,
              blurPresence: !profile.blurPresence,
            })
          }
          style={navButtonStyle}
        >
          {profile.blurPresence ? "Blur Enabled" : "Blur Disabled"}
        </button>
      </section>

      {/* TRUSTED CREW */}
      <section style={cardStyle}>
        <label style={labelStyle}>Trusted Crew Only</label>

        <button
          onClick={() =>
            setProfile({ ...profile, trustedOnly: !profile.trustedOnly })
          }
          style={primaryButtonStyle}
        >
          {profile.trustedOnly
            ? "Trusted Only Enabled"
            : "Trusted Only Disabled"}
        </button>

        <p style={{ color: "#A1A1AA", marginTop: 10 }}>
          Only trusted people will see your full live presence.
        </p>

        <label style={labelStyle}>Add Trusted Person</label>
        <input
          value={newTrusted}
          onChange={(e) => setNewTrusted(e.target.value)}
          style={inputStyle}
          placeholder="Enter name"
        />

        <button onClick={addTrusted} style={navButtonStyle}>
          Add
        </button>

        <div style={{ marginTop: 12 }}>
          {profile.trustedList.map((name, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
                color: "white",
              }}
            >
              {name}
              <button onClick={() => removeTrusted(i)}>Remove</button>
            </div>
          ))}
        </div>
      </section>

      <button onClick={saveProfile} style={primaryButtonStyle}>
        Save Profile
      </button>

      {saved && (
        <p style={{ marginTop: 10, color: "#86EFAC" }}>
          Settings saved.
        </p>
      )}

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
