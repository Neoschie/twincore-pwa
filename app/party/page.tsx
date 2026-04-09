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
  Users,
  LocateFixed,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Radar,
  Ghost,
  EyeOff,
  MapPin,
  Sparkles,
  Volume2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
const STORAGE_KEY = "twincore_profile";
const PARTY_AUDIO_SRC = "/party-mode.mp3";
const JOINED_CREW_KEY = "twincore_joined_crew";
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
type CrewStatusRow = {
  id: string;
  name: string;
  status: string | null;
  updated_at?: string | null;
};

type CrewMemberRow = {
  crew_owner: string;
  member_name: string;
};

type JoinedCrewStorage = {
  crewOwner?: string;
  memberName?: string;
  inviteCode?: string;
  joinedAt?: string;
};
type CrewDesyncState = {
  level: "aligned" | "watch" | "separated";
  message: string;
  activeCount: number;
  differentCount: number;
};
type IsolationState = {
  level: "connected" | "isolated";
  message: string;
};
type StaleState = {
  level: "fresh" | "stale";
  message: string;
};
type PredictiveRisk = {
  level: "stable" | "rising" | "high";
  message: string;
};
type Intervention = {
  actions: string[];
  level: "none" | "suggest" | "urgent";
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
        subtitle:
          "Party Mode is on. Keep your signals current and your exits easy.",
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
function getJoinedCrew(): JoinedCrewStorage {
  try {
    const raw = window.localStorage.getItem(JOINED_CREW_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as JoinedCrewStorage;
  } catch {
    return {};
  }
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
function isHighEnergyStatus(status: string | null | undefined) {
  return status === "Drinking" || status === "At club";
}
function isAwayFromCrewStatus(status: string | null | undefined) {
  return (
    status === "Outside" ||
    status === "Heading home" ||
    status === "Safe" ||
    status === "Watching Netflix"
  );
}
function getCrewDesyncState(
  selfStatus: PartyStatus | null,
  crewRows: CrewStatusRow[]
): CrewDesyncState {
  if (!selfStatus || crewRows.length === 0) {
    return {
      level: "aligned",
      message: "No meaningful crew desync signal yet.",
      activeCount: 0,
      differentCount: 0,
    };
  }
  const crewHighEnergy = crewRows.filter((row) => isHighEnergyStatus(row.status));
  const crewAway = crewRows.filter((row) => isAwayFromCrewStatus(row.status));
  if (crewHighEnergy.length >= 1 && isAwayFromCrewStatus(selfStatus)) {
    return {
      level: "separated",
      message:
        "Your crew is still in a high-energy state while you have shifted away from that flow.",
      activeCount: crewHighEnergy.length,
      differentCount: crewHighEnergy.length,
    };
  }
  if (crewAway.length >= 1 && isHighEnergyStatus(selfStatus)) {
    return {
      level: "watch",
      message:
        "You are still in a high-energy state while part of your crew has shifted out of it.",
      activeCount: crewAway.length,
      differentCount: crewAway.length,
    };
  }
  if (crewHighEnergy.length >= 2 && selfStatus === "Listening to music") {
    return {
      level: "watch",
      message:
        "Your crew energy is climbing faster than your current state. Stay aware of where the group is moving.",
      activeCount: crewHighEnergy.length,
      differentCount: crewHighEnergy.length,
    };
  }
  return {
    level: "aligned",
    message: "You look reasonably aligned with your crew’s current state.",
    activeCount: crewHighEnergy.length,
    differentCount: 0,
  };
}
function getIsolationState(crewRows: CrewStatusRow[]): IsolationState {
  if (crewRows.length === 0) {
    return {
      level: "isolated",
      message:
        "No active crew detected. You are currently moving without a support layer.",
    };
  }
  return {
    level: "connected",
    message: "Crew presence detected.",
  };
}
function getStaleState(crewRows: CrewStatusRow[]): StaleState {
  if (crewRows.length === 0) {
    return {
      level: "fresh",
      message: "No crew data yet.",
    };
  }
  const now = Date.now();
  const staleCount = crewRows.filter((row) => {
    if (!row.updated_at) return true;
    const last = new Date(row.updated_at).getTime();
    return now - last > 60000;
  });
  if (staleCount.length >= crewRows.length) {
    return {
      level: "stale",
      message: "Crew signals are outdated. Do not rely on current crew state.",
    };
  }
  return {
    level: "fresh",
    message: "Crew signals are active.",
  };
}
function getPredictiveRisk(
  bpm: number,
  desync: CrewDesyncState,
  isolation: IsolationState,
  stale: StaleState
): PredictiveRisk {
  let score = 0;
  if (bpm >= 110) score += 2;
  else if (bpm >= 100) score += 1;
  if (desync.level === "watch") score += 1;
  if (desync.level === "separated") score += 2;
  if (isolation.level === "isolated") score += 2;
  if (stale.level === "stale") score += 2;
  if (score >= 5) {
    return {
      level: "high",
      message:
        "Your situation is trending toward high risk. Slow down and reassess immediately.",
    };
  }
  if (score >= 3) {
    return {
      level: "rising",
      message:
        "Your state is starting to shift. Stay intentional and stabilize early.",
    };
  }
  return {
    level: "stable",
    message: "You are stable. Keep your awareness active.",
  };
}
function getIntervention(
  risk: PredictiveRisk,
  desync: CrewDesyncState,
  isolation: IsolationState
): Intervention {
  const actions: string[] = [];
  if (risk.level === "high") {
    actions.push("Slow down immediately");
    actions.push("Move to a safer environment");
  }
  if (desync.level === "separated") {
    actions.push("Reconnect with your crew");
  }
  if (isolation.level === "isolated") {
    actions.push("Share your location or check in");
  }
  if (risk.level === "high") {
    actions.push("Consider calling a ride");
  }
  return {
    actions,
    level:
      risk.level === "high"
        ? "urgent"
        : actions.length > 0
          ? "suggest"
          : "none",
  };
}
export default function PartyPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firstSyncSkippedRef = useRef(false);
  const trackingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoVoiceLastLabelRef = useRef("idle");
  const autoVoiceLastSpokenAtRef = useRef(0);
  const [displayName, setDisplayName] = useState("Neo");
  const [crewOwner, setCrewOwner] = useState("");
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
  const [partyActive, setPartyActive] = useState(false);
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(true);
  const [crewRows, setCrewRows] = useState<CrewStatusRow[]>([]);
  const [crewDesync, setCrewDesync] = useState<CrewDesyncState>({
    level: "aligned",
    message: "No meaningful crew desync signal yet.",
    activeCount: 0,
    differentCount: 0,
  });
  const [isolation, setIsolation] = useState<IsolationState>({
    level: "connected",
    message: "You are connected to your crew.",
  });
  const [stale, setStale] = useState<StaleState>({
    level: "fresh",
    message: "Crew signals are active.",
  });
  const [risk, setRisk] = useState<PredictiveRisk>({
    level: "stable",
    message: "You are stable. Keep your awareness active.",
  });
  const [intervention, setIntervention] = useState<Intervention>({
    actions: [],
    level: "none",
  });
  useEffect(() => {
    const savedName = window.localStorage.getItem("twincore_display_name");
    const savedStatus = window.localStorage.getItem("twincore_party_status");
    const savedLocation = window.localStorage.getItem(
      "twincore_last_shared_location"
    );
    const savedAutoTracking =
      window.localStorage.getItem("twincore_party_auto_tracking") === "true";
    const savedPartyActive =
      window.localStorage.getItem("twincore_party_active") === "true";
    if (savedName) {
      setDisplayName(savedName);
    }

    const joinedCrew = getJoinedCrew();
    if (joinedCrew.crewOwner?.trim()) {
      setCrewOwner(joinedCrew.crewOwner.trim());
    } else if (savedName) {
      setCrewOwner(savedName);
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
        // ignore bad cache
      }
    }
    if (savedAutoTracking) {
      setAutoTracking(true);
    }
    if (savedPartyActive) {
      setPartyActive(true);
    }
    setPrivacy(getPrivacySettings());
    const onStorage = () => {
      setPrivacy(getPrivacySettings());
      const nextName = window.localStorage.getItem("twincore_display_name");
      if (nextName) setDisplayName(nextName);

      const nextJoinedCrew = getJoinedCrew();
      if (nextJoinedCrew.crewOwner?.trim()) {
        setCrewOwner(nextJoinedCrew.crewOwner.trim());
      } else if (nextName) {
        setCrewOwner(nextName);
      }
      const nextStatus = window.localStorage.getItem("twincore_party_status");
      if (nextStatus && PARTY_STATUSES.includes(nextStatus as PartyStatus)) {
        setSelectedStatus(nextStatus as PartyStatus);
      }
      const nextPartyActive =
        window.localStorage.getItem("twincore_party_active") === "true";
      setPartyActive(nextPartyActive);
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
    window.localStorage.setItem(
      "twincore_party_active",
      partyActive ? "true" : "false"
    );
  }, [partyActive]);
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
  function writePartyLiveState(
    status: PartyStatus,
    coords: Coordinates | null,
    source: "status" | "checkin" | "tracking" | "toggle" | "bootstrap",
    activeOverride?: boolean
  ) {
    const active = activeOverride ?? partyActive;
    const liveState = {
      active,
      status,
      source,
      timestamp: new Date().toISOString(),
      autoTracking,
      ghostMode: privacy.ghostMode,
      trustedOnly: privacy.trustedOnly,
      vibeLabel: privacy.ghostMode
        ? privacy.ghostLabel || "Low Visibility"
        : getVibeLabelForStatus(status),
      mood: privacy.ghostMode ? "ghost" : getMoodForStatus(status),
      heartbeatBpm: getHeartbeatForStatus(status),
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    };
    window.localStorage.setItem("twincore_party_live", JSON.stringify(liveState));
    window.localStorage.setItem("twincore_party_status", status);
    window.localStorage.setItem(
      "twincore_party_active",
      active ? "true" : "false"
    );
  }
  async function syncCrewStatus(
    status: PartyStatus,
    trigger: "status" | "checkin" | "tracking" | "toggle",
    activeOverride?: boolean
  ) {
    const active = activeOverride ?? partyActive;
    try {
      setSyncState("syncing");
      setSyncMessage(
        trigger === "checkin"
          ? "Sending live check-in..."
          : trigger === "tracking"
            ? "Tracking live movement..."
            : trigger === "toggle"
              ? active
                ? "Turning Party Mode on..."
                : "Turning Party Mode off..."
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
      writePartyLiveState(status, coords, trigger, active);
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }
      const rowIdFromStorage = getCrewStatusId();
      const { data: existingByName, error: lookupError } = await supabase
        .from("crew_status")
        .select("id,name")
        .eq("name", displayName)
        .maybeSingle();
      if (lookupError) {
        throw new Error(lookupError.message || "Could not look up crew row.");
      }
      const rowId =
        ((existingByName as { id?: string } | null)?.id as string | undefined) ||
        rowIdFromStorage;
      if (rowId !== rowIdFromStorage) {
        window.localStorage.setItem("twincore_crew_status_id", rowId);
      }
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
      const payloadVibe = privacy.ghostMode
        ? privacy.ghostLabel || "Low Visibility"
        : getVibeLabelForStatus(status);
      const payloadMood = privacy.ghostMode ? "ghost" : getMoodForStatus(status);
      const payload = {
        id: rowId,
        name: displayName,
        status: active ? status : "Safe",
        latitude: payloadLatitude,
        longitude: payloadLongitude,
        location_name: payloadLocationName,
        heartbeat_bpm: active ? getHeartbeatForStatus(status) : 68,
        vibe_label: active ? payloadVibe : "Party off",
        mood: active ? payloadMood : "safe",
      };
      const { error } = await supabase
        .from("crew_status")
        .upsert(payload, { onConflict: "id" });
      if (error) {
        throw new Error(error.message || "Supabase write failed.");
      }
      const checkInPayload = {
        active,
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
            : trigger === "toggle"
              ? active
                ? "Party Mode is live"
                : "Party Mode powered down"
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
  async function loadCrewRowsForAwareness() {
    if (!supabase || !displayName) return [] as CrewStatusRow[];

    const joined = getJoinedCrew();
    const owner = joined.crewOwner?.trim() || crewOwner || displayName;

    const memberNames = new Set<string>();
    memberNames.add(owner);

    const { data: memberRows, error: memberError } = await supabase
      .from("crew_members")
      .select("crew_owner, member_name")
      .eq("crew_owner", owner);

    if (memberError) {
      throw new Error(memberError.message || "Unable to load crew members.");
    }

    (Array.isArray(memberRows) ? (memberRows as CrewMemberRow[]) : []).forEach((row) => {
      if (row.member_name?.trim()) {
        memberNames.add(row.member_name.trim());
      }
    });

    const namesToLoad = Array.from(memberNames).filter((name) => name !== displayName);

    if (!namesToLoad.length) {
      return [];
    }

    const { data: statusRows, error: statusError } = await supabase
      .from("crew_status")
      .select("id,name,status,updated_at")
      .in("name", namesToLoad);

    if (statusError) {
      throw new Error(statusError.message || "Unable to load crew status.");
    }

    return (Array.isArray(statusRows) ? statusRows : []) as CrewStatusRow[];
  }

  async function refreshCrewAwareness() {
    if (!supabase) return;
    if (!displayName || !selectedStatus) return;

    try {
      const rows = await loadCrewRowsForAwareness();

      const nextDesync = getCrewDesyncState(selectedStatus, rows);
      const nextIsolation = getIsolationState(rows);
      const nextStale = getStaleState(rows);
      const nextRisk = getPredictiveRisk(
        getHeartbeatForStatus(selectedStatus),
        nextDesync,
        nextIsolation,
        nextStale
      );
      const nextIntervention = getIntervention(
        nextRisk,
        nextDesync,
        nextIsolation
      );

      setCrewRows(rows);
      setCrewDesync(nextDesync);
      setIsolation(nextIsolation);
      setStale(nextStale);
      setRisk(nextRisk);
      setIntervention(nextIntervention);
    } catch {
      // ignore awareness refresh errors
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
    if (!selectedStatus || !partyActive) return;
    if (trackingRef.current) {
      clearInterval(trackingRef.current);
      trackingRef.current = null;
    }
    setAutoTracking(true);
    setSyncState("syncing");
    setSyncMessage("Starting auto tracking...");
    void syncCrewStatus(selectedStatus, "tracking", true);
    trackingRef.current = setInterval(() => {
      if (!selectedStatus) return;
      void syncCrewStatus(selectedStatus, "tracking", true);
    }, 12000);
  }
  useEffect(() => {
    if (!selectedStatus) return;
    writePartyLiveState(
      selectedStatus,
      lastCoords,
      firstSyncSkippedRef.current ? "status" : "bootstrap",
      partyActive
    );
    if (!firstSyncSkippedRef.current) {
      firstSyncSkippedRef.current = true;
      return;
    }
    if (!partyActive) return;
    void syncCrewStatus(selectedStatus, "status", true);
  }, [selectedStatus]);
  useEffect(() => {
    if (!selectedStatus) return;
    writePartyLiveState(selectedStatus, lastCoords, "toggle", partyActive);
    if (!partyActive) {
      stopAutoTracking();
      return;
    }
    void syncCrewStatus(selectedStatus, "toggle", true);
  }, [partyActive]);
  useEffect(() => {
    if (!selectedStatus) return;
    writePartyLiveState(selectedStatus, lastCoords, "bootstrap", partyActive);
  }, [privacy, autoTracking, lastCoords, selectedStatus, partyActive]);
  useEffect(() => {
    if (!selectedStatus) return;
    if (autoTracking && partyActive) {
      if (trackingRef.current) {
        clearInterval(trackingRef.current);
        trackingRef.current = null;
      }
      trackingRef.current = setInterval(() => {
        void syncCrewStatus(selectedStatus, "tracking", true);
      }, 12000);
      void syncCrewStatus(selectedStatus, "tracking", true);
      setSyncMessage("Auto tracking active");
    }
    return () => {
      if (trackingRef.current) {
        clearInterval(trackingRef.current);
        trackingRef.current = null;
      }
    };
  }, [autoTracking, selectedStatus, privacy, partyActive]);
  useEffect(() => {
    return () => {
      if (trackingRef.current) {
        clearInterval(trackingRef.current);
        trackingRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    void refreshCrewAwareness();
    const interval = window.setInterval(() => {
      void refreshCrewAwareness();
    }, 6000);
    return () => window.clearInterval(interval);
  }, [displayName, crewOwner, selectedStatus, partyActive]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    if (!autoVoiceEnabled) return;
    const interval = setInterval(async () => {
      try {
        const raw = window.localStorage.getItem("twincore_party_live");
        if (!raw) return;
        const live = JSON.parse(raw) as {
          active?: boolean;
          heartbeatBpm?: number;
          status?: PartyStatus;
        };
        if (!live?.active) return;
        let nextCrewRows = crewRows;
        if (supabase && displayName) {
          nextCrewRows = await loadCrewRowsForAwareness();
          setCrewRows(nextCrewRows);
        }
        const nextStale = getStaleState(nextCrewRows);
        const nextIsolation = getIsolationState(nextCrewRows);
        const nextDesync = getCrewDesyncState(live.status ?? null, nextCrewRows);
        const bpm = live.heartbeatBpm || 0;
        const nextRisk = getPredictiveRisk(
          bpm,
          nextDesync,
          nextIsolation,
          nextStale
        );
        const nextIntervention = getIntervention(
          nextRisk,
          nextDesync,
          nextIsolation
        );
        setStale(nextStale);
        setIsolation(nextIsolation);
        setCrewDesync(nextDesync);
        setRisk(nextRisk);
        setIntervention(nextIntervention);
        let label = "stable";
        let message: string | null = null;
        if (nextRisk.level === "high") {
          label = "risk_high";
          message =
            "TwinMe check. Your situation is trending toward high risk. Slow down immediately.";
        } else if (nextStale.level === "stale") {
          label = "stale";
          message =
            "TwinMe check. Your crew signals are outdated. Do not rely on them.";
        } else if (nextIsolation.level === "isolated") {
          label = "isolated";
          message =
            "TwinMe check. You are currently isolated. Stay aware.";
        } else if (nextDesync.level === "separated") {
          label = "crew_separated";
          message =
            "TwinMe check. You are no longer aligned with your crew.";
        } else if (nextDesync.level === "watch") {
          label = "crew_watch";
          message =
            "TwinMe check. Your state is starting to drift from your crew. Correct it early.";
        } else if (bpm >= 120) {
          label = "critical";
          message =
            "TwinMe check. Your pace is very high. Slow down now and stabilize.";
        } else if (bpm >= 110) {
          label = "elevated";
          message =
            "TwinMe check. Your pace is rising. Stay intentional and slow your next move.";
        } else if (bpm >= 100) {
          label = "guarded";
          message =
            "TwinMe check. Stay aware. Keep your next move simple.";
        }
        if (!message) {
          autoVoiceLastLabelRef.current = label;
          return;
        }
        const now = Date.now();
        const cooldown =
          label === "critical" ||
          label === "crew_separated" ||
          label === "isolated" ||
          label === "stale" ||
          label === "risk_high"
            ? 12000
            : 20000;
        const labelChanged = label !== autoVoiceLastLabelRef.current;
        const cooldownPassed =
          now - autoVoiceLastSpokenAtRef.current > cooldown;
        if (!labelChanged && !cooldownPassed) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1;
        utterance.pitch = 0.95;
        window.speechSynthesis.speak(utterance);
        autoVoiceLastLabelRef.current = label;
        autoVoiceLastSpokenAtRef.current = now;
      } catch {
        // ignore auto voice errors
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [autoVoiceEnabled, crewRows, displayName, crewOwner]);
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
    if (!partyActive) {
      setPartyActive(true);
      writePartyLiveState(currentStatus, lastCoords, "checkin", true);
      await syncCrewStatus(currentStatus, "checkin", true);
    } else {
      writePartyLiveState(currentStatus, lastCoords, "checkin", true);
      await syncCrewStatus(currentStatus, "checkin", true);
    }
    window.setTimeout(() => {
      setCheckInSent(false);
    }, 2200);
  }
  function handleTogglePartyMode() {
    if (!selectedStatus) return;
    const nextActive = !partyActive;
    setPartyActive(nextActive);
    writePartyLiveState(selectedStatus, lastCoords, "toggle", nextActive);
  }
  function handleInterventionAction(action: string) {
    if (action.includes("Reconnect")) {
      window.location.href = "/crew";
      return;
    }
    if (action.includes("safer environment")) {
      window.location.href = "/spots";
      return;
    }
    if (action.includes("check in")) {
      void handleSendCheckIn();
      return;
    }
    if (action.includes("ride")) {
      window.open("https://maps.google.com", "_blank", "noopener,noreferrer");
    }
  }
  const liveSystemLabel = useMemo(() => {
    if (!partyActive) return "Party Mode off";
    if (autoTracking) return "Party Mode live + tracking";
    return "Party Mode live";
  }, [partyActive, autoTracking]);
  const spotsBridgeText = useMemo(() => {
    if (!partyActive) {
      return "Spots and TwinMe are on standby until Party Mode goes live.";
    }
    if (privacy.ghostMode && privacy.trustedOnly) {
      return "Spots and TwinMe receive live status, but your layer is protected and restricted to trusted visibility.";
    }
    if (privacy.ghostMode) {
      return "Spots and TwinMe receive live status with softened location detail.";
    }
    if (privacy.trustedOnly) {
      return "Spots and TwinMe receive live status inside a trusted-only layer.";
    }
    return "Spots and TwinMe receive your live status, mood, heartbeat, and movement as you update.";
  }, [partyActive, privacy.ghostMode, privacy.trustedOnly]);
  const locationLabel = useMemo(() => {
    if (!lastCoords) return "No live location yet";
    return getFriendlyLocationName(lastCoords);
  }, [lastCoords]);
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
              Live awareness for nights, movement, exits, crew desync,
              isolation, stale signals, predictive risk, intervention,
              and action execution.
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
            <div className="mb-2 text-4xl leading-none">
              {getModeIcon(selectedStatus)}
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
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide ${visual.badge}`}
              >
                {visual.title}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/85">
                <Sparkles className="mr-1 h-3 w-3" />
                {liveSystemLabel.toUpperCase()}
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
              {autoVoiceEnabled ? (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/85">
                  <Volume2 className="mr-1 h-3 w-3" />
                  AUTO VOICE
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">
              {visual.subtitle}
            </p>
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
              <h2 className="text-2xl font-semibold text-white">Party Engine</h2>
              <p className="mt-1 text-sm text-white/60">
                This is the switch that feeds your live awareness system.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleTogglePartyMode}
              className={`rounded-2xl px-4 py-5 text-center text-lg font-semibold transition duration-200 active:scale-[0.97] ${
                partyActive
                  ? "border border-white/80 bg-[linear-gradient(180deg,#24242b,#17171d)] text-white shadow-[0_12px_28px_rgba(255,255,255,0.06)]"
                  : "bg-[linear-gradient(180deg,#17171d,#121218)] text-white/92 shadow-[0_8px_24px_rgba(0,0,0,0.32)] hover:scale-[1.02]"
              }`}
            >
              {partyActive ? "Party On" : "Party Off"}
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
              disabled={!partyActive}
              className={`rounded-2xl px-4 py-5 text-center text-lg font-semibold transition duration-200 active:scale-[0.97] ${
                !partyActive
                  ? "cursor-not-allowed bg-white/5 text-white/35"
                  : "bg-[linear-gradient(180deg,#17171d,#121218)] text-white/92 shadow-[0_8px_24px_rgba(0,0,0,0.32)] hover:scale-[1.02]"
              }`}
            >
              {autoTracking ? "Stop Tracking" : "Start Tracking"}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAutoVoiceEnabled((prev) => !prev)}
              className="rounded-2xl bg-[linear-gradient(180deg,#17171d,#121218)] px-4 py-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.32)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
            >
              {autoVoiceEnabled ? "Auto Voice On" : "Auto Voice Off"}
            </button>
            <button
              type="button"
              onClick={handleSendCheckIn}
              className="rounded-2xl bg-white/10 px-4 py-4 text-sm font-semibold text-white transition duration-200 hover:bg-white/15 active:scale-[0.97]"
            >
              {checkInSent ? "Check-in Sent" : "Send Check-in"}
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white/85">
              <MapPin className="h-4 w-4" />
              Spots + TwinMe bridge
            </div>
            <p className="text-sm leading-6 text-white/70">{spotsBridgeText}</p>
          </div>
        </section>
        <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Crew Desync</h2>
              <p className="mt-1 text-sm text-white/60">
                TwinMe now reads your state against your crew’s state.
              </p>
            </div>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              crewDesync.level === "separated"
                ? "border-red-400/20 bg-red-500/10"
                : crewDesync.level === "watch"
                  ? "border-orange-400/20 bg-orange-500/10"
                  : "border-white/10 bg-white/5"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-white/90">
                Crew state read
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  crewDesync.level === "separated"
                    ? "bg-red-500/15 text-red-100"
                    : crewDesync.level === "watch"
                      ? "bg-orange-500/15 text-orange-100"
                      : "bg-white/10 text-white/80"
                }`}
              >
                {crewDesync.level}
              </span>
            </div>
            <p className="text-sm leading-6 text-white/80">
              {crewDesync.message}
            </p>
            <div className="mt-3 text-xs text-white/55">
              Crew rows read: {crewRows.length} · active mismatch signals:{" "}
              {crewDesync.differentCount}
            </div>
          </div>
        </section>
        <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-white">Isolation</h2>
            <p className="text-sm text-white/60">
              TwinMe monitors if you are operating without crew presence.
            </p>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              isolation.level === "isolated"
                ? "border-red-400/20 bg-red-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm text-white">Isolation state</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  isolation.level === "isolated"
                    ? "bg-red-500/15 text-red-100"
                    : "bg-white/10 text-white/80"
                }`}
              >
                {isolation.level}
              </span>
            </div>
            <p className="text-sm text-white/80">{isolation.message}</p>
          </div>
        </section>
        <section className="mb-6 rounded-3xl border border-white/10 bg-[#0c0c0f] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <h2 className="mb-2 text-xl font-semibold text-white">
            Signal Freshness
          </h2>
          <div
            className={`rounded-xl border p-4 ${
              stale.level === "stale"
                ? "border-yellow-400/20 bg-yellow-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="mb-1 flex justify-between">
              <span className="text-sm text-white">Crew signal state</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  stale.level === "stale"
                    ? "bg-yellow-500/15 text-yellow-100"
                    : "bg-white/10 text-white/80"
                }`}
              >
                {stale.level}
              </span>
            </div>
            <p className="text-sm text-white/80">{stale.message}</p>
          </div>
        </section>
        <section className="mb-6 rounded-3xl border border-white/10 bg-[#0c0c0f] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <h2 className="mb-2 text-xl font-semibold text-white">
            Predictive Risk
          </h2>
          <div
            className={`rounded-xl border p-4 ${
              risk.level === "high"
                ? "border-red-400/20 bg-red-500/10"
                : risk.level === "rising"
                  ? "border-orange-400/20 bg-orange-500/10"
                  : "border-white/10 bg-white/5"
            }`}
          >
            <div className="mb-1 flex justify-between">
              <span className="text-sm text-white">Risk trajectory</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  risk.level === "high"
                    ? "bg-red-500/15 text-red-100"
                    : risk.level === "rising"
                      ? "bg-orange-500/15 text-orange-100"
                      : "bg-white/10 text-white/80"
                }`}
              >
                {risk.level}
              </span>
            </div>
            <p className="text-sm text-white/80">{risk.message}</p>
          </div>
        </section>
        <section className="mb-6 rounded-3xl border border-white/10 bg-[#0c0c0f] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <h2 className="mb-2 text-xl font-semibold text-white">
            Intervention Mode
          </h2>
          <div
            className={`rounded-xl border p-4 ${
              intervention.level === "urgent"
                ? "border-red-400/20 bg-red-500/10"
                : intervention.level === "suggest"
                  ? "border-orange-400/20 bg-orange-500/10"
                  : "border-white/10 bg-white/5"
            }`}
          >
            <div className="mb-2 flex justify-between">
              <span className="text-sm text-white">Action guidance</span>
              <span
                className={`text-xs uppercase ${
                  intervention.level === "urgent"
                    ? "text-red-300"
                    : intervention.level === "suggest"
                      ? "text-orange-300"
                      : "text-white/60"
                }`}
              >
                {intervention.level}
              </span>
            </div>
            {intervention.actions.length === 0 ? (
              <p className="text-sm text-white/60">No intervention needed.</p>
            ) : (
              <div className="space-y-2">
                {intervention.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleInterventionAction(action)}
                    className="w-full rounded-xl bg-white/5 px-4 py-3 text-left text-sm text-white/85 transition hover:bg-white/10"
                  >
                    • {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
        <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Audio + Vibe</h2>
              <p className="mt-1 text-sm text-white/60">
                Keep the room alive, but keep awareness higher than the vibe.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleToggleAudio}
              className="rounded-2xl bg-[linear-gradient(180deg,#17171d,#121218)] px-4 py-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.32)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
            >
              <span className="inline-flex items-center gap-2">
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isPlaying ? "Pause Sound" : "Play Sound"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleSendCheckIn}
              className="rounded-2xl bg-[linear-gradient(180deg,#17171d,#121218)] px-4 py-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.32)] transition duration-200 hover:scale-[1.02] active:scale-[0.97]"
            >
              <span className="inline-flex items-center gap-2">
                <Send className="h-4 w-4" />
                Crew Ping
              </span>
            </button>
          </div>
          {!audioReady ? (
            <div className="mt-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
              Party audio could not load. Check that{" "}
              <span className="font-semibold">{PARTY_AUDIO_SRC}</span> exists in{" "}
              <span className="font-semibold">public/</span>.
            </div>
          ) : null}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
              Twin Tip
            </div>
            <p className="text-sm leading-6 text-white/80">{visual.twinTip}</p>
          </div>
        </section>
        <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Live Crew Sync</h2>
              <p className="mt-1 text-sm text-white/60">
                Privacy settings affect what gets written to the live layer.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-white/85">
                  <Users className="h-4 w-4" />
                  Sync status
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    syncState === "synced"
                      ? "bg-emerald-500/15 text-emerald-100"
                      : syncState === "syncing"
                        ? "bg-white/10 text-white"
                        : syncState === "error"
                          ? "bg-red-500/15 text-red-100"
                          : "bg-white/10 text-white/80"
                  }`}
                >
                  {syncState === "syncing" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : syncState === "synced" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : syncState === "error" ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <LocateFixed className="h-3.5 w-3.5" />
                  )}
                  {syncState}
                </span>
              </div>
              <p className="text-sm leading-6 text-white/75">{syncMessage}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                Last live location
              </div>
              <p className="text-sm leading-6 text-white/80">{locationLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                Privacy layer
              </div>
              <p className="text-sm leading-6 text-white/80">
                Ghost mode:{" "}
                <span className="font-semibold">
                  {privacy.ghostMode ? "On" : "Off"}
                </span>
                {" · "}
                Blur:{" "}
                <span className="font-semibold">
                  {privacy.blurPresence ? "On" : "Off"}
                </span>
                {" · "}
                Trusted only:{" "}
                <span className="font-semibold">
                  {privacy.trustedOnly ? "On" : "Off"}
                </span>
              </p>
            </div>
          </div>
        </section>
        <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Status Layer</h2>
              <p className="mt-1 text-sm text-white/60">
                Choose the state that best matches your current phase.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {PARTY_STATUSES.map((status) => {
              const active = selectedStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusClick(status)}
                  className={`rounded-2xl px-4 py-4 text-left text-sm font-semibold transition duration-200 active:scale-[0.97] ${
                    active
                      ? "border border-white/80 bg-[linear-gradient(180deg,#24242b,#17171d)] text-white shadow-[0_12px_28px_rgba(255,255,255,0.06)]"
                      : "bg-[linear-gradient(180deg,#17171d,#121218)] text-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.32)] hover:scale-[1.02]"
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </section>
        <div className="mt-6 flex items-center justify-between text-xs text-white/45">
          <Link href="/" className="transition hover:text-white/75">
            Dashboard
          </Link>
          <Link href="/crew" className="transition hover:text-white/75">
            Crew
          </Link>
          <Link href="/spots" className="transition hover:text-white/75">
            Spots
          </Link>
          <Link href="/twinme" className="transition hover:text-white/75">
            TwinMe
          </Link>
        </div>
      </div>
    </main>
  );
}