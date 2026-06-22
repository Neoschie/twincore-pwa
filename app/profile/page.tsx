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
import posthog from "posthog-js";

import { supabase } from "@/lib/supabase/client";

const getProfileStorageKey = (userId: string) =>
  `twincore_profile_${userId}`;

type ProfileData = {
  displayName: string;
  photoUrl: string;
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
  photoUrl: "",
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
  
const handleSignOut = async () => {
  posthog.reset();

  sessionStorage.clear();

  await supabase.auth.signOut({ scope: "global" });

  window.location.replace("/auth");
};

const [saved, setSaved] = useState(false);
const [newTrusted, setNewTrusted] = useState("");

useEffect(() => {
  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("PROFILE ACTIVE EMAIL:", user?.email);
console.log("PROFILE ACTIVE USER ID:", user?.id);
console.log(
  "PROFILE STORAGE KEY:",
  user ? getProfileStorageKey(user.id) : "no user"
);
console.log("PROFILE RAW DATA:", user ? localStorage.getItem(getProfileStorageKey(user.id)) : null);

    console.log("PROFILE PAGE USER:", user?.email);
console.log("PROFILE PAGE USER ID:", user?.id);
console.log("PROFILE KEY USED:", user ? getProfileStorageKey(user.id) : "no user");
console.log("ALL LOCAL STORAGE:", { ...localStorage });

    if (!user) return;

    const raw = localStorage.getItem(getProfileStorageKey(user.id));

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<ProfileData>;

        setProfile((prev) => ({
          ...prev,
          ...parsed,
        }));
      } catch {}
    }
  }

  loadProfile();
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

  async function saveProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("SAVE PROFILE USER:", user?.email);
console.log("SAVE PROFILE USER ID:", user?.id);
console.log("SAVE PROFILE DATA:", profile);

  if (!user) {
  alert("No signed-in user found. Profile was not saved.");
  return;
}

  posthog.capture("profile_saved", {
    ghost_mode: profile.ghostMode,
    trusted_only: profile.trustedOnly,
  });

  localStorage.setItem(
    getProfileStorageKey(user.id),
    JSON.stringify(profile)
  );

  localStorage.setItem(
    `twincore_trusted_${user.id}`,
    JSON.stringify(profile.trustedList)
  );

  localStorage.setItem(
    `twincore_ghost_mode_${user.id}`,
    JSON.stringify({
      enabled: profile.ghostMode,
      label: profile.ghostLabel,
      blurPresence: profile.blurPresence,
    })
  );

  localStorage.setItem(
    `twincore_display_name_${user.id}`,
    profile.displayName
  );

  setSaved(true);
  setTimeout(() => setSaved(false), 2000);
}

  return (
    <main style={shellStyle}>
      <PageHeader
        title="Profile"
        action={
          <Link href="/" style={navButtonStyle}>
  ← Dashboard
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
<label style={labelStyle}>Profile Photo URL</label>

<input
  value={profile.photoUrl}
  onChange={(e) =>
    setProfile({
      ...profile,
      photoUrl: e.target.value,
    })
  }
  placeholder="https://example.com/photo.jpg"
  style={inputStyle}
/> 

{profile.photoUrl && (
  <div
    style={{
      marginTop: 12,
      marginBottom: 12,
      display: "flex",
      justifyContent: "center",
    }}
  >
    <img
      src={profile.photoUrl}
      alt="Profile Preview"
      style={{
        width: 90,
        height: 90,
        borderRadius: "50%",
        objectFit: "cover",
        border: "2px solid rgba(236,72,153,.5)",
        boxShadow:
          "0 0 25px rgba(217,70,239,.45)",
      }}
    />
  </div>
)}
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

<button
  onClick={handleSignOut}
  style={{
    marginTop: 12,
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 700,
    color: "white",
    background: "transparent",
    cursor: "pointer",
  }}
>
  Sign Out
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
