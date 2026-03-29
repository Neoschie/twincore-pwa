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
  ShieldAlert,
  Waves,
  Users,
  LocateFixed,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Radar,
  Square,
  Ghost,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "twincore_profile";
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

type VisualMode = {
  mode: "fire" | "ice" | "sound" | "balanced";
  title: string;
  subtitle: string;
  heroGlow: string;
  orbGlow: string;
  ring: string;
  card: string;
  badge: string;
  energyValue: number;
  riskValue: number;
  awarenessValue: number;
  twinTip: string;
};

type SyncState = "idle" | "syncing" | "synced" | "error";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type PrivacySettings = {
  ghostMode: boolean;
  ghostLabel: string;
  blurPresence: boolean;
  trustedOnly: boolean;
  trustedList: string[];
};

const defaultPrivacy: PrivacySettings = {
  ghostMode: false,
  ghostLabel: "Low Visibility",
  blurPresence: true,
  trustedOnly: false,
  trustedList: [],
};

function getStatusVisual(status: PartyStatus | null): VisualMode {
  switch (status) {
    case "Drinking":
    case "At club":
      return {
        mode: "fire",
        title: "Fire Mode",
        subtitle: "Energy is up. Keep your choices slower than the room.",
        heroGlow:
          "bg-[radial-gradient(circle,rgba(249,115,22,0.48)_0%,rgba(239,68,68,0.24)_35%,rgba(0,0,0,0)_72%)]",
        orbGlow:
          "bg-[radial-gradient(circle,rgba(249,115,22,0.35)_0%,rgba(239,68,68,0.18)_35%,rgba(0,0,0,0)_72%)]",
        ring: "shadow-[0_0_100px_rgba(249,115,22,0.30)]",
        card:
          "border border-orange-500/20 bg-[linear-gradient(180deg,#24150f,#110c08)]",
        badge:
          "bg-orange-500/15 text-orange-100 shadow-[0_6px_20px_rgba(249,115,22,0.18)]",
        energyValue: 88,
        riskValue: 72,
        awarenessValue: 64,
        twinTip:
          "Energy is high. Stay with your people and slow your next decision down.",
      };

    case "Heading home":
    case "Safe":
    case "Watching Netflix":
      return {
        mode: "ice",
        title: "Ice Mode",
        subtitle: "You’re cooling down. Keep it simple, clean, and safe.",
        heroGlow:
          "bg-[radial-gradient(circle,rgba(56,189,248,0.42)_0%,rgba(59,130,246,0.20)_35%,rgba(0,0,0,0)_72%)]",
        orbGlow:
          "bg-[radial-gradient(circle,rgba(56,189,248,0.28)_0%,rgba(59,130,246,0.14)_35%,rgba(0,0,0,0)_72%)]",
        ring: "shadow-[0_0_100px_rgba(56,189,248,0.24)]",
        card:
          "border border-cyan-400/20 bg-[linear-gradient(180deg,#0f1b24,#081017)]",
        badge:
          "bg-blue-500/15 text-blue-100 shadow-[0_6px_20px_rgba(59,130,246,0.18)]",
        energyValue: 34,
        riskValue: 18,
        awarenessValue: 90,
        twinTip:
          "This is the cleanest phase of the night. Confirm your safety and keep your exit simple.",
      };

    case "Listening to music":
      return {
        mode: "sound",
        title: "Sound Mode",
        subtitle: "Stay in rhythm, but keep awareness higher than the vibe.",
        heroGlow:
          "bg-[radial-gradient(circle,rgba(168,85,247,0.34)_0%,rgba(59,130,246,0.18)_35%,rgba(0,0,0,0)_72%)]",
        orbGlow:
          "bg-[radial-gradient(circle,rgba(168,85,247,0.24)_0%,rgba(59,130,246,0.12)_35%,rgba(0,0,0,0)_72%)]",
        ring: "shadow-[0_0_100px_rgba(168,85,247,0.22)]",
        card:
          "border border-fuchsia-500/20 bg-[linear-gradient(180deg,#1b1326,#0d0b16)]",
        badge:
          "bg-fuchsia-500/15 text-fuchsia-100 shadow-[0_6px_20px_rgba(168,85,247,0.18)]",
        energyValue: 62,
        riskValue: 36,
        awarenessValue: 74,
        twinTip:
          "Good vibe zone. Don’t get pulled into drift just because the room feels good.",
      };

    default:
      return {
        mode: "balanced",
        title: "Balanced Mode",
        subtitle: "Party Mode is on. Keep your signals current and your exits easy.",
        heroGlow:
          "bg-[radial-gradient(circle,rgba(255,255,255,0.10)_0%,rgba(59,130,246,0.10)_35%,rgba(0,0,0,0)_72%)]",
        orbGlow:
          "bg-[radial-gradient(circle,rgba(255,255,255,0.08)_0%,rgba(59,130,246,0.08)_35%,rgba(0,0,0,0)_72%)]",
        ring: "shadow-[0_0_70px_rgba(255,255,255,0.08)]",
        card:
          "border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)]",
        badge:
          "bg-white/10 text-white/85 shadow-[0_6px_20px_rgba(255,255,255,0.05)]",
        energyValue: 50,
        riskValue: 28,
        awarenessValue: 78,
        twinTip:
          "You’re steady. Keep your signals updated before the night speeds up.",
      };
  }
}

