"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import PartyPulseHero from "./PartyPulseHero";
import CrewArrivalPrediction from "./components/CrewArrivalPrediction";
import VenueIntelligenceCard from "./components/VenueIntelligenceCard";
import {
  Flame,
  Snowflake,
  Music4,
  Pause,
  Play,
  Send,
  Users,
  Shield,
  Activity,
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
import { supabase } from "@/lib/supabase/client";
import { getActiveCrew } from "@/lib/crew-system";
import { getSharedProfile } from "@/lib/shared-profile";
import AuthGuard from "@/components/auth/AuthGuard";
import posthog from "posthog-js";
import AnimatedCard from "../_components/animated-card";
import { TwinSection } from "@/components/twincore/ui/TwinSection";
import { TwinHero } from "@/components/twincore/ui/TwinHero";
import { TwinOrb } from "@/components/twincore/ui/TwinOrb";
import { TwinSituation } from "@/components/twincore/ui/TwinSituation";
import { TwinPrimaryAction } from "@/components/twincore/ui/TwinPrimaryAction";
import { TwinPage } from "@/components/twincore/ui/TwinPage";
import { useCurrentVibe } from "@/hooks/twinme/useCurrentVibe";
import { useTonightContext } from "@/hooks/twinme/useTonightContext";
import { TwinVibePrompt } from "@/components/twincore/ui/TwinVibePrompt";
import { PartyLaunchpad } from "@/components/twincore/ui/PartyLaunchpad";
import { PartyFitIntelligence } from "@/components/twincore/ui/PartyFitIntelligence";
const getProfileStorageKey = (userId: string) => `twincore_profile_${userId}`;
const PARTY_AUDIO_SRC = "/party-mode.mp3";

const getLastSharedLocationKey = (userId: string) =>
  `twincore_last_shared_location_${userId}`;

const getPartyStatusKey = (userId: string) => `twincore_party_status_${userId}`;

const getPartyActiveKey = (userId: string) => `twincore_party_active_${userId}`;

const getPartyAutoTrackingKey = (userId: string) =>
  `twincore_party_auto_tracking_${userId}`;

const getPartyLiveKey = (userId: string) => `twincore_party_live_${userId}`;

const getJoinedCrewKey = (userId: string) => `twincore_joined_crew_${userId}`;

const getCrewStatusIdKey = (userId: string) =>
  `twincore_crew_status_id_${userId}`;
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

  latitude?: number | null;
  longitude?: number | null;

  location_name?: string | null;
  heartbeat_bpm?: number | null;
  vibe_label?: string | null;
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
        card: "border border-orange-500/20 bg-[linear-gradient(180deg,#24150f,#110c08)]",
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
        card: "border border-cyan-400/20 bg-[linear-gradient(180deg,#0f1b24,#081017)]",
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
        card: "border border-fuchsia-500/20 bg-[linear-gradient(180deg,#1b1326,#0d0b16)]",
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
        card: "border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)]",
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
function getCrewStatusId(userId: string) {
  const existing = window.localStorage.getItem(getCrewStatusIdKey(userId));

  if (existing) return existing;

  const created = crypto.randomUUID();

  window.localStorage.setItem(getCrewStatusIdKey(userId), created);

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
function getJoinedCrew(userId?: string): JoinedCrewStorage {
  try {
    const raw = userId
      ? window.localStorage.getItem(getJoinedCrewKey(userId))
      : null;
    if (!raw) return {};
    return JSON.parse(raw) as JoinedCrewStorage;
  } catch {
    return {};
  }
}

async function getPrivacySettings(): Promise<PrivacySettings> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const raw = user
      ? window.localStorage.getItem(getProfileStorageKey(user.id))
      : null;
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
      },
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
  crewRows: CrewStatusRow[],
): CrewDesyncState {
  if (!selfStatus || crewRows.length === 0) {
    return {
      level: "aligned",
      message: "No meaningful crew desync signal yet.",
      activeCount: 0,
      differentCount: 0,
    };
  }
  const crewHighEnergy = crewRows.filter((row) =>
    isHighEnergyStatus(row.status),
  );
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
  stale: StaleState,
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
  isolation: IsolationState,
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
  // TWINCORE_PARTY_CURRENT_VIBE_R11_1
  const {
    choices: partyVibeChoices,
    selectedChoice: partyVibe,
    hydrated: partyVibeHydrated,
    selectVibe: selectPartyVibe,
    clearVibe: clearPartyVibe,
  } = useCurrentVibe("party");

  // TWINCORE_TONIGHT_CONTEXT_R11_5
  const { tonight, updateTonight } = useTonightContext();

  const [displayName, setDisplayName] = useState("Crew Member");
  const [crewOwner, setCrewOwner] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PartyStatus | null>(
    null,
  );
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
    async function loadPartyPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const savedName = window.localStorage.getItem(
        `twincore_display_name_${user.id}`,
      );

      const sharedProfile = await getSharedProfile(user.id);
      const authoritativeDisplayName =
        sharedProfile?.display_name?.trim() ||
        savedName?.trim() ||
        "Crew Member";

      const activeCrew = await getActiveCrew(user.id);

      setDisplayName(authoritativeDisplayName);
      setCrewOwner(
        activeCrew?.ownerName?.trim() ||
          authoritativeDisplayName,
      );

      const savedStatus = window.localStorage.getItem(
        getPartyStatusKey(user.id),
      );

      const savedLocation = window.localStorage.getItem(
        getLastSharedLocationKey(user.id),
      );

      const savedAutoTracking =
        window.localStorage.getItem(getPartyAutoTrackingKey(user.id)) ===
        "true";

      const savedPartyActive =
        window.localStorage.getItem(getPartyActiveKey(user.id)) === "true";

      if (savedStatus && PARTY_STATUSES.includes(savedStatus as PartyStatus)) {
        setSelectedStatus(savedStatus as PartyStatus);
      } else {
        setSelectedStatus("Listening to music");

        window.localStorage.setItem(
          getPartyStatusKey(user.id),
          "Listening to music",
        );
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
          // Ignore invalid cached location data.
        }
      }

      setAutoTracking(savedAutoTracking);
      setPartyActive(savedPartyActive);

      const privacySettings = await getPrivacySettings();
      setPrivacy(privacySettings);
    }

    void loadPartyPage();

    function onStorage() {
      void supabase.auth.getUser().then(async ({ data }) => {
        const user = data.user;

        if (!user) return;

        const nextCachedName = window.localStorage.getItem(
          `twincore_display_name_${user.id}`,
        );

        const sharedProfile = await getSharedProfile(user.id);
        const authoritativeDisplayName =
          sharedProfile?.display_name?.trim() ||
          nextCachedName?.trim() ||
          "Crew Member";

        const activeCrew = await getActiveCrew(user.id);

        setDisplayName(authoritativeDisplayName);
        setCrewOwner(
          activeCrew?.ownerName?.trim() ||
            authoritativeDisplayName,
        );

        const nextStatus = window.localStorage.getItem(
          getPartyStatusKey(user.id),
        );

        if (nextStatus && PARTY_STATUSES.includes(nextStatus as PartyStatus)) {
          setSelectedStatus(nextStatus as PartyStatus);
        }

        const nextPartyActive =
          window.localStorage.getItem(getPartyActiveKey(user.id)) === "true";

        setPartyActive(nextPartyActive);
      });
    }

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!selectedStatus) return;

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;

      window.localStorage.setItem(getPartyStatusKey(user.id), selectedStatus);
    });
  }, [selectedStatus]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;

      window.localStorage.setItem(
        getPartyAutoTrackingKey(user.id),
        autoTracking ? "true" : "false",
      );
    });
  }, [autoTracking]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;

      window.localStorage.setItem(
        getPartyActiveKey(user.id),
        partyActive ? "true" : "false",
      );
    });
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
    userId: string,
    status: PartyStatus,
    coords: Coordinates | null,
    source: "status" | "checkin" | "tracking" | "toggle" | "bootstrap",
    activeOverride?: boolean,
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

    window.localStorage.setItem(
      getPartyLiveKey(userId),
      JSON.stringify(liveState),
    );

    window.localStorage.setItem(getPartyStatusKey(userId), status);

    window.localStorage.setItem(
      getPartyActiveKey(userId),
      active ? "true" : "false",
    );

    if (coords) {
      window.localStorage.setItem(
        getLastSharedLocationKey(userId),
        JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: new Date().toISOString(),
          mapsUrl: `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`,
        }),
      );
    }
  }

  async function syncCrewStatus(
    status: PartyStatus,
    trigger: "status" | "checkin" | "tracking" | "toggle",
    activeOverride?: boolean,
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
              : "Syncing live status...",
      );
      const coords = await getCurrentCoordinates();
      setLastCoords(coords);

      const exactMapsUrl = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
      const exactLocationName = getFriendlyLocationName(coords);

      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User is not signed in.");
      }

      window.localStorage.setItem(
        getLastSharedLocationKey(user.id),
        JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: new Date().toISOString(),
          mapsUrl: exactMapsUrl,
        }),
      );

      writePartyLiveState(user.id, status, coords, trigger, active);

      const activeCrew = await getActiveCrew(user.id);

      if (!activeCrew) {
        throw new Error(
          "Create or join a Crew before syncing live Party status.",
        );
      }

      const authoritativeProfile = await getSharedProfile(user.id);
      const authoritativeDisplayName =
        authoritativeProfile?.display_name?.trim() ||
        displayName.trim() ||
        "Crew Member";

      const { data: existingRows, error: lookupError } = await supabase
        .from("crew_status")
        .select("id")
        .eq("user_id", user.id)
        .eq("crew_id", activeCrew.id)
        .limit(1);

      if (lookupError) {
        throw new Error(
          lookupError.message || "Could not look up Crew status.",
        );
      }

      const existingStatusId =
        Array.isArray(existingRows) && existingRows.length > 0
          ? (existingRows[0] as { id?: string }).id
          : undefined;

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
      const payloadMood = privacy.ghostMode
        ? "ghost"
        : getMoodForStatus(status);
      const payload = {
        user_id: user.id,
        crew_id: activeCrew.id,
        name: authoritativeDisplayName,
        status: active ? status : "Safe",
        latitude: payloadLatitude,
        longitude: payloadLongitude,
        location_name: payloadLocationName,
        heartbeat_bpm: active ? getHeartbeatForStatus(status) : 68,
        vibe_label: active ? payloadVibe : "Party off",
        mood: active ? payloadMood : "safe",
      };
      const statusWrite = existingStatusId
        ? await supabase
            .from("crew_status")
            .update(payload)
            .eq("id", existingStatusId)
        : await supabase
            .from("crew_status")
            .insert(payload);

      if (statusWrite.error) {
        throw new Error(
          statusWrite.error.message || "Supabase write failed.",
        );
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
        JSON.stringify(checkInPayload),
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
              : "Party status synced live",
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
    if (!supabase) {
      return [] as CrewStatusRow[];
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [] as CrewStatusRow[];
    }

    const activeCrew = await getActiveCrew(user.id);

    if (!activeCrew) {
      return [] as CrewStatusRow[];
    }

    const { data: statusRows, error: statusError } = await supabase
      .from("crew_status")
      .select(
        `
  id,
  name,
  status,
  updated_at,
  latitude,
  longitude,
  location_name,
  heartbeat_bpm,
  vibe_label
`,
      )
      .eq("crew_id", activeCrew.id)
      .neq("user_id", user.id);

    if (statusError) {
      throw new Error(
        statusError.message || "Unable to load Crew status.",
      );
    }

    return (
      Array.isArray(statusRows) ? statusRows : []
    ) as CrewStatusRow[];
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
        nextStale,
      );
      const nextIntervention = getIntervention(
        nextRisk,
        nextDesync,
        nextIsolation,
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

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;

      writePartyLiveState(
        user.id,
        selectedStatus,
        lastCoords,
        firstSyncSkippedRef.current ? "status" : "bootstrap",
        partyActive,
      );
    });

    if (!firstSyncSkippedRef.current) {
      firstSyncSkippedRef.current = true;
      return;
    }

    if (!partyActive) return;
    void syncCrewStatus(selectedStatus, "status", true);
  }, [selectedStatus]);

  useEffect(() => {
    if (!selectedStatus) return;

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;

      writePartyLiveState(
        user.id,
        selectedStatus,
        lastCoords,
        "toggle",
        partyActive,
      );
    });

    if (!partyActive) {
      stopAutoTracking();
      return;
    }

    void syncCrewStatus(selectedStatus, "toggle", true);
  }, [partyActive]);

  useEffect(() => {
    if (!selectedStatus) return;

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;

      writePartyLiveState(
        user.id,
        selectedStatus,
        lastCoords,
        "bootstrap",
        partyActive,
      );
    });
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

    const channel = supabase
      .channel("party-crew-awareness-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crew_status",
        },
        () => {
          void refreshCrewAwareness();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crew_members",
        },
        () => {
          void refreshCrewAwareness();
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [displayName, crewOwner, selectedStatus, partyActive]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    if (!autoVoiceEnabled) return;

    const interval = setInterval(async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const raw = window.localStorage.getItem(getPartyLiveKey(user.id));

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
        const nextDesync = getCrewDesyncState(
          live.status ?? null,
          nextCrewRows,
        );
        const bpm = live.heartbeatBpm || 0;
        const nextRisk = getPredictiveRisk(
          bpm,
          nextDesync,
          nextIsolation,
          nextStale,
        );
        const nextIntervention = getIntervention(
          nextRisk,
          nextDesync,
          nextIsolation,
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
          message = "TwinMe check. You are currently isolated. Stay aware.";
        } else if (nextDesync.level === "separated") {
          label = "crew_separated";
          message = "TwinMe check. You are no longer aligned with your crew.";
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
          message = "TwinMe check. Stay aware. Keep your next move simple.";
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

  const visual = useMemo(
    () => getStatusVisual(selectedStatus),
    [selectedStatus],
  );

  const partyIntelligence = useMemo(() => {
    if (!partyActive) {
      return {
        score: 18,
        label: "Standby",
        message: "Activate Party Mode to begin collecting live intelligence.",
        momentum: "Standby" as const,
        recommendation: {
          title: "Activate Party Mode",
          message:
            "Turn Party Mode on to start monitoring crew presence, movement, risk, and live party signals.",
          action: "Start Party Mode",
        },
      };
    }

    let score = 45;

    if (selectedStatus) {
      score += 10;
    }

    if (autoTracking) {
      score += 12;
    }

    const freshCrewCount = crewRows.filter((row) => {
      if (!row.updated_at) {
        return false;
      }

      const minutesAgo = Math.max(
        0,
        Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 60000),
      );

      return minutesAgo <= 30;
    }).length;

    score += Math.min(15, freshCrewCount * 3);

    if (crewDesync.level === "aligned") {
      score += 8;
    } else if (crewDesync.level === "watch") {
      score -= 5;
    } else if (crewDesync.level === "separated") {
      score -= 15;
    }

    if (isolation.level === "isolated") {
      score -= 15;
    }

    if (stale.level !== "fresh") {
      score -= 10;
    }

    if (risk.level === "rising") {
      score -= 12;
    } else if (risk.level === "high") {
      score -= 25;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    const label =
      score >= 85
        ? "Strong"
        : score >= 65
          ? "Active"
          : score >= 40
            ? "Watch"
            : "Low signal";

    const momentum: "Peak" | "Building" | "Cooling" | "Stable" | "Standby" =
      !partyActive
        ? "Standby"
        : score >= 85
          ? "Peak"
          : score >= 65 && freshCrewCount >= 2
            ? "Building"
            : risk.level === "high" ||
                crewDesync.level === "separated" ||
                isolation.level === "isolated"
              ? "Cooling"
              : "Stable";

    const recommendation =
      risk.level === "high"
        ? {
            title: "Slow down and reconnect",
            message:
              "Risk is elevated. Move toward your crew, reduce pace, and prepare a safe exit.",
            action: "Safety check",
          }
        : crewDesync.level === "separated"
          ? {
              title: "Regroup your crew",
              message:
                "Your crew appears split. Reconnect before moving to another venue.",
              action: "Regroup",
            }
          : isolation.level === "isolated"
            ? {
                title: "Share your position",
                message:
                  "You appear isolated from your crew. Send a check-in or refresh your location.",
                action: "Check in",
              }
            : stale.level !== "fresh"
              ? {
                  title: "Refresh live signals",
                  message:
                    "Some crew signals are stale. Update tracking before relying on the current picture.",
                  action: "Refresh",
                }
              : momentum === "Peak"
                ? {
                    title: "Stay aware",
                    message:
                      "Party energy is near peak. Keep exits clear and monitor your crew closely.",
                    action: "Monitor",
                  }
                : momentum === "Building"
                  ? {
                      title: "Good time to move",
                      message:
                        "Activity is building and your signals look healthy. This may be a good time to continue.",
                      action: "Continue",
                    }
                  : {
                      title: "Keep the crew connected",
                      message:
                        "Party conditions look stable. Maintain fresh check-ins and location awareness.",
                      action: "Check in",
                    };

    const message =
      risk.level === "high"
        ? "Party intelligence detects elevated risk. Slow down and reconnect with your crew."
        : crewDesync.level === "separated"
          ? "Your crew appears separated. Consider regrouping before continuing."
          : isolation.level === "isolated"
            ? "You appear isolated from your crew. Share your location or check in."
            : stale.level !== "fresh"
              ? "Some party signals are stale. Refresh tracking before relying on the current picture."
              : autoTracking
                ? "TwinMe is actively monitoring crew presence, movement, and live party signals."
                : "Party Mode is active. Enable auto tracking for stronger live intelligence.";

    return {
      score,
      label,
      message,
      momentum,
      recommendation,
    };
  }, [
    partyActive,
    selectedStatus,
    autoTracking,
    crewRows,
    crewDesync.level,
    isolation.level,
    stale.level,
    risk.level,
  ]);

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
    posthog.capture("party_status_updated", { status });
    setSelectedStatus(status);
  }

  async function handleSendCheckIn() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const currentStatus = selectedStatus ?? "Listening to music";

    posthog.capture("party_checkin_sent", { status: currentStatus });
    setCheckInSent(true);

    if (!partyActive) {
      setPartyActive(true);
      writePartyLiveState(user.id, currentStatus, lastCoords, "checkin", true);
      await syncCrewStatus(currentStatus, "checkin", true);
    } else {
      writePartyLiveState(user.id, currentStatus, lastCoords, "checkin", true);
      await syncCrewStatus(currentStatus, "checkin", true);
    }

    window.setTimeout(() => {
      setCheckInSent(false);
    }, 2200);
  }

  async function persistPrivacySettings(nextPrivacy: PrivacySettings) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSyncMessage("Sign in to save privacy settings.");
      return;
    }

    const storageKey = getProfileStorageKey(user.id);
    const currentRaw = window.localStorage.getItem(storageKey);

    let currentProfile: Record<string, unknown> = {};

    if (currentRaw) {
      try {
        currentProfile = JSON.parse(currentRaw) as Record<string, unknown>;
      } catch {
        currentProfile = {};
      }
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...currentProfile,
        ghostMode: nextPrivacy.ghostMode,
        ghostLabel: nextPrivacy.ghostLabel,
        blurPresence: nextPrivacy.blurPresence,
        trustedOnly: nextPrivacy.trustedOnly,
        trustedList: nextPrivacy.trustedList,
      }),
    );

    setSyncMessage("Privacy settings saved.");
  }

  function updatePrivacySettings(nextPrivacy: PrivacySettings) {
    setPrivacy(nextPrivacy);
    void persistPrivacySettings(nextPrivacy);

    posthog.capture("party_privacy_updated", {
      ghostMode: nextPrivacy.ghostMode,
      blurPresence: nextPrivacy.blurPresence,
      trustedOnly: nextPrivacy.trustedOnly,
    });
  }

  async function handleShareLocation() {
    const currentStatus: PartyStatus = selectedStatus ?? "Listening to music";

    posthog.capture("party_location_shared", {
      status: currentStatus,
    });

    if (!partyActive) {
      setPartyActive(true);
    }

    await syncCrewStatus(currentStatus, "checkin", true);
  }

  function handleOpenSharedLocation() {
    if (!lastCoords) return;

    const mapsUrl = `https://maps.google.com/?q=${lastCoords.latitude},${lastCoords.longitude}`;

    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  }

  async function handleTogglePartyMode() {
    if (!selectedStatus) return;
    const nextActive = !partyActive;
    posthog.capture("party_mode_toggled", { active: nextActive });
    setPartyActive(nextActive);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    writePartyLiveState(
      user.id,
      selectedStatus,
      lastCoords,
      "toggle",
      nextActive,
    );
  }
  function handleInterventionAction(action: string) {
    const normalizedAction = action.toLowerCase();

    posthog.capture("party_intervention_selected", {
      action,
      riskLevel: risk.level,
    });

    if (
      normalizedAction.includes("reconnect") ||
      normalizedAction.includes("regroup")
    ) {
      window.location.href = "/crew";
      return;
    }

    if (
      normalizedAction.includes("safer environment") ||
      normalizedAction.includes("safety check")
    ) {
      window.location.href = "/spots";
      return;
    }

    if (
      normalizedAction.includes("share your location") ||
      normalizedAction.includes("share location")
    ) {
      void handleShareLocation();
      return;
    }

    if (normalizedAction.includes("check in")) {
      void handleSendCheckIn();
      return;
    }

    if (
      normalizedAction.includes("refresh") ||
      normalizedAction.includes("tracking")
    ) {
      if (partyActive && selectedStatus) {
        startAutoTracking();
      } else {
        setSyncMessage(
          "Choose a status and turn Party Mode on before refreshing tracking.",
        );
      }
      return;
    }

    if (
      normalizedAction.includes("ride") ||
      normalizedAction.includes("maps")
    ) {
      if (lastCoords) {
        handleOpenSharedLocation();
      } else {
        window.open("https://maps.google.com", "_blank", "noopener,noreferrer");
      }
      return;
    }

    if (normalizedAction.includes("start party mode")) {
      void handleTogglePartyMode();
      return;
    }

    if (
      normalizedAction.includes("slow down") ||
      normalizedAction.includes("monitor") ||
      normalizedAction.includes("continue")
    ) {
      setSyncMessage(`${action} acknowledged.`);
      return;
    }

    setSyncMessage(`Recommended action: ${action}`);
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
  // TWINCORE_PARTY_LAUNCHPAD_HANDLER_R11_2
  const handlePartyLaunchAction = (
    action: "fit" | "move" | "crew" | "start",
  ) => {
    if (action === "fit") {
      window.dispatchEvent(
        new CustomEvent("twincore:party-fit-request", {
          detail: {
            vibe: partyVibe ?? null,
          },
        }),
      );

      document.getElementById("party-fit-launch")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      return;
    }

    if (action === "move") {
      document.getElementById("venue-intelligence")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    if (action === "crew") {
      document.getElementById("crew-arrival")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    if (action === "start") {
      if (!partyActive) {
        void handleTogglePartyMode();
      }

      return;
    }
  };

  // TWINCORE_PARTY_VIBE_LANGUAGE_R11_1
  const partyVibeTitle = (() => {
    if (!partyVibe) return "Ready when you are.";

    switch (partyVibe.id) {
      case "we-outside":
        return "We outside. 🔥";
      case "sexy-grown":
        return "Sexy. Grown. Intentional.";
      case "dance":
        return "Find me the music.";
      case "chill":
        return "Keep tonight easy.";
      case "different":
        return "Let's switch it up.";
      case "surprise":
        return "TwinMe's got the move.";
      default:
        return "Ready when you are.";
    }
  })();

  const partyVibeSubtitle = (() => {
    if (!partyVibe) {
      return "Tell TwinMe what kind of night you're feeling.";
    }

    switch (partyVibe.id) {
      case "we-outside":
        return "High energy tonight. TwinMe will build the night around movement, people and momentum.";
      case "sexy-grown":
        return "Elevated energy tonight. Think fit, atmosphere, cocktails and the right crowd.";
      case "dance":
        return "Music comes first tonight. TwinMe will prioritize places and moves that keep you moving.";
      case "chill":
        return "No chaos required. TwinMe will keep the night social, comfortable and low-pressure.";
      case "different":
        return "Your usual isn't the assignment tonight. TwinMe can stretch your normal without losing your swag.";
      case "surprise":
        return "You gave TwinMe the wheel. Your history matters, but tonight can still surprise you.";
      default:
        return "TwinMe is reading tonight through your current vibe.";
    }
  })();

  const partyVibeIsHighEnergy =
    partyVibe?.id === "we-outside" || partyVibe?.id === "dance";

  // TWINCORE_TONIGHT_VIBE_SYNC_R11_5
  // TWINCORE_PARTY_VIBE_HYDRATION_GUARD_R14_6F5
  useEffect(() => {
    // Never publish the hook's pre-hydration null into canonical
    // Tonight Context. Once hydrated, null remains authoritative
    // and correctly represents an explicitly absent/cleared vibe.
    if (!partyVibeHydrated) return;

    updateTonight({
      vibeId: partyVibe?.id ?? null,
      vibeLabel: partyVibe?.label ?? null,
      crew: {
        count: crewRows.length,
      },
    });
  }, [
    partyVibeHydrated,
    partyVibe?.id,
    partyVibe?.label,
    crewRows.length,
    updateTonight,
  ]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#06050a] text-white">
      <div className="twincore-party-dashboard relative z-20 px-5 pt-5">
        <Link
          href="/"
          className="inline-flex rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
        >
          ← Dashboard
        </Link>
      </div>
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
      <div className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <TwinPage
          eyebrow="TwinCore • Party"
          title="Tonight starts here."
          subtitle="Set the energy. Stay connected. Let TwinMe read the night with you."
        >
          {/* TWINCORE_PARTY_LIVING_OS_R10_2 */}
          <div className="mb-6 space-y-4">
            {/* TWINCORE_PARTY_VIBE_PROMPT_R11_1 */}
            {!partyActive ? (
              <TwinVibePrompt
                domain="party"
                choices={partyVibeChoices}
                selectedId={partyVibe?.id ?? null}
                eyebrow="TwinMe • Right Now"
                title="What's the energy tonight?"
                body={
                  partyVibe
                    ? `Tonight: ${partyVibe.label}. TwinMe is shaping Party Mode around how you feel right now.`
                    : "Your usual matters. But tonight gets a vote too."
                }
                compact
                onSelect={selectPartyVibe}
                onClear={clearPartyVibe}
              />
            ) : null}

            <TwinHero
              eyebrow={
                partyActive ? "TwinMe • Party Live" : "TwinMe • Party Standby"
              }
              title={
                risk.level === "high"
                  ? "Stay connected tonight."
                  : partyActive
                    ? partyIntelligence.score >= 85
                      ? "The night is alive."
                      : partyVibe
                        ? partyVibeTitle
                        : "Party Mode is live."
                    : partyVibeTitle
              }
              subtitle={
                risk.level === "high"
                  ? partyIntelligence.message
                  : partyActive
                    ? partyVibe
                      ? partyVibeSubtitle
                      : partyIntelligence.message
                    : partyVibeSubtitle
              }
              body={
                partyActive
                  ? autoTracking
                    ? "Live crew awareness and automatic movement tracking are active."
                    : "Party intelligence is active. Turn on tracking when you want continuous movement awareness."
                  : partyVibe && selectedStatus
                    ? `${partyVibe.label} locked. Status ready: ${selectedStatus}.`
                    : partyVibe
                      ? `${partyVibe.label} locked. TwinMe has tonight's energy — choose your Party Status when you're ready.`
                      : selectedStatus
                        ? `Status ready: ${selectedStatus}. Tell TwinMe the energy tonight.`
                        : "Tell TwinMe the energy tonight, then choose your Party Status."
              }
              tone={
                risk.level === "high"
                  ? "red"
                  : risk.level === "rising"
                    ? "amber"
                    : partyActive
                      ? "fuchsia"
                      : "cyan"
              }
              presence={
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${
                    partyActive
                      ? "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100"
                      : "border-white/10 bg-white/[0.04] text-white/40"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      partyActive
                        ? "animate-pulse bg-fuchsia-300 shadow-[0_0_12px_rgba(240,171,252,0.95)]"
                        : "bg-white/30"
                    }`}
                  />
                  {partyActive ? "Live" : "Standby"}
                </span>
              }
              orb={
                <TwinOrb
                  state={
                    risk.level === "high"
                      ? "warning"
                      : risk.level === "rising"
                        ? "guardian"
                        : partyActive && partyIntelligence.score >= 85
                          ? "celebrating"
                          : partyVibeIsHighEnergy
                            ? "celebrating"
                            : partyVibe
                              ? "thinking"
                              : partyActive
                                ? "thinking"
                                : "idle"
                  }
                  size="lg"
                  pulse={partyActive || Boolean(partyVibe)}
                  rotate={partyActive}
                  glow
                  showRings
                  showParticles={partyActive || partyVibeIsHighEnergy}
                />
              }
              badges={[
                {
                  label: partyActive ? "Party Live" : "Party Off",
                  tone: partyActive ? "fuchsia" : "neutral",
                },
                {
                  label: autoTracking ? "Tracking Live" : "Tracking Off",
                  tone: autoTracking ? "cyan" : "neutral",
                },
                {
                  label: partyVibe?.label ?? selectedStatus ?? "Vibe Needed",
                  tone: partyVibe
                    ? "fuchsia"
                    : selectedStatus
                      ? "cyan"
                      : "amber",
                },
              ]}
              metrics={[
                {
                  label: "Energy",
                  value: `${partyIntelligence.score}%`,
                  tone:
                    partyIntelligence.score >= 85
                      ? "emerald"
                      : partyIntelligence.score >= 65
                        ? "fuchsia"
                        : partyIntelligence.score >= 40
                          ? "amber"
                          : "neutral",
                },
                {
                  label: "Crew",
                  value: crewRows.length,
                  tone: crewRows.length > 0 ? "cyan" : "neutral",
                },
                {
                  label: "Risk",
                  value: risk.level.toUpperCase(),
                  tone:
                    risk.level === "high"
                      ? "red"
                      : risk.level === "rising"
                        ? "amber"
                        : "emerald",
                },
              ]}
              primaryAction={
                <TwinPrimaryAction
                  eyebrow={partyActive ? "Party control" : "Start the night"}
                  label={
                    partyActive
                      ? "End Party Mode"
                      : selectedStatus
                        ? "Start Party Mode"
                        : "Choose a status first"
                  }
                  description={
                    partyActive
                      ? "End live Party Mode awareness for tonight."
                      : selectedStatus
                        ? "Bring TwinMe, crew awareness and Party intelligence online."
                        : "Open Party Status below and tell TwinMe what phase of the night you're in."
                  }
                  tone={partyActive ? "fuchsia" : "cyan"}
                  disabled={!partyActive && !selectedStatus}
                  onClick={() => void handleTogglePartyMode()}
                  trailing={
                    <span className="text-lg text-white/45">
                      {partyActive ? "■" : "→"}
                    </span>
                  }
                />
              }
              footer={
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">
                  <span>{partyIntelligence.label}</span>
                  <span>•</span>
                  <span>{partyIntelligence.momentum}</span>
                  <span>•</span>
                  <span>
                    {autoTracking ? "Movement live" : "Manual awareness"}
                  </span>
                </div>
              }
            />
          </div>

          {/* R10.2 COMPARISON — existing PartyPulseHero intentionally preserved */}
          {/* TWINCORE_PARTY_LAUNCHPAD_R11_2 */}
          <div className="mb-6">
            <PartyLaunchpad
              vibe={partyVibe}
              partyActive={partyActive}
              crewCount={crewRows.length}
              onAction={handlePartyLaunchAction}
            />
          </div>

          {/* TWINCORE_PARTY_FIT_INTELLIGENCE_R11_3 */}
          <div className="mb-6">
            <PartyFitIntelligence currentPartyVibe={partyVibe?.label ?? null} />
          </div>

          {/* TWINCORE_PARTY_LEGACY_PULSE_R11_2
              Legacy PartyPulseHero preserved in source.
              Hidden from the primary pre-party journey while the
              new consumer Party experience is validated.
          */}
          <div className="hidden">
            <PartyPulseHero
              score={partyIntelligence.score}
              label={partyIntelligence.label}
              momentum={partyIntelligence.momentum}
              message={partyIntelligence.message}
              partyActive={partyActive}
              selectedStatus={selectedStatus}
              displayName={displayName}
              autoTracking={autoTracking}
              crewCount={crewRows.length}
              crewMembers={crewRows.map((row) => ({
                id: row.id,
                name: row.name || "Crew Member",
              }))}
              isPlaying={isPlaying}
              audioReady={audioReady}
              onTogglePartyMode={() => void handleTogglePartyMode()}
              onToggleAudio={() => void handleToggleAudio()}
            />
          </div>

          <div id="party-arrival" className="scroll-mt-6">
            <TwinSection
              title="Your People"
              subtitle="See how your crew is coming together tonight"
              tone="cyan"
              defaultOpen={false}
            >
              <CrewArrivalPrediction
                destination={lastCoords}
                destinationLabel={locationLabel}
                crewMembers={crewRows.map((row) => ({
                  id: row.id,
                  name: row.name || "Crew Member",
                  status: row.status,
                  latitude: row.latitude,
                  longitude: row.longitude,
                  locationName: row.location_name,
                  updatedAt: row.updated_at,
                }))}
              />
            </TwinSection>
          </div>

          <div id="party-venue-intelligence" className="scroll-mt-6">
            <TwinSection
              title="Where Tonight Happens"
              subtitle="Live context for the places shaping your night"
              tone="fuchsia"
              defaultOpen={false}
            >
              <div id="venue-intelligence" className="scroll-mt-6">
                <VenueIntelligenceCard />
              </div>
            </TwinSection>
          </div>

          <div id="party-auto-tracking" className="scroll-mt-6">
            <TwinSection
              title="Stay Connected"
              subtitle="Keep trusted crew awareness current while Party Mode is live"
              tone="fuchsia"
              defaultOpen={partyActive && autoTracking}
            >
              <section className="mb-6 rounded-[2rem] border border-violet-400/20 bg-[linear-gradient(135deg,rgba(27,13,48,0.95),rgba(7,10,22,0.96))] p-5 shadow-[0_0_42px_rgba(139,92,246,0.09)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-300/25 bg-violet-300/10 text-violet-200">
                      <LocateFixed className="h-5 w-5" />
                    </span>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">
                        Auto Tracking
                      </p>

                      <p className="mt-1 text-sm leading-6 text-white/65">
                        Keep your trusted crew updated with your live Party Mode
                        location.
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${
                      autoTracking
                        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                        : "border-white/10 bg-white/5 text-white/40"
                    }`}
                  >
                    {autoTracking ? "On" : "Off"}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                        Party Mode
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white/85">
                        {partyActive ? "Active" : "Off"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                        Tracking
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white/85">
                        {autoTracking ? "Live every 12 seconds" : "Not running"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                        Current status
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white/85">
                        {selectedStatus || "Choose a status"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={startAutoTracking}
                    disabled={
                      autoTracking ||
                      !partyActive ||
                      !selectedStatus ||
                      syncState === "syncing"
                    }
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {autoTracking ? "Tracking Active" : "Start Auto Tracking"}
                  </button>

                  <button
                    type="button"
                    onClick={stopAutoTracking}
                    disabled={!autoTracking}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-red-300/25 bg-red-300/10 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-300/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Stop Tracking
                  </button>
                </div>

                {!partyActive || !selectedStatus ? (
                  <p className="mt-3 text-xs text-amber-200/70">
                    Choose a status and turn Party Mode on before starting auto
                    tracking.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-white/45">
                    Privacy settings are applied to every automatic location
                    update.
                  </p>
                )}
              </section>
            </TwinSection>
          </div>

          <div id="party-live-location" className="scroll-mt-6">
            <TwinSection
              title="Your Location"
              subtitle="Share where you are when you want your crew to know"
              tone="cyan"
              defaultOpen={false}
            >
              <section className="mb-6 rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(8,23,34,0.94),rgba(10,9,22,0.96))] p-5 shadow-[0_0_42px_rgba(34,211,238,0.08)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                      <MapPin className="h-5 w-5" />
                    </span>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                        Live Location
                      </p>

                      <p className="mt-1 text-sm leading-6 text-white/65">
                        Share your current location with your trusted TwinCore
                        crew.
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${
                      lastCoords
                        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                        : "border-white/10 bg-white/5 text-white/40"
                    }`}
                  >
                    {lastCoords ? "Location Ready" : "Not Shared"}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                    Current location
                  </div>

                  <p className="mt-2 text-sm font-semibold text-white/85">
                    {locationLabel}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    Privacy controls are applied before location is written to
                    the live crew layer.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void handleShareLocation()}
                    disabled={syncState === "syncing"}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-4 py-3 text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-300/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {syncState === "syncing"
                      ? "Sharing Location..."
                      : lastCoords
                        ? "Refresh & Share Location"
                        : "Share Location"}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenSharedLocation}
                    disabled={!lastCoords}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Open in Maps
                  </button>
                </div>

                {syncMessage ? (
                  <p className="mt-3 text-xs text-white/50">{syncMessage}</p>
                ) : null}
              </section>
            </TwinSection>
          </div>

          <div id="party-status" className="scroll-mt-6">
            <TwinSection
              title="Your Night Right Now"
              subtitle="Choose the state that best matches where the night is now"
              tone="fuchsia"
              defaultOpen={!selectedStatus}
            >
              <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">
                      Status Layer
                    </h2>
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
            </TwinSection>
          </div>

          <section className="mb-6 rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(10,15,25,0.92))] p-5 shadow-[0_0_50px_rgba(34,211,238,0.10)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                  TwinMe • Next Move
                </p>

                <p className="mt-2 text-sm leading-6 text-white/60">
                  Adaptive awareness based on crew alignment, signal freshness,
                  isolation, and predictive risk.
                </p>
              </div>

              <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                Active
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                  Crew
                </div>

                <div className="mt-1 text-sm font-semibold text-white">
                  {crewDesync.level}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                  Isolation
                </div>

                <div className="mt-1 text-sm font-semibold text-white">
                  {isolation.level}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                  Freshness
                </div>

                <div className="mt-1 text-sm font-semibold text-white">
                  {stale.level}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                  Risk
                </div>

                <div className="mt-1 text-sm font-semibold text-white">
                  {risk.level}
                </div>
              </div>
            </div>

            <div
              className={`mt-5 rounded-2xl border p-4 ${
                risk.level === "high"
                  ? "border-red-400/25 bg-red-400/[0.07]"
                  : risk.level === "rising"
                    ? "border-amber-400/25 bg-amber-400/[0.07]"
                    : "border-cyan-400/15 bg-cyan-400/[0.06]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className={`text-xs font-black uppercase tracking-[0.18em] ${
                      risk.level === "high"
                        ? "text-red-200"
                        : risk.level === "rising"
                          ? "text-amber-200"
                          : "text-cyan-200"
                    }`}
                  >
                    Recommendation
                  </div>

                  <p className="mt-2 text-sm leading-6 text-white/80">
                    {intervention.actions.length > 0
                      ? intervention.actions[0]
                      : risk.message}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                    risk.level === "high"
                      ? "border-red-300/25 bg-red-300/10 text-red-100"
                      : risk.level === "rising"
                        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                        : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                  }`}
                >
                  {risk.level}
                </span>
              </div>

              {intervention.actions.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {intervention.actions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => handleInterventionAction(action)}
                      className={`inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                        action.toLowerCase().includes("slow down") ||
                        action.toLowerCase().includes("safer environment")
                          ? "border-red-300/25 bg-red-300/10 text-red-100 hover:bg-red-300/15"
                          : action.toLowerCase().includes("reconnect")
                            ? "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100 hover:bg-fuchsia-300/15"
                            : action.toLowerCase().includes("location") ||
                                action.toLowerCase().includes("check in")
                              ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15"
                              : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSendCheckIn()}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15 active:scale-[0.98]"
                >
                  Send Check-In
                </button>
              )}

              <p className="mt-3 text-xs leading-5 text-white/40">
                TwinMe recommendations respond to risk, crew alignment,
                isolation, heartbeat, and signal freshness.
              </p>
            </div>
          </section>

          <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  Live Party Controls
                </h2>
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
                <p className="text-sm leading-6 text-white/80">
                  {locationLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-fuchsia-400/15 bg-[linear-gradient(135deg,rgba(35,14,44,0.72),rgba(7,13,24,0.78))] p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
                      Privacy Layer
                    </div>

                    <p className="mt-1 text-xs leading-5 text-white/45">
                      Control how your location and Party Mode presence appear
                      to your crew.
                    </p>
                  </div>

                  <Shield className="h-5 w-5 text-fuchsia-200/70" />
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      updatePrivacySettings({
                        ...privacy,
                        ghostMode: !privacy.ghostMode,
                      })
                    }
                    className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left transition hover:border-fuchsia-300/25 hover:bg-white/[0.06] active:scale-[0.99]"
                  >
                    <span>
                      <span className="block text-sm font-bold text-white">
                        Ghost Mode
                      </span>
                      <span className="mt-1 block text-xs text-white/45">
                        Replace exact presence details with a low-visibility
                        label.
                      </span>
                    </span>

                    <span
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                        privacy.ghostMode ? "bg-fuchsia-400" : "bg-white/15"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                          privacy.ghostMode ? "left-6" : "left-1"
                        }`}
                      />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updatePrivacySettings({
                        ...privacy,
                        blurPresence: !privacy.blurPresence,
                      })
                    }
                    className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left transition hover:border-cyan-300/25 hover:bg-white/[0.06] active:scale-[0.99]"
                  >
                    <span>
                      <span className="block text-sm font-bold text-white">
                        Blur Presence
                      </span>
                      <span className="mt-1 block text-xs text-white/45">
                        Round shared coordinates to reduce location precision.
                      </span>
                    </span>

                    <span
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                        privacy.blurPresence ? "bg-cyan-400" : "bg-white/15"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                          privacy.blurPresence ? "left-6" : "left-1"
                        }`}
                      />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updatePrivacySettings({
                        ...privacy,
                        trustedOnly: !privacy.trustedOnly,
                      })
                    }
                    className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left transition hover:border-emerald-300/25 hover:bg-white/[0.06] active:scale-[0.99]"
                  >
                    <span>
                      <span className="block text-sm font-bold text-white">
                        Trusted Only
                      </span>
                      <span className="mt-1 block text-xs text-white/45">
                        Restrict live location visibility to your trusted crew
                        layer.
                      </span>
                    </span>

                    <span
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                        privacy.trustedOnly ? "bg-emerald-400" : "bg-white/15"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                          privacy.trustedOnly ? "left-6" : "left-1"
                        }`}
                      />
                    </span>
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.14em]">
                  <span
                    className={`rounded-full border px-3 py-1 ${
                      privacy.ghostMode
                        ? "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100"
                        : "border-white/10 bg-white/5 text-white/35"
                    }`}
                  >
                    Ghost {privacy.ghostMode ? "On" : "Off"}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 ${
                      privacy.blurPresence
                        ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-white/5 text-white/35"
                    }`}
                  >
                    Blur {privacy.blurPresence ? "On" : "Off"}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 ${
                      privacy.trustedOnly
                        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                        : "border-white/10 bg-white/5 text-white/35"
                    }`}
                  >
                    Trusted {privacy.trustedOnly ? "On" : "Off"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-8 mb-8 grid grid-cols-2 gap-3">
            <Link
              href="/crew"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15 active:scale-[0.98]"
            >
              Crew Dashboard
            </Link>

            <Link
              href="/party/join"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 py-2 text-sm font-bold text-fuchsia-100 transition hover:bg-fuchsia-300/15 active:scale-[0.98]"
            >
              Join Crew
            </Link>
          </div>

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
        </TwinPage>
      </div>
    </main>
  );
}
