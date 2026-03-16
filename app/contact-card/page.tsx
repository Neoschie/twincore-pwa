"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  PageHeader,
  cardStyle,
  colors,
  gridFourStyle,
  navButtonStyle,
  secondaryButtonStyle,
  shellStyle,
  sectionHeadingStyle,
} from "@/components/twincore-ui";

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
  const [shareUrl, setShareUrl] = useState("https://twincore.co/join");

  useEffect(() => {
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

  useEffect(() => {
    const nextUrl = crewCode
      ? `https://twincore.co/join?code=${crewCode}`
      : `https://twincore.co/join`;

    setShareUrl(nextUrl);
  }, [crewCode]);

  const qrValue = useMemo(() => shareUrl, [shareUrl]);

  function shareCard() {
    alert("TwinCore Contact Card ready to share.");
  }

  function copyJoinLink() {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => alert("Join link copied."))
      .catch(() => alert("Could not copy join link."));
  }

  return (
    <main style={shellStyle}>
      <PageHeader
        title="Contact Card"
        action={
          <Link href="/profile" style={navButtonStyle}>
            Profile
          </Link>
        }
      />

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>
          {profile.displayName || "Your Name"}
        </h2>

        <p style={{ color: colors.muted, marginTop: 0, marginBottom: 14 }}>
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
        <h3 style={sectionHeadingStyle}>Join Link</h3>

        <div
          style={{
            background: "#18181B",
            border: "1px solid #27272A",
            borderRadius: 14,
            padding: 12,
            marginBottom: 14,
            color: colors.soft,
            wordBreak: "break-all",
          }}
        >
          {shareUrl}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={shareCard} style={secondaryButtonStyle}>
            Share Card
          </button>

          <button onClick={copyJoinLink} style={secondaryButtonStyle}>
            Copy Join Link
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={sectionHeadingStyle}>Scan to Join</h3>

        <p style={{ color: colors.muted, marginBottom: 12 }}>
          This QR should open the exact URL shown below it.
        </p>

        <div
          style={{
            background: "white",
            padding: 16,
            borderRadius: 14,
            width: "fit-content",
            marginBottom: 12,
          }}
        >
          <QRCodeCanvas value={qrValue} size={220} />
        </div>

        <div
          style={{
            background: "#18181B",
            border: "1px solid #27272A",
            borderRadius: 14,
            padding: 12,
            color: colors.soft,
            wordBreak: "break-all",
            fontSize: 13,
          }}
        >
          QR value: {qrValue}
        </div>
      </section>

      <div style={gridFourStyle}>
        <Link href="/" style={navButtonStyle}>
          Home
        </Link>

        <Link href="/crew" style={navButtonStyle}>
          Crew
        </Link>

        <Link href="/party" style={navButtonStyle}>
          Party
        </Link>

        <Link href="/profile" style={navButtonStyle}>
          Profile
        </Link>
      </div>
    </main>
  );
}