function getModeIcon(status: PartyStatus | null) {
  if (status === "Drinking" || status === "At club") {
    return <Flame className="h-10 w-10 text-orange-400" />;
  }

  if (
    status === "Heading home" ||
    status === "Safe" ||
    status === "Watching Netflix"
  ) {
    return <Snowflake className="h-10 w-10 text-cyan-300" />;
  }

  return <Music4 className="h-10 w-10 text-fuchsia-300" />;
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
          {label}
        </span>
        <span className="text-sm font-semibold text-white">{value}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white/80 transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function getHeartbeatForStatus(status: PartyStatus | null) {
  switch (status) {
    case "Drinking":
      return 102;
    case "At club":
      return 108;
    case "Listening to music":
      return 86;
    case "Outside":
      return 78;
    case "Heading home":
      return 72;
    case "Safe":
      return 68;
    case "Watching Netflix":
      return 64;
    default:
      return 74;
  }
}

function getMoodForStatus(status: PartyStatus | null) {
  switch (status) {
    case "Drinking":
    case "At club":
      return "lit";
    case "Listening to music":
      return "in rhythm";
    case "Heading home":
      return "winding down";
    case "Safe":
      return "safe";
    case "Watching Netflix":
      return "chill";
    case "Outside":
      return "out";
    default:
      return "steady";
  }
}

function getVibeLabelForStatus(status: PartyStatus | null) {
  switch (status) {
    case "Drinking":
      return "Energy high";
    case "At club":
      return "Crowd active";
    case "Listening to music":
      return "Sound locked";
    case "Heading home":
      return "Exit flow";
    case "Safe":
      return "Stable";
    case "Watching Netflix":
      return "Cooling down";
    case "Outside":
      return "Moving";
    default:
      return "Party active";
  }
}

function getFriendlyLocationName(coords: Coordinates) {
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
}

function getCrewStatusId() {
  const existing = window.localStorage.getItem("twincore_crew_status_id");
  if (existing) return existing;

  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `crew-${Date.now()}`;

  window.localStorage.setItem("twincore_crew_status_id", created);
  return created;
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Live sync failed. Check location access and Supabase permissions.";
}

function roundCoordinate(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getPrivacySettings(): PrivacySettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrivacy;

    const parsed = JSON.parse(raw) as Partial<PrivacySettings>;
    return {
      ghostMode: parsed.ghostMode ?? false,
      ghostLabel: parsed.ghostLabel || "Low Visibility",
      blurPresence: parsed.blurPresence ?? true,
      trustedOnly: parsed.trustedOnly ?? false,
      trustedList: Array.isArray(parsed.trustedList) ? parsed.trustedList : [],
    };
  } catch {
    return defaultPrivacy;
  }
}

