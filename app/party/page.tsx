"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Flame,
  Snowflake,
  Music4,
  Pause,
  Play,
  Send,
  IdCard,
  Sparkles,
} from "lucide-react";

const PARTY_STATUSES = [
  "Outside",
  "Drinking",
  "At club",
  "Listening to music",
  "Watching Netflix",
  "Heading home",
  "Safe",
] as const;

type PartyStatus = (typeof PARTY_STATUSES)[number];

const PARTY_AUDIO_SRC = "/party-mode.mp3";

function getStatusVisual(status: PartyStatus | null) {
  switch (status) {
    case "Drinking":
    case "At club":
      return {
        title: "Fire Mode",
        subtitle: "Energy is up. Keep your choices slower than the room.",
        glow: "from-orange-500/35 via-red-500/20 to-transparent",
        ring: "shadow-[0_0_80px_rgba(249,115,22,0.28)]",
        badgeTone:
          "bg-orange-500/15 text-orange-100 shadow-[0_6px_20px_rgba(249,115,22,0.18)]",
      };

    case "Heading home":
    case "Safe":
    case "Watching Netflix":
      return {
        title: "Ice Mode",
        subtitle: "You’re cooling down. Keep it simple, clean, and safe.",
        glow: "from-cyan-400/30 via-blue-500/15 to-transparent",
        ring: "shadow-[0_0_80px_rgba(59,130,246,0.22)]",
        badgeTone:
          "bg-blue-500/15 text-blue-100 shadow-[0_6px_20px_rgba(59,130,246,0.18)]",
      };

    case "Listening to music":
      return {
        title: "Sound Mode",
        subtitle: "Stay in rhythm, but keep awareness higher than the vibe.",
        glow: "from-fuchsia-500/25 via-blue-500/15 to-transparent",
        ring: "shadow-[0_0_80px_rgba(168,85,247,0.20)]",
        badgeTone:
          "bg-fuchsia-500/15 text-fuchsia-100 shadow-[0_6px_20px_rgba(168,85,247,0.18)]",
      };

    default:
      return {
        title: "Balanced Mode",
        subtitle: "Party Mode is on. Keep your signals current and your exits easy.",
        glow: "from-white/10 via-blue-500/10 to-transparent",
        ring: "shadow-[0_0_60px_rgba(255,255,255,0.06)]",
        badgeTone:
          "bg-white/10 text-white/85 shadow-[0_6px_20px_rgba(255,255,255,0.05)]",
      };
  }
}

export default function PartyPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [displayName, setDisplayName] = useState("Neo");
  const [selectedStatus, setSelectedStatus] = useState<PartyStatus | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedName = window.localStorage.getItem("twincore_display_name");
    const savedStatus = window.localStorage.getItem("twincore_party_status");

    if (savedName) setDisplayName(savedName);

    if (
      savedStatus &&
      PARTY_STATUSES.includes(savedStatus as PartyStatus)
    ) {
      setSelectedStatus(savedStatus as PartyStatus);
    } else {
      setSelectedStatus("Listening to music");
      window.localStorage.setItem("twincore_party_status", "Listening to music");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedStatus) return;
    window.localStorage.setItem("twincore_party_status", selectedStatus);
  }, [selectedStatus]);

  const visual = useMemo(
    () => getStatusVisual(selectedStatus),
    [selectedStatus]
  );

  async function handleToggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        return;
      }

      await audio.play();
      setIsPlaying(true);
    } catch {
      setAudioReady(false);
      setIsPlaying(false);
    }
  }

  function handleStatusClick(status: PartyStatus) {
    setSelectedStatus(status);
  }

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white">
      <audio
        ref={audioRef}
        src={PARTY_AUDIO_SRC}
        loop
        preload="auto"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={() => {
          setAudioReady(false);
          setIsPlaying(false);
        }}
      />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.10),transparent_34%)]`}
        />
        <div
          className={`absolute inset-x-0 top-20 mx-auto h-72 w-72 rounded-full blur-3xl bg-gradient-to-br ${visual.glow} ${visual.ring}`}
        />
        <div
          className={`absolute bottom-24 right-[-10%] h-56 w-56 rounded-full blur-3xl bg-gradient-to-br ${visual.glow}`}
        />
      </div>

      <div className="relative mx-auto w-full max-w-md px-4 py-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-xs tracking-[0.3em] text-white/50">
              TwinCore
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Party Mode
            </h1>
          </div>

          <Link
            href="/profile"
            className="rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
          >
            Profile
          </Link>
        </header>

        <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <div className="mb-2 text-4xl leading-none">
            {selectedStatus === "Drinking" || selectedStatus === "At club" ? (
              <Flame className="h-10 w-10 text-orange-400" />
            ) : selectedStatus === "Heading home" ||
              selectedStatus === "Safe" ||
              selectedStatus === "Watching Netflix" ? (
              <Snowflake className="h-10 w-10 text-cyan-300" />
            ) : (
              <Music4 className="h-10 w-10 text-fuchsia-300" />
            )}
          </div>

          <div className="mb-3 text-4xl font-semibold tracking-tight text-white">
            Tonight
          </div>

          <div className="text-2xl font-semibold text-white">{displayName}</div>

          <div className="mt-3 text-lg text-white/80">
            Current status:{" "}
            <span className="font-medium text-white">
              {selectedStatus || "Not set"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide ${visual.badgeTone}`}
            >
              {visual.title}
            </span>

            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/85">
              <Sparkles className="mr-1 h-3 w-3" />
              LIVE
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-white/70">{visual.subtitle}</p>
        </section>

        <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-white">Set Your Status</h2>

            <button
              type="button"
              onClick={handleToggleAudio}
              className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause Sound
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {audioReady ? "Play Sound" : "Sound Unavailable"}
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PARTY_STATUSES.map((status) => {
              const active = selectedStatus === status;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusClick(status)}
                  className={`rounded-2xl px-4 py-5 text-center text-lg font-semibold transition duration-200 active:scale-[0.97] ${
                    active
                      ? "border border-white/80 bg-[linear-gradient(180deg,#24242b,#17171d)] text-white shadow-[0_12px_28px_rgba(255,255,255,0.06)]"
                      : "bg-[linear-gradient(180deg,#17171d,#121218)] text-white/92 shadow-[0_8px_24px_rgba(0,0,0,0.32)] hover:scale-[1.02]"
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <h2 className="mb-4 text-2xl font-semibold text-white">Quick Actions</h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-5 text-center text-lg font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
            >
              <Send className="h-5 w-5" />
              Send Check-In
            </button>

            <Link
              href="/contact-card"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-5 text-center text-lg font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
            >
              <IdCard className="h-5 w-5" />
              Share Contact Card
            </Link>
          </div>
        </section>

        <nav className="grid grid-cols-3 gap-3">
          <Link
            href="/"
            className="rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-4 text-center text-base font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
          >
            Home
          </Link>

          <Link
            href="/crew"
            className="rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-4 text-center text-base font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
          >
            Crew
          </Link>

          <Link
            href="/profile"
            className="rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-4 text-center text-base font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
          >
            Profile
          </Link>
        </nav>
      </div>
    </main>
  );
}
