"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PageHeader,
  cardStyle,
  colors,
  gridFourStyle,
  navButtonStyle,
  primaryButtonStyle,
  shellStyle,
  sectionHeadingStyle,
} from "@/components/twincore-ui";

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
    <main style={shellStyle}>
      <PageHeader
        title="Join Crew"
        action={
          <Link href="/" style={navButtonStyle}>
            Home
          </Link>
        }
      />

      <section style={cardStyle}>
        <h2 style={{ ...sectionHeadingStyle, marginBottom: 10 }}>Crew Invite</h2>

        <div style={{ lineHeight: 1.9, color: colors.soft }}>
          <div>
            <strong>Your name:</strong> {displayName}
          </div>
          <div>
            <strong>Crew code:</strong> {crewCode || "No code found"}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: 12 }}>Join</h3>

        <div style={{ lineHeight: 1.9, color: colors.soft }}>
          <div>• Join this TwinCore crew</div>
          <div>• Save the crew code locally</div>
          <div>• Use Party Mode with this crew later</div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={joinCrew} style={primaryButtonStyle}>
            Join This Crew
          </button>
        </div>
      </section>

      {statusMessage && (
        <p style={{ marginTop: 14, color: colors.success }}>{statusMessage}</p>
      )}

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
        <Link href="/contact-card" style={navButtonStyle}>
          Contact Card
        </Link>
      </div>
    </main>
  );
}