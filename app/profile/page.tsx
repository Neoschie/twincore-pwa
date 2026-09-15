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
import { getSharedProfile, upsertSharedProfile } from "@/lib/shared-profile";
import { ActivityCard } from "@/components/dashboard/ActivityCard";
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
  displayName: "",
  photoUrl: "",
  vibe: "",
  city: "",

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

    let localProfile: Partial<ProfileData> = {};

    if (raw) {
      try {
        localProfile = JSON.parse(raw) as Partial<ProfileData>;
      } catch {
        localProfile = {};
      }
    }

    let sharedDisplayName = "";

    try {
      const sharedProfile = await getSharedProfile(user.id);
      sharedDisplayName = sharedProfile?.display_name?.trim() || "";
    } catch (error) {
      console.error("PROFILE SHARED AUTHORITY LOAD ERROR:", error);
    }

    setProfile((prev) => ({
      ...prev,
      ...localProfile,
      displayName:
        sharedDisplayName ||
        localProfile.displayName ||
        "",
    }));
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

  try {
    await upsertSharedProfile({
      userId: user.id,
      displayName: profile.displayName,
      photoUrl: profile.photoUrl || null,
    });
  } catch (error) {
    console.error("PROFILE SHARED AUTHORITY SAVE ERROR:", error);
    alert("Profile could not be synced. Please try again.");
    return;
  }

  setSaved(true);
  setTimeout(() => setSaved(false), 2000);
}

  return (
    <main
      className="twincore-profile-shell"
      style={{
        ...shellStyle,
        maxWidth: 920,
        width: "calc(100% - 32px)",
        margin: "0 auto",
        paddingBottom: 180,
      }}
    >
      <PageHeader
        title="Profile"
        action={
          <Link href="/" style={navButtonStyle}>
            ← Dashboard
          </Link>
        }
      />

      <section
        style={{
          margin: "6px 0 24px",
          padding: "4px 2px 0",
        }}
      >
        <div
          style={{
            color: "#67E8F9",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          TwinCore • Profile
        </div>

        <h1
          style={{
            margin: 0,
            color: "white",
            fontSize: 34,
            lineHeight: 1.05,
            fontWeight: 900,
          }}
        >
          This is you.
        </h1>

        <p
          style={{
            margin: "10px 0 0",
            maxWidth: 650,
            color: "#A1A1AA",
            fontSize: 14,
            lineHeight: 1.65,
          }}
        >
          Your identity, your visibility, and the people you trust — all in one place.
        </p>
      </section>

      <ActivityCard
        connected={0}
        location={false}
        ghostMode={profile.ghostMode}
        trustedOnly={profile.trustedOnly}
      />

      <div style={{ margin: "28px 0 10px" }}>
        <div
          style={{
            color: "#F0ABFC",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".14em",
            textTransform: "uppercase",
          }}
        >
          Identity
        </div>
        <h2
          style={{
            margin: "5px 0 0",
            color: "white",
            fontSize: 22,
            fontWeight: 900,
          }}
        >
          This is you
        </h2>
      </div>

      <section
        style={{
          ...cardStyle,
          border: "1px solid rgba(236,72,153,.22)",
          background:
            "linear-gradient(145deg, rgba(236,72,153,.08), rgba(15,23,42,.82))",
          boxShadow: "0 20px 60px rgba(0,0,0,.18)",
        }}
      >
        <label style={labelStyle}>Display Name</label>

        <input
          value={profile.displayName}
          onChange={(e) =>
            setProfile({ ...profile, displayName: e.target.value })
          }
          style={inputStyle}
        />

        <label style={labelStyle}>Your Photo</label>

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
                boxShadow: "0 0 25px rgba(217,70,239,.45)",
              }}
            />
          </div>
        )}

        <label style={labelStyle}>Your Vibe</label>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 18,
          marginTop: 30,
        }}
      >
        <div>
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                color: "#67E8F9",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".14em",
                textTransform: "uppercase",
              }}
            >
              Visibility
            </div>
            <h2
              style={{
                margin: "5px 0 0",
                color: "white",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              How you show up
            </h2>
          </div>

          <section
            style={{
              ...cardStyle,
              height: "100%",
              border: "1px solid rgba(34,211,238,.20)",
              background:
                "linear-gradient(145deg, rgba(34,211,238,.07), rgba(15,23,42,.82))",
            }}
          >
            <label style={labelStyle}>Ghost Mode</label>

            <button
              onClick={() =>
                setProfile({ ...profile, ghostMode: !profile.ghostMode })
              }
              style={primaryButtonStyle}
            >
              {profile.ghostMode ? "Ghost Mode On" : "Ghost Mode Off"}
            </button>

            <label style={labelStyle}>Ghost Mode Label</label>
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
        </div>

        <div>
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                color: "#6EE7B7",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".14em",
                textTransform: "uppercase",
              }}
            >
              Trusted Access
            </div>
            <h2
              style={{
                margin: "5px 0 0",
                color: "white",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              Who can see you
            </h2>
          </div>

          <section
            style={{
              ...cardStyle,
              height: "100%",
              border: "1px solid rgba(52,211,153,.20)",
              background:
                "linear-gradient(145deg, rgba(52,211,153,.07), rgba(15,23,42,.82))",
            }}
          >
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

            <label style={labelStyle}>Your Trusted People</label>
            <input
              value={newTrusted}
              onChange={(e) => setNewTrusted(e.target.value)}
              style={inputStyle}
              placeholder="Add someone you trust"
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
                    gap: 12,
                    marginBottom: 6,
                    color: "white",
                  }}
                >
                  <span>{name}</span>
                  <button onClick={() => removeTrusted(i)}>Remove</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section
        style={{
          marginTop: 30,
          padding: 18,
          borderRadius: 18,
          border: "1px solid rgba(217,70,239,.22)",
          background:
            "linear-gradient(135deg, rgba(217,70,239,.10), rgba(6,182,212,.06))",
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: 17,
            fontWeight: 800,
            marginBottom: 5,
          }}
        >
          Make it yours
        </div>

        <p
          style={{
            margin: "0 0 14px",
            color: "#A1A1AA",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          Save your identity and visibility choices across TwinCore.
        </p>

        <button onClick={saveProfile} style={primaryButtonStyle}>
          Save Profile
        </button>

        {saved && (
          <p style={{ marginTop: 10, color: "#86EFAC" }}>
            Settings saved.
          </p>
        )}
      </section>

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