async function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          reject(new Error("Location access was denied."));
          return;
        }

        if (geoError.code === geoError.TIMEOUT) {
          reject(new Error("Location request timed out."));
          return;
        }

        reject(new Error("Location access is off. Turn it on for live sync."));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 12000,
      }
    );
  });
}

export default function PartyPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firstSyncSkippedRef = useRef(false);
  const trackingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [displayName, setDisplayName] = useState("Neo");
  const [selectedStatus, setSelectedStatus] = useState<PartyStatus | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [checkInSent, setCheckInSent] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMessage, setSyncMessage] = useState("Ready to sync");
  const [lastCoords, setLastCoords] = useState<Coordinates | null>(null);
  const [autoTracking, setAutoTracking] = useState(false);
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacy);

  useEffect(() => {
    const savedName = window.localStorage.getItem("twincore_display_name");
    const savedStatus = window.localStorage.getItem("twincore_party_status");
    const savedLocation = window.localStorage.getItem("twincore_last_shared_location");
    const savedAutoTracking =
      window.localStorage.getItem("twincore_party_auto_tracking") === "true";

    if (savedName) {
      setDisplayName(savedName);
    }

    if (savedStatus && PARTY_STATUSES.includes(savedStatus as PartyStatus)) {
      setSelectedStatus(savedStatus as PartyStatus);
    } else {
      setSelectedStatus("Listening to music");
      window.localStorage.setItem("twincore_party_status", "Listening to music");
    }

    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation) as {
          latitude?: number;
          longitude?: number;
        };

        if (
          typeof parsed.latitude === "number" &&
          typeof parsed.longitude === "number"
        ) {
          setLastCoords({
            latitude: parsed.latitude,
            longitude: parsed.longitude,
          });
        }
      } catch {
        // ignore bad local cache
      }
    }

    if (savedAutoTracking) {
      setAutoTracking(true);
    }

    setPrivacy(getPrivacySettings());

    const onStorage = () => {
      setPrivacy(getPrivacySettings());
      const nextName = window.localStorage.getItem("twincore_display_name");
      if (nextName) setDisplayName(nextName);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!selectedStatus) return;
    window.localStorage.setItem("twincore_party_status", selectedStatus);
  }, [selectedStatus]);

  useEffect(() => {
    window.localStorage.setItem(
      "twincore_party_auto_tracking",
      autoTracking ? "true" : "false"
    );
  }, [autoTracking]);

  useEffect(() => {
    if (!isPlaying) {
      setPulse(false);
      return;
    }

    const interval = window.setInterval(() => {
      setPulse((prev) => !prev);
    }, 900);

    return () => {
      window.clearInterval(interval);
    };
  }, [isPlaying]);

  async function syncCrewStatus(
    status: PartyStatus,
    trigger: "status" | "checkin" | "tracking"
  ) {
    try {
      setSyncState("syncing");
      setSyncMessage(
        trigger === "checkin"
          ? "Sending live check-in..."
          : trigger === "tracking"
          ? "Tracking live movement..."
          : "Syncing live status..."
      );

      const coords = await getCurrentCoordinates();
      setLastCoords(coords);

      const exactMapsUrl = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
      const exactLocationName = getFriendlyLocationName(coords);

      window.localStorage.setItem(
        "twincore_last_shared_location",
        JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: new Date().toISOString(),
          mapsUrl: exactMapsUrl,
        })
      );

      const rowId = getCrewStatusId();

      const payloadLatitude =
        privacy.ghostMode && privacy.blurPresence
          ? roundCoordinate(coords.latitude, 2)
          : coords.latitude;

      const payloadLongitude =
        privacy.ghostMode && privacy.blurPresence
          ? roundCoordinate(coords.longitude, 2)
          : coords.longitude;

      const payloadLocationName = privacy.trustedOnly
        ? "Trusted Crew Only"
        : privacy.ghostMode
        ? privacy.ghostLabel || "Low Visibility"
        : exactLocationName;

      const payloadLocation =
        privacy.trustedOnly || (privacy.ghostMode && privacy.blurPresence)
          ? null
          : exactMapsUrl;

      const payloadVibe = privacy.ghostMode
        ? privacy.ghostLabel || "Low Visibility"
        : getVibeLabelForStatus(status);

      const payloadMood = privacy.ghostMode ? "ghost" : getMoodForStatus(status);

      const payload = {
        id: rowId,
        name: displayName,
        status,
        latitude: payloadLatitude,
        longitude: payloadLongitude,
        location_name: payloadLocationName,
        location: payloadLocation,
        heartbeat_bpm: getHeartbeatForStatus(status),
        vibe_label: payloadVibe,
        mood: payloadMood,
      };

      const { error } = await supabase
        .from("crew_status")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        throw new Error(error.message || "Supabase write failed.");
      }

      const checkInPayload = {
        status,
        timestamp: new Date().toISOString(),
        source: trigger === "tracking" ? "party-auto-tracking" : "party-mode",
        latitude: coords.latitude,
        longitude: coords.longitude,
        mapsUrl: exactMapsUrl,
      };

      window.localStorage.setItem(
        "twincore_party_checkin",
        JSON.stringify(checkInPayload)
      );

      setSyncState("synced");
      setSyncMessage(
        trigger === "checkin"
          ? "Check-in sent live to crew"
          : trigger === "tracking"
          ? "Live tracking updated"
          : "Party status synced live"
      );

      window.setTimeout(() => {
        setSyncState("idle");
        setSyncMessage(autoTracking ? "Auto tracking active" : "Ready to sync");
      }, 2200);
    } catch (error: unknown) {
      setSyncState("error");
      setSyncMessage(normalizeErrorMessage(error));
    }
  }

  function stopAutoTracking() {
    setAutoTracking(false);

    if (trackingRef.current) {
      clearInterval(trackingRef.current);
      trackingRef.current = null;
    }

    setSyncState("idle");
    setSyncMessage("Auto tracking stopped");
  }

  function startAutoTracking() {
    if (!selectedStatus) return;

    if (trackingRef.current) {
      clearInterval(trackingRef.current);
      trackingRef.current = null;
    }

    setAutoTracking(true);
    setSyncState("syncing");
    setSyncMessage("Starting auto tracking...");

    void syncCrewStatus(selectedStatus, "tracking");

    trackingRef.current = setInterval(() => {
      if (!selectedStatus) return;
      void syncCrewStatus(selectedStatus, "tracking");
    }, 12000);
  }

  useEffect(() => {
    if (!selectedStatus) return;

    if (!firstSyncSkippedRef.current) {
      firstSyncSkippedRef.current = true;
      return;
    }

    void syncCrewStatus(selectedStatus, "status");
  }, [selectedStatus]);

  useEffect(() => {
    if (!selectedStatus) return;

    if (autoTracking) {
      if (trackingRef.current) {
        clearInterval(trackingRef.current);
        trackingRef.current = null;
      }

      trackingRef.current = setInterval(() => {
        void syncCrewStatus(selectedStatus, "tracking");
      }, 12000);

      void syncCrewStatus(selectedStatus, "tracking");
      setSyncMessage("Auto tracking active");
    }

    return () => {
      if (trackingRef.current) {
        clearInterval(trackingRef.current);
        trackingRef.current = null;
      }
    };
  }, [autoTracking, selectedStatus, privacy]);

  useEffect(() => {
    return () => {
      if (trackingRef.current) {
        clearInterval(trackingRef.current);
        trackingRef.current = null;
      }
    };
  }, []);

  const visual = useMemo(() => getStatusVisual(selectedStatus), [selectedStatus]);

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
      setAudioReady(true);
      setIsPlaying(true);
    } catch {
      setAudioReady(false);
      setIsPlaying(false);
    }
  }

  function handleStatusClick(status: PartyStatus) {
    setSelectedStatus(status);
  }

  async function handleSendCheckIn() {
    const currentStatus = selectedStatus ?? "Listening to music";
    setCheckInSent(true);
    await syncCrewStatus(currentStatus, "checkin");

    window.setTimeout(() => {
      setCheckInSent(false);
    }, 2200);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0A0A0B] text-white">
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.10),transparent_34%)]" />

        <div
          className={`absolute left-1/2 top-20 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full blur-3xl ${visual.heroGlow} ${visual.ring} transition-all duration-500 ${
            pulse ? "scale-110 opacity-100" : "scale-100 opacity-85"
          }`}
        />

        <div
          className={`absolute bottom-24 right-[-10%] h-64 w-64 rounded-full blur-3xl ${visual.orbGlow} ${
            pulse ? "animate-pulse" : ""
          }`}
        />
        <div
          className={`absolute bottom-40 left-[-10%] h-56 w-56 rounded-full blur-3xl ${visual.orbGlow} ${
            pulse ? "animate-pulse" : ""
          }`}
        />

        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:26px_26px]" />
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
            <p className="mt-2 text-sm text-white/60">
              Live awareness for nights, movement, and exits.
            </p>
          </div>

          <Link
            href="/profile"
            className="rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
          >
            Profile
          </Link>
        </header>

        <section
          className={`relative mb-6 overflow-hidden rounded-3xl p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)] ${visual.card}`}
        >
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/5 blur-3xl" />

          <div className="relative">
            <div className="mb-2 text-4xl leading-none">{getModeIcon(selectedStatus)}</div>

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
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide ${visual.badge}`}
              >
                {visual.title}
              </span>

              {privacy.ghostMode ? (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/85">
                  <Ghost className="mr-1 h-3 w-3" />
                  GHOST MODE
                </span>
              ) : null}

              {privacy.trustedOnly ? (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/85">
                  <EyeOff className="mr-1 h-3 w-3" />
                  TRUSTED ONLY
                </span>
              ) : null}

              {autoTracking ? (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/85">
                  <Radar className="mr-1 h-3 w-3" />
                  AUTO TRACKING
                </span>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-6 text-white/70">{visual.subtitle}</p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Meter label="Energy" value={visual.energyValue} />
              <Meter label="Risk" value={visual.riskValue} />
              <Meter label="Awareness" value={visual.awarenessValue} />
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Live Crew Sync</h2>
              <p className="mt-1 text-sm text-white/60">
                Privacy settings now affect what gets written to the live layer.
              </p>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              syncState === "synced"
                ? "border-emerald-500/20 bg-emerald-500/10"
                : syncState === "error"
                ? "border-red-500/20 bg-red-500/10"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white/85">
              {syncState === "syncing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : syncState === "synced" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              ) : syncState === "error" ? (
                <AlertTriangle className="h-4 w-4 text-red-300" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              {syncMessage}
            </div>

            <div className="space-y-1 text-sm text-white/70">
              <p>
                Last live point:{" "}
                {lastCoords
                  ? `${lastCoords.latitude.toFixed(5)}, ${lastCoords.longitude.toFixed(5)}`
                  : "No location yet"}
              </p>
              <p>Ghost Mode: {privacy.ghostMode ? "On" : "Off"}</p>
              <p>Trusted Only: {privacy.trustedOnly ? "On" : "Off"}</p>
            </div>
          </div>
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
              onClick={handleSendCheckIn}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-5 text-center text-lg font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
            >
              <Send className="h-5 w-5" />
              {checkInSent ? "Check-In Sent" : "Send Check-In"}
            </button>

            <button
              type="button"
              onClick={() => {
                if (autoTracking) {
                  stopAutoTracking();
                } else {
                  startAutoTracking();
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-5 text-center text-lg font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
            >
              {autoTracking ? (
                <>
                  <Square className="h-5 w-5" />
                  Stop Tracking
                </>
              ) : (
                <>
                  <Radar className="h-5 w-5" />
                  Start Tracking
                </>
              )}
            </button>

            <Link
              href="/contact-card"
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-5 text-center text-lg font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
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