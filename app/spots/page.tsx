"use client";
import {
  publishVenueRecommendation,
  readVenueRecommendation,
} from "@/lib/twinme/venue-recommendation-bridge";
import { useTonightContext } from "@/hooks/twinme/useTonightContext";
import { decideMoveCandidate } from "@/lib/twinme/move-candidate-engine";
import {
  publishMoveCandidate,
  readMoveCandidate,
} from "@/lib/twinme/move-candidate-bridge";
import { explainVenueFit } from "@/lib/twinme/venue-fit-engine";
import { publishVenueFit, readVenueFit } from "@/lib/twinme/venue-fit-bridge";
import { orchestrateTwinMeRecommendation } from "@/lib/twinme/recommendation-engine";
import {
  publishTwinMeRecommendation,
  readTwinMeRecommendation,
} from "@/lib/twinme/recommendation-bridge";
import { decideRecommendationFreshness } from "@/lib/twinme/recommendation-freshness-engine";
import {
  createRecommendationOutcomeRecord,
  publishRecommendationOutcome,
} from "@/lib/twinme/recommendation-outcome-bridge";
import { publishRecommendationFreshness } from "@/lib/twinme/recommendation-freshness-bridge";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Flame,
  MapPin,
  Shield,
  Sparkles,
  Users,
  Radar,
  Route,
  LocateFixed,
  EyeOff,
  Lock,
  Activity,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { apiUrl } from "@/lib/api-url";
import { Capacitor } from "@capacitor/core";

import AuthGuard from "@/components/auth/AuthGuard";
import { getSharedProfile } from "@/lib/shared-profile";
import { getActiveCrew } from "@/lib/crew-system";

import type { NearbySpot } from "./nearbySpotsData";

type SpotTone = "lit" | "safe" | "risk" | "chill";

type SpotsView = "crew" | "nearby" | "live";

type LivePostType =
  "Great vibe" | "Busy here" | "Getting packed" | "Calm spot" | "Avoid area";

type CrewStatusRow = {
  id?: string;
  name?: string | null;
  status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  vibe_label?: string | null;
  heartbeat_bpm?: number | null;
  updated_at?: string | null;
};

type RadarPoint = {
  id: string;
  name: string;
  tone: SpotTone;
  crew: number;
  x: number;
  y: number;
  note: string;
  distanceKm: number;
  status?: string;
  trusted: boolean;
  blurred: boolean;
  originalName?: string;
  clusterStrength: number;
  intensity: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function getLiveActivityDistance(
  activity: LiveActivity,
  userCoords: { lat: number; lng: number } | null,
) {
  if (
    !userCoords ||
    typeof activity.latitude !== "number" ||
    typeof activity.longitude !== "number"
  ) {
    return null;
  }

  return getDistanceKm(
    userCoords.lat,
    userCoords.lng,
    activity.latitude,
    activity.longitude,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeValue(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function parseStoredStringArray(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }

    if (Array.isArray(parsed?.ids)) {
      return parsed.ids
        .map((item: unknown) => String(item).trim())
        .filter(Boolean);
    }

    if (Array.isArray(parsed?.names)) {
      return parsed.names
        .map((item: unknown) => String(item).trim())
        .filter(Boolean);
    }

    if (Array.isArray(parsed?.members)) {
      return parsed.members
        .map((item: unknown) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object") {
            const maybeName =
              "name" in item
                ? String((item as { name?: unknown }).name || "")
                : "";
            const maybeId =
              "id" in item ? String((item as { id?: unknown }).id || "") : "";
            return maybeName || maybeId;
          }
          return "";
        })
        .filter(Boolean);
    }
  } catch {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseStoredBoolean(raw: string | null) {
  if (!raw) return false;
  const value = raw.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function getToneClasses(tone: SpotTone) {
  if (tone === "lit") {
    return {
      dot: "bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.75)]",
      ring: "border-orange-400/40",
      card: "border-orange-500/20 bg-[linear-gradient(180deg,#24150f,#110c08)]",
      badge: "bg-orange-500/15 text-orange-100",
      haze: "bg-orange-500/10",
    };
  }

  if (tone === "safe") {
    return {
      dot: "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.75)]",
      ring: "border-emerald-400/40",
      card: "border-emerald-500/20 bg-[linear-gradient(180deg,#102019,#09120d)]",
      badge: "bg-emerald-500/15 text-emerald-100",
      haze: "bg-emerald-500/10",
    };
  }

  if (tone === "risk") {
    return {
      dot: "bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.85)]",
      ring: "border-red-400/40",
      card: "border-red-500/20 bg-[linear-gradient(180deg,#2a1417,#15090b)]",
      badge: "bg-red-500/15 text-red-100",
      haze: "bg-red-500/10",
    };
  }

  return {
    dot: "bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.75)]",
    ring: "border-blue-400/40",
    card: "border-blue-500/20 bg-[linear-gradient(180deg,#131c2b,#0b1119)]",
    badge: "bg-blue-500/15 text-blue-100",
    haze: "bg-blue-500/10",
  };
}

function getToneIcon(tone: SpotTone) {
  if (tone === "lit") return <Flame className="h-4 w-4" />;
  if (tone === "safe") return <Shield className="h-4 w-4" />;
  if (tone === "risk") return <AlertTriangle className="h-4 w-4" />;
  return <MapPin className="h-4 w-4" />;
}

type LiveActivity = {
  id: string;
  title: string;
  area: string;
  vibe: string;
  crowd: string;
  minutesAgo: number;
  createdAt?: string;
  userId?: string;
  latitude?: number | null;
  longitude?: number | null;

  activityType?:
    "Nightlife" | "Food" | "Event" | "Sports" | "Outdoor" | "Stay In";

  crowdLevel?: "Low" | "Moderate" | "Busy" | "Packed";

  trusted?: boolean;
  note?: string;
};

type LivePostRow = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  title: string;
  area: string;
  activity_type: LiveActivity["activityType"] | null;
  vibe: string;
  crowd_level: LiveActivity["crowdLevel"] | null;
  note: string | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  trusted: boolean | null;
};

function convertLivePostRow(row: LivePostRow): LiveActivity {
  const createdTime = new Date(row.created_at).getTime();
  const minutesAgo = Math.max(
    0,
    Math.floor((Date.now() - createdTime) / 60000),
  );

  const validActivityTypes: LiveActivity["activityType"][] = [
    "Nightlife",
    "Food",
    "Event",
    "Sports",
    "Outdoor",
    "Stay In",
  ];

  const validCrowdLevels: LiveActivity["crowdLevel"][] = [
    "Low",
    "Moderate",
    "Busy",
    "Packed",
  ];

  const activityType =
    row.activity_type && validActivityTypes.includes(row.activity_type)
      ? row.activity_type
      : "Event";

  const crowdLevel =
    row.crowd_level && validCrowdLevels.includes(row.crowd_level)
      ? row.crowd_level
      : "Moderate";

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    title: row.title,
    area: row.area,
    activityType,
    vibe: row.vibe,
    crowd: crowdLevel,
    crowdLevel,
    minutesAgo,
    trusted: row.trusted ?? false,
    note: row.note || "Live update shared from the area.",
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

function getPointTone(row: CrewStatusRow, distanceKm: number): SpotTone {
  const status = (row.status || "").toLowerCase();
  const vibe = (row.vibe_label || "").toLowerCase();
  const heartbeat = row.heartbeat_bpm || 70;

  if (
    status.includes("help") ||
    status.includes("alert") ||
    status.includes("danger") ||
    vibe.includes("help") ||
    vibe.includes("alert") ||
    vibe.includes("danger")
  ) {
    return "risk";
  }

  if (status.includes("heading home") || status.includes("safe")) {
    return "safe";
  }

  if (
    heartbeat >= 100 ||
    status.includes("club") ||
    status.includes("drinking")
  ) {
    return "lit";
  }

  if (distanceKm <= 1.25) {
    return "chill";
  }

  return "chill";
}

function getPointNote(row: CrewStatusRow, distanceKm: number, tone: SpotTone) {
  const name = row.name || "Crew member";

  if (tone === "risk") {
    return `${name} may need attention. Check in before drift turns into a problem.`;
  }

  if (tone === "safe") {
    return `${name} looks stable or in an exit flow. This may be a good anchor point.`;
  }

  if (tone === "lit") {
    return `${name} is in a high-energy zone. Keep awareness ahead of the pace.`;
  }

  if (distanceKm <= 1) {
    return `${name} is nearby. Good support zone if you want to stay connected.`;
  }

  return `${name} is farther out. Watch for separation if the group starts splitting.`;
}

function getBlurredName(index: number, tone: SpotTone) {
  if (tone === "risk") return `Restricted Alert ${index + 1}`;
  if (tone === "safe") return `Protected Anchor ${index + 1}`;
  if (tone === "lit") return `Blurred Signal ${index + 1}`;
  return `Hidden Point ${index + 1}`;
}

function getBlurredNote(tone: SpotTone, distanceKm: number) {
  if (tone === "risk") {
    return "A non-trusted point is showing elevated concern. Exact details are hidden in this view.";
  }

  if (tone === "safe") {
    return "A non-trusted point appears stable. Exact identity and finer map detail are hidden.";
  }

  if (tone === "lit") {
    return "A non-trusted point is active in a higher-energy area. Precision is intentionally reduced.";
  }

  if (distanceKm <= 1.5) {
    return "A non-trusted point is nearby. Limited detail is shown to protect privacy.";
  }

  return "A non-trusted point is on the grid. Fine detail remains blurred in this view.";
}

function getBaseIntensity(tone: SpotTone, distanceKm: number) {
  const distanceFactor = clamp(1.7 - distanceKm / 3, 0.4, 1.3);

  if (tone === "risk") return clamp(95 * distanceFactor, 40, 100);
  if (tone === "lit") return clamp(78 * distanceFactor, 30, 95);
  if (tone === "safe") return clamp(58 * distanceFactor, 20, 85);
  return clamp(46 * distanceFactor, 15, 75);
}

function MiniMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
          {label}
        </span>
        <span className="text-sm font-semibold text-white">{value}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white/80 transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

const getPartyStatusKey = (userId: string) => `twincore_party_status_${userId}`;

const getLastSharedLocationKey = (userId: string) =>
  `twincore_last_shared_location_${userId}`;

const LIVE_POST_EXPIRY_MINUTES = 180;

function getLiveReportWeight(minutesAgo: number) {
  if (minutesAgo <= 10) return 1;
  if (minutesAgo <= 30) return 0.75;
  if (minutesAgo <= 60) return 0.5;
  if (minutesAgo <= 120) return 0.25;

  return 0;
}

const LIVE_REPORT_COOLDOWN_MINUTES = 30;

const isLiveReportFresh = (activity: LiveActivity) =>
  activity.minutesAgo <= LIVE_POST_EXPIRY_MINUTES;

type CrowdTrend = "rising" | "steady" | "falling" | "unknown";

type VenueMomentum = "building" | "peak" | "cooling" | "stable";

function getCrowdTrend(activities: LiveActivity[]): CrowdTrend {
  const crowdScore = (crowdLevel?: string) => {
    const normalized = crowdLevel?.trim().toLowerCase();

    if (normalized === "packed") return 4;
    if (normalized === "busy") return 3;
    if (normalized === "moderate") return 2;
    if (normalized === "low") return 1;

    return null;
  };

  const usableReports = activities
    .filter(isLiveReportFresh)
    .map((activity) => ({
      minutesAgo: activity.minutesAgo,
      score: crowdScore(activity.crowdLevel),
    }))
    .filter(
      (
        report,
      ): report is {
        minutesAgo: number;
        score: number;
      } => report.score !== null,
    )
    .sort((a, b) => a.minutesAgo - b.minutesAgo);

  if (usableReports.length < 2) {
    return "unknown";
  }

  const midpoint = Math.ceil(usableReports.length / 2);

  const newerReports = usableReports.slice(0, midpoint);

  const olderReports = usableReports.slice(midpoint);

  if (olderReports.length === 0) {
    return "unknown";
  }

  const average = (
    reports: Array<{
      score: number;
    }>,
  ) =>
    reports.reduce((total, report) => total + report.score, 0) / reports.length;

  const newerAverage = average(newerReports);

  const olderAverage = average(olderReports);

  const difference = newerAverage - olderAverage;

  if (difference >= 0.75) {
    return "rising";
  }

  if (difference <= -0.75) {
    return "falling";
  }

  return "steady";
}

function getVenueMomentum(
  crowdTrend: CrowdTrend,
  crowdLevel: string,
  timeOfDay: string,
): VenueMomentum {
  const level = crowdLevel.trim().toLowerCase();

  if (
    crowdTrend === "rising" &&
    (timeOfDay === "evening" || timeOfDay === "late night")
  ) {
    return "building";
  }

  if (crowdTrend === "rising" && level === "packed") {
    return "peak";
  }

  if (crowdTrend === "falling") {
    return "cooling";
  }

  return "stable";
}

function getCrowdOccupancyPercent(crowdLevel?: string, liveReportCount = 0) {
  const normalizedCrowdLevel = crowdLevel?.trim().toLowerCase();

  switch (normalizedCrowdLevel) {
    case "quiet":
    case "calm":
    case "low":
      return 25;

    case "moderate":
    case "active":
      return 50;

    case "busy":
      return 75;

    case "packed":
    case "very busy":
      return 100;
  }

  if (liveReportCount >= 8) return 100;
  if (liveReportCount >= 5) return 80;
  if (liveReportCount >= 3) return 60;
  if (liveReportCount >= 2) return 45;
  if (liveReportCount === 1) return 25;

  return 15;
}

function getTwinMePrediction(spot: {
  occupancyPercent: number;
  momentum?: string;
  crowdTrend?: string;
  heatScore?: number;
}) {
  const momentum = spot.momentum?.trim().toLowerCase();

  const crowdTrend = spot.crowdTrend?.trim().toLowerCase();

  if (momentum === "peak" || spot.occupancyPercent >= 90) {
    return {
      icon: "🔥",
      title: "Peak activity",
      message: "Expect longer waits and a lively atmosphere.",
      confidence: 95,
    };
  }

  if (momentum === "building" || crowdTrend === "rising") {
    return {
      icon: "📈",
      title: "Getting busier",
      message:
        "Activity is increasing. Arriving within the next 20–30 minutes is recommended.",
      confidence: 88,
    };
  }

  if (momentum === "cooling" || crowdTrend === "falling") {
    return {
      icon: "🌙",
      title: "Calming down",
      message:
        "Crowds are easing. A quieter experience is likely if you wait a little longer.",
      confidence: 84,
    };
  }

  return {
    icon: "🤖",
    title: "Steady conditions",
    message: "No significant changes detected. Conditions appear stable.",
    confidence: 75,
  };
}

function getTimeOfDayLabel() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) {
    return "morning";
  }

  if (hour >= 11 && hour < 17) {
    return "afternoon";
  }

  if (hour >= 17 && hour < 22) {
    return "evening";
  }

  return "late night";
}

function getArrivalRecommendation(
  spot: {
    isOpen?: boolean | null;
    distanceKm: number;
    liveReportCount: number;
    corroborationLevel: string;
    latestLiveReport?: LiveActivity | null;
    crowdTrend?: CrowdTrend;
  },
  timeOfDay: string,
) {
  const crowdLevel = spot.latestLiveReport?.crowdLevel?.toLowerCase() ?? "";

  // ==========================
  // 1. CLOSED CHECK
  // ==========================
  if (spot.isOpen === false) {
    return {
      label: "Closed",
      colour: "red",
      message: "Currently closed.",
    };
  }

  if (spot.crowdTrend === "rising" && crowdLevel === "packed") {
    return {
      label: "Wait",
      colour: "amber",
      message: "The crowd is already packed and still getting busier.",
    };
  }

  if (spot.crowdTrend === "falling" && spot.liveReportCount >= 2) {
    return {
      label: "Go soon",
      colour: "emerald",
      message:
        "The crowd appears to be calming down, making this a better time to go.",
    };
  }

  if (spot.corroborationLevel === "strong" && crowdLevel === "packed") {
    return {
      label: "Wait",
      colour: "amber",
      message: "Very busy right now. Consider waiting a little.",
    };
  }

  if (spot.distanceKm <= 1 && spot.liveReportCount > 0) {
    return {
      label: "Go now",
      colour: "emerald",
      message: `Good ${timeOfDay} option with recent activity.`,
    };
  }

  return {
    label: "Good option",
    colour: "blue",
    message: `Worth visiting this ${timeOfDay}.`,
  };
}

function getCrowdLevelScore(crowdLevel?: string) {
  switch (crowdLevel?.trim().toLowerCase()) {
    case "quiet":
    case "calm":
    case "low":
      return 1;

    case "moderate":
    case "active":
      return 2;

    case "busy":
      return 3;

    case "packed":
    case "very busy":
      return 4;

    default:
      return 0;
  }
}

export default function SpotsPage() {
  const { tonight } = useTonightContext();

  const [activeView, setActiveView] = useState<SpotsView>("crew");

  const [nearbyCategory, setNearbyCategory] = useState<
    NearbySpot["category"] | "All"
  >("All");

  const [heatFilter, setHeatFilter] = useState<"All" | "Hot" | "Busy" | "Calm">(
    "All",
  );

  const [realNearbySpots, setRealNearbySpots] = useState<NearbySpot[]>([]);

  const [nearbyLoading, setNearbyLoading] = useState(false);

  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const [liveFilter, setLiveFilter] = useState<
    LiveActivity["activityType"] | "All"
  >("All");
  const [postComposerOpen, setPostComposerOpen] = useState(false);
  const [databaseLivePosts, setDatabaseLivePosts] = useState<LiveActivity[]>(
    [],
  );
  const [livePostType, setLivePostType] = useState<LivePostType>("Great vibe");

  const [livePostNote, setLivePostNote] = useState("");

  const [livePostLocation, setLivePostLocation] = useState("Current Location");

  const [liveLocationMode, setLiveLocationMode] = useState<"current" | "venue">(
    "current",
  );

  const [displayName, setDisplayName] = useState("Crew Member");
  const [partyStatus, setPartyStatus] = useState<string | null>(null);
  const [hasSharedLocation, setHasSharedLocation] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string>("");
  const [sweepOn, setSweepOn] = useState(true);
  const [liveTick, setLiveTick] = useState(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [crewRows, setCrewRows] = useState<CrewStatusRow[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [ghostMode, setGhostMode] = useState(false);
  const [trustedOnly, setTrustedOnly] = useState(false);
  const [trustedIds, setTrustedIds] = useState<string[]>([]);
  const [trustedNames, setTrustedNames] = useState<string[]>([]);

  useEffect(() => {
    async function loadSpotsPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const savedName = user
        ? window.localStorage.getItem(`twincore_display_name_${user.id}`)
        : null;
      const savedStatus = user
        ? window.localStorage.getItem(getPartyStatusKey(user.id))
        : null;

      const savedLocation = user
        ? window.localStorage.getItem(getLastSharedLocationKey(user.id))
        : null;

      const savedGhostMode =
        window.localStorage.getItem("twincore_ghost_mode") ||
        window.localStorage.getItem("ghost_mode");

      const savedTrustedOnly =
        window.localStorage.getItem("twincore_trusted_only") ||
        window.localStorage.getItem("trusted_crew_only");

      const savedTrustedIds =
        window.localStorage.getItem("twincore_trusted_crew_ids") ||
        window.localStorage.getItem("trusted_crew_ids");

      const savedTrustedNames =
        window.localStorage.getItem("twincore_trusted_crew_names") ||
        window.localStorage.getItem("trusted_crew_names") ||
        window.localStorage.getItem("twincore_trusted_crew");

      if (user) {
        const sharedProfile = await getSharedProfile(user.id);
        const authoritativeDisplayName =
          sharedProfile?.display_name?.trim() ||
          savedName?.trim() ||
          "Crew Member";

        setDisplayName(authoritativeDisplayName);
      }

      if (savedStatus) setPartyStatus(savedStatus);
      if (savedLocation) setHasSharedLocation(true);

      setGhostMode(parseStoredBoolean(savedGhostMode));
      setTrustedOnly(parseStoredBoolean(savedTrustedOnly));
      setTrustedIds(
        parseStoredStringArray(savedTrustedIds).map(normalizeValue),
      );
      setTrustedNames(
        parseStoredStringArray(savedTrustedNames).map(normalizeValue),
      );

      const interval = window.setInterval(() => {
        setLiveTick((prev) => !prev);
      }, 1800);

      return () => window.clearInterval(interval);
    }

    loadSpotsPage();
  }, []);

  useEffect(() => {
    if (ghostMode) {
      setLocationError(
        "Ghost Mode is on. Your exact position is being visually softened.",
      );
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserCoords(nextCoords);
        setLocationError(null);
      },
      (error) => {
        console.warn(
              "Geolocation unavailable; Spots will continue without live location.",
              error
            );
        setLocationError("Unable to get your location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }, [ghostMode]);

  useEffect(() => {
    async function loadCrewStatus() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCrewRows([]);
        return;
      }

      const activeCrew = await getActiveCrew(user.id);

      if (!activeCrew) {
        setCrewRows([]);
        return;
      }

      const { data, error } = await supabase
        .from("crew_status")
        .select(
          "id,name,status,latitude,longitude,location_name,vibe_label,heartbeat_bpm,updated_at",
        )
        .eq("crew_id", activeCrew.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Unable to load active Crew status:", error);
        setCrewRows([]);
        return;
      }

      if (Array.isArray(data)) {
        setCrewRows(data as CrewStatusRow[]);
      }
    }

    void loadCrewStatus();

    const channel = supabase
      .channel("spots-radar-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crew_status" },
        async () => {
          await loadCrewStatus();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crew_members" },
        async () => {
          await loadCrewStatus();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    async function loadLivePosts() {
      const { data, error } = await supabase
        .from("spots_live_posts")
        .select(
          "id,user_id,display_name,title,area,activity_type,vibe,crowd_level,note,created_at,latitude,longitude,trusted",
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Unable to load live reports:", error);
        return;
      }

      if (Array.isArray(data)) {
        setDatabaseLivePosts((data as LivePostRow[]).map(convertLivePostRow));
      }
    }

    void loadLivePosts();

    const channel = supabase
      .channel("spots-live-posts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "spots_live_posts",
        },
        async () => {
          await loadLivePosts();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const userPosition = useMemo(() => {
    if (!userCoords) {
      if (partyStatus === "Heading home" || partyStatus === "Safe") {
        return { x: 22, y: 58 };
      }

      if (partyStatus === "At club" || partyStatus === "Drinking") {
        return { x: 64, y: 34 };
      }

      if (partyStatus === "Listening to music") {
        return { x: 46, y: 42 };
      }

      return { x: 38, y: 48 };
    }

    return { x: 50, y: 50 };
  }, [partyStatus, userCoords]);

  const hasRealSignals = useMemo(() => {
    return crewRows.some(
      (row) =>
        typeof row.latitude === "number" &&
        typeof row.longitude === "number" &&
        Number.isFinite(row.latitude) &&
        Number.isFinite(row.longitude),
    );
  }, [crewRows]);

  const radarPoints = useMemo(() => {
    if (!userCoords) {
      return [] as RadarPoint[];
    }

    const validRows = crewRows.filter(
      (row) =>
        typeof row.latitude === "number" &&
        typeof row.longitude === "number" &&
        Number.isFinite(row.latitude) &&
        Number.isFinite(row.longitude),
    );

    if (validRows.length === 0) {
      return [] as RadarPoint[];
    }

    const draftPoints = validRows.map((row, index) => {
      const distanceKm = getDistanceKm(
        userCoords.lat,
        userCoords.lng,
        row.latitude as number,
        row.longitude as number,
      );

      const latDiff = (row.latitude as number) - userCoords.lat;
      const lngDiff = (row.longitude as number) - userCoords.lng;

      const scaledX = clamp(50 + lngDiff * 9000, 10, 90);
      const scaledY = clamp(50 - latDiff * 9000, 10, 90);

      const tone = getPointTone(row, distanceKm);
      const baseNote = getPointNote(row, distanceKm, tone);
      const slightShift = liveTick
        ? tone === "lit"
          ? 0.55
          : tone === "risk"
            ? 0.35
            : 0
        : tone === "lit"
          ? -0.55
          : tone === "risk"
            ? -0.35
            : 0;

      const rowId = normalizeValue(row.id);
      const rowName = normalizeValue(row.name);
      const trusted =
        (!!rowId && trustedIds.includes(rowId)) ||
        (!!rowName && trustedNames.includes(rowName));

      const blurred = !trusted;
      const displayX = blurred ? clamp(scaledX + 2.4, 10, 90) : scaledX;
      const displayY = blurred ? clamp(scaledY - 2.4, 10, 90) : scaledY;

      return {
        id: row.id || `crew-${index}`,
        name: blurred
          ? getBlurredName(index, tone)
          : row.name || `Crew ${index + 1}`,
        originalName: row.name || `Crew ${index + 1}`,
        tone,
        crew: trusted ? (tone === "chill" || tone === "safe" ? 1 : 0) : 0,
        x: tone === "lit" ? displayX + slightShift : displayX,
        y: tone === "risk" ? displayY + slightShift : displayY,
        note: blurred ? getBlurredNote(tone, distanceKm) : baseNote,
        distanceKm,
        status: row.status || "active",
        trusted,
        blurred,
        clusterStrength: 1,
        intensity: getBaseIntensity(tone, distanceKm),
      } as RadarPoint;
    });

    const withClusters = draftPoints.map((point) => {
      const closeCount = draftPoints.filter((other) => {
        if (other.id === point.id) return false;
        const dx = other.x - point.x;
        const dy = other.y - point.y;
        const gridDistance = Math.sqrt(dx * dx + dy * dy);
        return gridDistance <= 18;
      }).length;

      const clusterStrength = clamp(closeCount + 1, 1, 4);
      const boostedIntensity = clamp(
        point.intensity + clusterStrength * (point.tone === "risk" ? 6 : 4),
        15,
        100,
      );

      let note = point.note;

      if (clusterStrength >= 3 && point.tone === "lit") {
        note = point.blurred
          ? "A non-trusted high-energy cluster is forming here. Detail remains limited."
          : `${point.originalName || point.name} is part of an active cluster. Energy is building in this area.`;
      }

      if (clusterStrength >= 3 && point.tone === "safe") {
        note = point.blurred
          ? "A protected support cluster is visible here. Detail remains limited."
          : `${point.originalName || point.name} is sitting in a stronger support cluster. This could be a useful regroup zone.`;
      }

      if (clusterStrength >= 2 && point.tone === "risk") {
        note = point.blurred
          ? "A non-trusted elevated cluster is visible here. Treat this area carefully."
          : `${point.originalName || point.name} is in an elevated cluster. Attention here matters sooner, not later.`;
      }

      return {
        ...point,
        clusterStrength,
        intensity: boostedIntensity,
        note,
      };
    });

    if (trustedOnly) {
      return withClusters.filter((point) => point.trusted);
    }

    return withClusters;
  }, [crewRows, userCoords, liveTick, trustedIds, trustedNames, trustedOnly]);

  useEffect(() => {
    if (!selectedSpotId && radarPoints.length > 0) {
      setSelectedSpotId(radarPoints[0].id);
      return;
    }

    const stillExists = radarPoints.some((spot) => spot.id === selectedSpotId);
    if (!stillExists) {
      setSelectedSpotId(radarPoints[0]?.id || "");
    }
  }, [radarPoints, selectedSpotId]);

  const selectedSpot =
    radarPoints.find((spot) => spot.id === selectedSpotId) ?? radarPoints[0];

  const nearbyCount = useMemo(() => {
    return radarPoints.filter((point) => point.distanceKm <= 1.5).length;
  }, [radarPoints]);

  const trustedVisibleCount = radarPoints.filter(
    (point) => point.trusted,
  ).length;
  const visibleCount = radarPoints.length;
  const riskCount = radarPoints.filter((point) => point.tone === "risk").length;
  const litCount = radarPoints.filter((point) => point.tone === "lit").length;
  const safeCount = radarPoints.filter((point) => point.tone === "safe").length;
  const hotspotCount = radarPoints.filter(
    (point) => point.clusterStrength >= 3,
  ).length;

  const radarEnergy = useMemo(() => {
    if (riskCount > 0) return "risk";
    if (litCount >= 2 || hotspotCount >= 1) return "lit";
    if (safeCount >= 1) return "safe";
    return "calm";
  }, [riskCount, litCount, hotspotCount, safeCount]);

  const sweepDuration = useMemo(() => {
    if (!sweepOn) return 0;
    if (radarEnergy === "risk") return 2.2;
    if (radarEnergy === "lit") return 2.8;
    if (radarEnergy === "safe") return 3.6;
    return 4.4;
  }, [radarEnergy, sweepOn]);

  const ambientClasses = useMemo(() => {
    if (radarEnergy === "risk") {
      return {
        top: "bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_34%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.08),transparent_30%)]",
        orbA: "bg-red-500/12",
        orbB: "bg-orange-500/10",
      };
    }

    if (radarEnergy === "lit") {
      return {
        top: "bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.16),transparent_34%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.08),transparent_28%)]",
        orbA: "bg-orange-500/12",
        orbB: "bg-fuchsia-500/10",
      };
    }

    if (radarEnergy === "safe") {
      return {
        top: "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_34%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.08),transparent_28%)]",
        orbA: "bg-emerald-500/10",
        orbB: "bg-cyan-500/10",
      };
    }

    return {
      top: "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.06),transparent_28%)]",
      orbA: "bg-blue-500/10",
      orbB: "bg-cyan-500/8",
    };
  }, [radarEnergy]);

  const emptyStateReason = useMemo(() => {
    if (!hasSharedLocation && !userCoords) {
      return "Turn on location to place your live awareness grid around you.";
    }

    if (!hasRealSignals) {
      if (trustedOnly) {
        return "No trusted live crew signals are available right now.";
      }

      return "No live crew signals are on the map yet.";
    }

    return "No visible signals right now.";
  }, [hasSharedLocation, userCoords, hasRealSignals, trustedOnly]);

  const twinInsight = useMemo(() => {
    if (ghostMode && trustedOnly) {
      return "TwinMe: Ghost Mode and Trusted Crew Only are both on. Your view is privacy-first and restricted to trusted signals.";
    }

    if (ghostMode) {
      return "TwinMe: Ghost Mode is on. Your exact position is visually softened while awareness stays active.";
    }

    if (trustedOnly && radarPoints.length === 0) {
      return "TwinMe: trusted-only view is active, but there are no trusted live signals right now.";
    }

    if (trustedOnly) {
      return "TwinMe: only trusted crew signals are being shown right now.";
    }

    if (!hasSharedLocation && !userCoords) {
      return "TwinMe: turn location on to improve live awareness and place your grid around your actual position.";
    }

    if (radarPoints.length === 0) {
      return "TwinMe: there are no live signals yet. Stay intentional, keep your status current, and let the grid populate naturally.";
    }

    if (!selectedSpot) {
      return "TwinMe: no live crew points yet. Keep awareness high until more signals arrive.";
    }

    if (!selectedSpot.trusted) {
      return "TwinMe: this point is outside your trusted layer, so details are intentionally blurred.";
    }

    if (selectedSpot.tone === "risk" && selectedSpot.clusterStrength >= 2) {
      return "TwinMe: risk is concentrating here. Move early if you need to intervene or exit.";
    }

    if (selectedSpot.tone === "risk") {
      return "TwinMe: this point needs attention. Someone may be isolated, off-pattern, or signaling risk.";
    }

    if (selectedSpot.tone === "lit" && selectedSpot.clusterStrength >= 3) {
      return "TwinMe: this zone is heating up. High energy plus clustering can change the night fast.";
    }

    if (selectedSpot.tone === "lit") {
      return "TwinMe: energy is high here. Only move in if your people are aligned and your exit stays easy.";
    }

    if (selectedSpot.tone === "safe" && selectedSpot.clusterStrength >= 2) {
      return "TwinMe: this looks like a strong regroup pocket. Good place to stabilize the night.";
    }

    if (selectedSpot.tone === "safe") {
      return "TwinMe: this looks like a strong anchor or reset point if you want to cool the night down.";
    }

    if (selectedSpot.distanceKm > 3) {
      return "TwinMe: this crew point is getting far from you. Watch for separation before it becomes a problem.";
    }

    return "TwinMe: this area looks more balanced. Stay aware, but it is a better choice than high-chaos spots.";
  }, [
    ghostMode,
    trustedOnly,
    hasSharedLocation,
    userCoords,
    radarPoints.length,
    selectedSpot,
  ]);

  const safetyState = useMemo(() => {
    if (radarPoints.length === 0) return "waiting";
    if (!selectedSpot) return "aware";
    if (!selectedSpot.trusted) return "restricted";
    if (selectedSpot.tone === "risk") return "high attention";
    if (selectedSpot.tone === "lit") return "active";
    if (selectedSpot.tone === "safe") return "stable";
    return "aware";
  }, [selectedSpot, radarPoints.length]);

  const gridLabel = useMemo(() => {
    if (radarPoints.length === 0) return "Standby";
    if (radarEnergy === "risk") return "Elevated";
    if (radarEnergy === "lit") return "Surging";
    if (radarEnergy === "safe") return "Stable";
    return "Balanced";
  }, [radarEnergy, radarPoints.length]);

  useEffect(() => {
    if (!selectedSpot) return;

    const snapshot = {
      visibleCount,
      nearbyCount,
      hotspotCount,
      riskCount,
      safeCount,
      trustedVisibleCount,
      radarEnergy,
      selectedTone: selectedSpot.tone,
      selectedName: selectedSpot.originalName || selectedSpot.name || null,
      selectedDistanceKm:
        typeof selectedSpot.distanceKm === "number"
          ? Number(selectedSpot.distanceKm.toFixed(2))
          : null,
      selectedTrusted: selectedSpot.trusted,
      selectedBlurred: selectedSpot.blurred,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      "twincore_spots_snapshot",
      JSON.stringify(snapshot),
    );
  }, [
    visibleCount,
    nearbyCount,
    hotspotCount,
    riskCount,
    safeCount,
    trustedVisibleCount,
    radarEnergy,
    selectedSpot,
  ]);

  const availableNearbySpots = useMemo(() => {
    return realNearbySpots;
  }, [realNearbySpots]);

  const filteredNearbySpots = useMemo(() => {
    if (nearbyCategory === "All") {
      return availableNearbySpots;
    }

    return availableNearbySpots.filter(
      (spot) => spot.category === nearbyCategory,
    );
  }, [nearbyCategory, availableNearbySpots]);

  const filteredLiveActivities = useMemo(() => {
    const allLiveActivities = [
      ...databaseLivePosts,
    ];

    const uniqueActivities = allLiveActivities.filter(
      (activity, index, array) =>
        array.findIndex((item) => item.id === activity.id) === index,
    );

    const freshActivities = uniqueActivities.filter(isLiveReportFresh);

    const nearbyActivities = freshActivities.filter((activity) => {
      const distance = getLiveActivityDistance(activity, userCoords);

      if (distance === null) {
        return true;
      }

      return distance <= 25;
    });

    if (liveFilter === "All") {
      return nearbyActivities;
    }

    return nearbyActivities.filter(
      (activity) => activity.activityType === liveFilter,
    );
  }, [liveFilter, databaseLivePosts, userCoords]);

  const nearbySpotsWithLiveActivity = useMemo(() => {
    return filteredNearbySpots
      .map((spot) => {
        const matchingLiveReports = filteredLiveActivities.filter(
          (activity) =>
            isLiveReportFresh(activity) &&
            activity.area.trim().toLowerCase() ===
              spot.name.trim().toLowerCase(),
        );

        const recentTimeline = [...matchingLiveReports]
          .sort((a, b) => a.minutesAgo - b.minutesAgo)
          .slice(0, 3);

        const latestReport = recentTimeline[0] ?? null;

        const crowdTrend = getCrowdTrend(recentTimeline);

        const uniqueReporterIds = new Set(
          matchingLiveReports
            .map((report) => report.userId)
            .filter((userId): userId is string => Boolean(userId)),
        );

        const uniqueReporterCount = uniqueReporterIds.size;

        const liveSignalStrength = matchingLiveReports.reduce(
          (total, report) => total + getLiveReportWeight(report.minutesAgo),
          0,
        );

        const corroborationLevel =
          uniqueReporterCount >= 3
            ? "strong"
            : uniqueReporterCount >= 2
              ? "moderate"
              : matchingLiveReports.length >= 1
                ? "single"
                : "none";

        const occupancyPercent = getCrowdOccupancyPercent(
          latestReport?.crowdLevel,
          matchingLiveReports.length,
        );

        const momentum =
          occupancyPercent >= 90
            ? "peak"
            : crowdTrend === "rising"
              ? "building"
              : crowdTrend === "falling"
                ? "cooling"
                : "steady";

        const trustedReportCount = matchingLiveReports.filter(
          (report) => report.trusted,
        ).length;

        const freshReportCount = matchingLiveReports.filter(
          (report) => report.minutesAgo <= 30,
        ).length;

        let heatScore: number;

        if (matchingLiveReports.length > 0) {
          const weightedReports = matchingLiveReports.map((report) => {
            const crowdScore =
              report.crowdLevel === "Packed"
                ? 95
                : report.crowdLevel === "Busy"
                  ? 72
                  : report.crowdLevel === "Moderate"
                    ? 45
                    : report.crowdLevel === "Low"
                      ? 20
                      : 15;

            const freshnessWeight =
              report.minutesAgo <= 10
                ? 1.25
                : report.minutesAgo <= 30
                  ? 1
                  : report.minutesAgo <= 60
                    ? 0.75
                    : 0.5;

            const trustWeight = report.trusted ? 1.15 : 1;

            return {
              score: crowdScore * freshnessWeight * trustWeight,
              weight: freshnessWeight * trustWeight,
            };
          });

          const weightedTotal = weightedReports.reduce(
            (total, report) => total + report.score,
            0,
          );

          const totalWeight = weightedReports.reduce(
            (total, report) => total + report.weight,
            0,
          );

          heatScore =
            totalWeight > 0 ? weightedTotal / totalWeight : occupancyPercent;

          heatScore += Math.min(12, matchingLiveReports.length * 3);
          heatScore += Math.min(8, uniqueReporterCount * 2);
          heatScore += trustedReportCount * 3;
          heatScore += freshReportCount * 2;

          if (momentum === "peak") {
            heatScore += 15;
          } else if (momentum === "building") {
            heatScore += 10;
          } else if (momentum === "cooling") {
            heatScore -= 8;
          }
        } else {
          const ratingSignal =
            typeof spot.rating === "number"
              ? Math.max(0, (spot.rating - 3) * 6)
              : 0;

          const reviewSignal =
            typeof spot.reviewCount === "number"
              ? Math.min(12, Math.log10(spot.reviewCount + 1) * 4)
              : 0;

          const openSignal =
            spot.isOpen === true ? 6 : spot.isOpen === false ? -8 : 0;

          heatScore = 10 + ratingSignal + reviewSignal + openSignal;
        }

        heatScore = Math.max(0, Math.min(100, Math.round(heatScore)));
        return {
          ...spot,

          liveReportCount: matchingLiveReports.length,
          uniqueReporterCount,

          latestLiveReport: latestReport,
          recentTimeline,

          crowdTrend,
          occupancyPercent,
          momentum,
          heatScore,

          prediction: getTwinMePrediction({
            occupancyPercent,
            momentum,
            crowdTrend,
            heatScore,
          }),

          liveSignalStrength,
          corroborationLevel,
        };
      })
      .filter((spot) => {
        if (heatFilter === "Hot") {
          return spot.heatScore >= 85;
        }

        if (heatFilter === "Busy") {
          return spot.heatScore >= 65 && spot.heatScore < 85;
        }

        if (heatFilter === "Calm") {
          return spot.heatScore < 35;
        }

        return true;
      })
      .sort((firstSpot, secondSpot) => {
        return secondSpot.heatScore - firstSpot.heatScore;
      });
  }, [filteredNearbySpots, filteredLiveActivities, heatFilter]);

  const twinMeNearbySuggestion = useMemo(() => {
    const timeOfDay = getTimeOfDayLabel();

    if (nearbySpotsWithLiveActivity.length === 0) {
      return {
        spotName: "No recommendation yet",
        message:
          "TwinMe is waiting for nearby places and live activity before making a recommendation.",
        reasons: [],
        matchConfidence: 0,
      };
    }

    const normalizedPartyStatus = (partyStatus || "").trim().toLowerCase();

    const tonightVibe = (tonight.vibeLabel || "").trim().toLowerCase();
    const tonightFeeling = (tonight.desiredFeeling || "").trim().toLowerCase();
    const tonightDestination = (tonight.destination || "").trim().toLowerCase();
    const tonightDressCode = (tonight.dressCode || "").trim().toLowerCase();
    const tonightOccasion = (tonight.occasion || "").trim().toLowerCase();

    const tonightSignal = [
      tonightVibe,
      tonightFeeling,
      tonightDestination,
      tonightDressCode,
      tonightOccasion,
    ]
      .filter(Boolean)
      .join(" ");

    const crewNeedsStability =
      riskCount > 0 ||
      normalizedPartyStatus.includes("heading home") ||
      normalizedPartyStatus.includes("safe");

    const crewIsHighEnergy =
      normalizedPartyStatus.includes("club") ||
      normalizedPartyStatus.includes("drinking") ||
      normalizedPartyStatus.includes("music");

    const rankedSpots = [...nearbySpotsWithLiveActivity]
      .map((spot) => {
        let score = 50;
        const reasons: string[] = [];

        // DISTANCE
        if (spot.distanceKm <= 0.5) {
          score += 18;
          reasons.push("Very close to you");
        } else if (spot.distanceKm <= 1) {
          score += 14;
          reasons.push("Less than 1 km away");
        } else if (spot.distanceKm <= 2) {
          score += 9;
          reasons.push("Nearby");
        } else if (spot.distanceKm <= 5) {
          score += 4;
        }

        // GOOGLE RATING
        if (typeof spot.rating === "number" && spot.rating >= 4.7) {
          score += 14;
          reasons.push(`Highly rated at ${spot.rating.toFixed(1)}★`);
        } else if (typeof spot.rating === "number" && spot.rating >= 4.3) {
          score += 10;
          reasons.push(`Strong ${spot.rating.toFixed(1)}★ rating`);
        } else if (typeof spot.rating === "number" && spot.rating >= 4) {
          score += 6;
        }

        // REVIEW CONFIDENCE
        if (typeof spot.reviewCount === "number" && spot.reviewCount >= 100) {
          score += 6;
          reasons.push(`${spot.reviewCount} Google reviews`);
        } else if (
          typeof spot.reviewCount === "number" &&
          spot.reviewCount >= 25
        ) {
          score += 3;
        }

        // OPENING STATUS
        if (spot.isOpen === true) {
          score += 8;
          reasons.push("Open right now");
        } else if (spot.isOpen === false) {
          score -= 35;
          reasons.push("Currently closed");
        }

        const vibe = spot.vibe.toLowerCase();

        const crowdLevel =
          spot.latestLiveReport?.crowdLevel?.toLowerCase() ?? "";

        score += Math.max(0, 25 - spot.distanceKm * 5);

        // LIVE SIGNAL STRENGTH
        score += Math.min(30, spot.liveSignalStrength * 12);

        // TIME-OF-DAY INTELLIGENCE
        if (timeOfDay === "morning") {
          if (spot.category === "Food") {
            score += 8;
            reasons.push("Fits the morning");
          }

          if (spot.category === "Nightlife") {
            score -= 15;
          }
        }

        if (timeOfDay === "afternoon") {
          if (spot.category === "Food" || spot.category === "Outdoor") {
            score += 6;
            reasons.push("Good afternoon option");
          }
        }

        if (timeOfDay === "evening") {
          if (
            spot.category === "Food" ||
            spot.category === "Nightlife" ||
            spot.category === "Events"
          ) {
            score += 10;
            reasons.push("Fits the evening");
          }
        }

        if (timeOfDay === "late night") {
          if (spot.category === "Nightlife") {
            score += 14;
            reasons.push("Strong late-night fit");
          }

          if (spot.category === "Outdoor" || spot.category === "Sports") {
            score -= 8;
          }
        }

        // MULTIPLE REPORTS
        if (spot.corroborationLevel === "strong") {
          score += 20;
          reasons.push("Multiple independent live reports confirm activity");
        } else if (spot.corroborationLevel === "moderate") {
          score += 12;
          reasons.push("Live activity has been independently confirmed");
        } else if (spot.liveReportCount > 0) {
          score += 5;
          reasons.push("Recent live activity reported here");
        }

        // CROWD TREND
        if (spot.crowdTrend === "rising") {
          score += 8;
          reasons.push("Activity is getting busier");
        }

        if (spot.crowdTrend === "steady") {
          score += 3;
          reasons.push("Crowd activity is holding steady");
        }

        if (spot.crowdTrend === "falling") {
          if (crewNeedsStability) {
            score += 8;
            reasons.push("The crowd appears to be calming down");
          } else {
            score -= 4;
          }
        }

        // R14.1 — CANONICAL TONIGHT CONTEXT
        if (tonightSignal) {
          const wantsHighEnergy =
            tonightSignal.includes("we outside") ||
            tonightSignal.includes("high energy") ||
            tonightSignal.includes("party") ||
            tonightSignal.includes("club") ||
            tonightSignal.includes("nightlife") ||
            tonightSignal.includes("dance") ||
            tonightSignal.includes("lit");

          const wantsCalm =
            tonightSignal.includes("comfortable") ||
            tonightSignal.includes("relaxed") ||
            tonightSignal.includes("chill") ||
            tonightSignal.includes("calm") ||
            tonightSignal.includes("quiet");

          const wantsFood =
            tonightSignal.includes("dinner") ||
            tonightSignal.includes("restaurant") ||
            tonightSignal.includes("food") ||
            tonightSignal.includes("date");

          const wantsEvent =
            tonightSignal.includes("event") ||
            tonightSignal.includes("concert") ||
            tonightSignal.includes("celebration") ||
            tonightSignal.includes("birthday");

          if (
            wantsHighEnergy &&
            (spot.category === "Nightlife" ||
              vibe.includes("high energy") ||
              vibe.includes("active"))
          ) {
            score += 24;
            reasons.push("Matches what you want from tonight");
          }

          if (
            wantsCalm &&
            (vibe.includes("relaxed") ||
              vibe.includes("calm") ||
              spot.category === "Food")
          ) {
            score += 20;
            reasons.push("Fits the calmer direction you want tonight");
          }

          if (wantsFood && spot.category === "Food") {
            score += 18;
            reasons.push("Fits tonight's food or dinner direction");
          }

          if (wantsEvent && spot.category === "Events") {
            score += 18;
            reasons.push("Fits tonight's event direction");
          }

          if (
            wantsHighEnergy &&
            (vibe.includes("relaxed") || vibe.includes("calm"))
          ) {
            score -= 8;
          }

          if (wantsCalm && vibe.includes("high energy")) {
            score -= 12;
          }
        }

        // CREW ENERGY
        if (crewIsHighEnergy) {
          if (vibe.includes("high energy")) {
            score += 45;
            reasons.push("Matches your current higher-energy Party Mode");
          }

          if (vibe.includes("active")) {
            score += 20;
          }

          if (vibe.includes("relaxed") || vibe.includes("calm")) {
            score -= 10;
          }
        }

        // CREW STABILITY
        if (crewNeedsStability) {
          if (vibe.includes("relaxed") || vibe.includes("calm")) {
            score += 45;
            reasons.push("Supports a calmer, more stable crew setting");
          }

          if (vibe.includes("high energy")) {
            score -= 25;
          }
        }

        // CROWD LEVEL
        if (crowdLevel === "packed") {
          score -= crewNeedsStability ? 35 : 10;
        }

        if (crowdLevel === "busy") {
          score -= crewNeedsStability ? 20 : 0;
        }

        if (crowdLevel === "low" && crewNeedsStability) {
          score += 15;
        }

        const matchConfidence = Math.max(1, Math.min(99, Math.round(score)));

        return {
          ...spot,
          twinScore: score,
          matchConfidence,
          reasons,
        };
      })
      .sort((a, b) => b.twinScore - a.twinScore);

    const bestSpot = rankedSpots[0];

    if (!bestSpot) {
      return {
        spotName: "No recommendation yet",
        message: "TwinMe is waiting for enough nearby context.",
        reasons: [],
        matchConfidence: 0,
      };
    }

    const arrivalRecommendation = getArrivalRecommendation(bestSpot, timeOfDay);

    const topReasons = bestSpot.reasons.slice(0, 4);

    const recommendationSummary =
      topReasons.length > 0
        ? `${bestSpot.name} stands out for ${timeOfDay} because ${topReasons
            .slice(0, 2)
            .join(" and ")
            .toLowerCase()}.`
        : `${bestSpot.name} looks like your strongest ${timeOfDay} option right now.`;

    return {
      spotName: bestSpot.name,
      message: recommendationSummary,
      reasons: topReasons,
      matchConfidence: bestSpot.matchConfidence,
      arrivalRecommendation,

      // TWINCORE_VENUE_FIT_WINNING_EVIDENCE_R14_3D
      //
      // Internal structured evidence for R14.3.
      // This does NOT change ranking or the winning venue.
      venueEvidence: {
        category: bestSpot.category ?? null,
        vibe: bestSpot.vibe ?? null,

        distanceKm:
          typeof bestSpot.distanceKm === "number" ? bestSpot.distanceKm : null,

        rating: typeof bestSpot.rating === "number" ? bestSpot.rating : null,

        reviewCount:
          typeof bestSpot.reviewCount === "number"
            ? bestSpot.reviewCount
            : null,

        isOpen: typeof bestSpot.isOpen === "boolean" ? bestSpot.isOpen : null,

        liveReportCount:
          typeof bestSpot.liveReportCount === "number"
            ? bestSpot.liveReportCount
            : 0,

        uniqueReporterCount:
          typeof bestSpot.uniqueReporterCount === "number"
            ? bestSpot.uniqueReporterCount
            : 0,

        liveSignalStrength:
          typeof bestSpot.liveSignalStrength === "number"
            ? bestSpot.liveSignalStrength
            : 0,

        corroborationLevel: bestSpot.corroborationLevel ?? "none",

        crowdLevel: bestSpot.latestLiveReport?.crowdLevel ?? null,

        crowdTrend: bestSpot.crowdTrend ?? null,

        momentum: bestSpot.momentum ?? null,

        heatScore:
          typeof bestSpot.heatScore === "number" ? bestSpot.heatScore : null,
      },
    };
  }, [
    nearbySpotsWithLiveActivity,
    partyStatus,
    riskCount,
    tonight.vibeLabel,
    tonight.desiredFeeling,
    tonight.destination,
    tonight.dressCode,
    tonight.occasion,
  ]);

  useEffect(() => {
    publishVenueRecommendation({
      spotName: twinMeNearbySuggestion.spotName,
      message: twinMeNearbySuggestion.message,
      reasons: twinMeNearbySuggestion.reasons,
      matchConfidence: twinMeNearbySuggestion.matchConfidence,
      arrivalRecommendation:
        twinMeNearbySuggestion.arrivalRecommendation ?? null,
    });
  }, [twinMeNearbySuggestion]);

  // TWINCORE_VENUE_FIT_RUNTIME_R14_3D
  const venueFit = useMemo(() => {
    const evidence = twinMeNearbySuggestion.venueEvidence;

    return explainVenueFit({
      venue: {
        spotName:
          twinMeNearbySuggestion.spotName === "No recommendation yet"
            ? null
            : twinMeNearbySuggestion.spotName,

        matchConfidence:
          twinMeNearbySuggestion.matchConfidence > 0
            ? twinMeNearbySuggestion.matchConfidence
            : null,

        recommendationReasons: twinMeNearbySuggestion.reasons,

        category: evidence?.category ?? null,
        vibe: evidence?.vibe ?? null,

        distanceKm: evidence?.distanceKm ?? null,
        rating: evidence?.rating ?? null,
        reviewCount: evidence?.reviewCount ?? null,
        isOpen: evidence?.isOpen ?? null,

        liveReportCount: evidence?.liveReportCount ?? 0,

        uniqueReporterCount: evidence?.uniqueReporterCount ?? 0,

        liveSignalStrength: evidence?.liveSignalStrength ?? 0,

        corroborationLevel:
          evidence?.corroborationLevel === "strong"
            ? "strong"
            : evidence?.corroborationLevel === "moderate"
              ? "moderate"
              : evidence?.corroborationLevel === "single"
                ? "single"
                : "none",

        crowdLevel: evidence?.crowdLevel ?? null,

        crowdTrend: evidence?.crowdTrend ?? null,

        momentum: evidence?.momentum ?? null,

        heatScore: evidence?.heatScore ?? null,
      },

      tonight: {
        vibeLabel: tonight.vibeLabel || null,
        desiredFeeling: tonight.desiredFeeling || null,
        destination: tonight.destination || null,
        dressCode: tonight.dressCode || null,
        occasion: tonight.occasion || null,
      },

      crew: {
        partyStatus: partyStatus || null,

        needsStability:
          riskCount > 0 ||
          (partyStatus || "").trim().toLowerCase().includes("heading home") ||
          (partyStatus || "").trim().toLowerCase().includes("safe"),

        highEnergy:
          (partyStatus || "").trim().toLowerCase().includes("club") ||
          (partyStatus || "").trim().toLowerCase().includes("drinking") ||
          (partyStatus || "").trim().toLowerCase().includes("music"),
      },

      safety: {
        riskCount,
      },
    });
  }, [
    twinMeNearbySuggestion,
    tonight.vibeLabel,
    tonight.desiredFeeling,
    tonight.destination,
    tonight.dressCode,
    tonight.occasion,
    partyStatus,
    riskCount,
  ]);

  // TWINCORE_VENUE_FIT_PUBLISH_R14_3D
  useEffect(() => {
    publishVenueFit(venueFit);
  }, [venueFit]);

  // TWINCORE_SPOTS_MOVE_ENGINE_R14_2C
  const moveCandidate = useMemo(() => {
    const tonightHasMeaningfulContext = Boolean(
      (tonight.vibeLabel || "").trim() ||
      (tonight.desiredFeeling || "").trim() ||
      (tonight.destination || "").trim() ||
      (tonight.dressCode || "").trim() ||
      (tonight.occasion || "").trim(),
    );

    // TWINCORE_SPOTS_MOVE_SUPPORT_R14_2C
    //
    // Support truth is intentionally conservative.
    // Trusted visible Crew is strong support.
    // Other visible Crew is treated as thin support.
    // No visible Crew remains unknown rather than being
    // incorrectly classified as "alone".
    const moveSupportState =
      trustedVisibleCount > 0
        ? ("supported" as const)
        : visibleCount > 0
          ? ("thin" as const)
          : ("unknown" as const);

    // TWINCORE_SPOTS_MOVE_SAFETY_R14_2C
    //
    // riskCount is the real Spots risk signal discovered
    // during the R14.2C scan.
    const moveSafetyState =
      riskCount > 0 ? ("elevated" as const) : ("clear" as const);

    return decideMoveCandidate({
      venue: {
        spotName:
          twinMeNearbySuggestion.spotName === "No recommendation yet"
            ? null
            : twinMeNearbySuggestion.spotName,
        message: twinMeNearbySuggestion.message,
        reasons: twinMeNearbySuggestion.reasons,
        matchConfidence:
          twinMeNearbySuggestion.matchConfidence > 0
            ? twinMeNearbySuggestion.matchConfidence
            : null,
        arrivalRecommendation:
          twinMeNearbySuggestion.arrivalRecommendation ?? null,
      },

      tonight: {
        hasMeaningfulContext: tonightHasMeaningfulContext,
        destination: tonight.destination || null,

        // These fields remain optional until canonical
        // Tonight Context values are explicitly wired here.
        transportationMode: null,
        needsRideHome: null,
      },

      safety: {
        state: moveSafetyState,
        riskCount,
        helpSensitive: false,
      },

      support: {
        state: moveSupportState,
      },

      // TWINCORE_SPOTS_MOVE_MOVEMENT_UNKNOWN_R14_2C
      //
      // R14.2C scan found no canonical user movement-state
      // signal in Spots. Do not fabricate one.
      movement: {
        state: "unknown",
      },
    });
  }, [
    twinMeNearbySuggestion,
    tonight.vibeLabel,
    tonight.desiredFeeling,
    tonight.destination,
    tonight.dressCode,
    tonight.occasion,
    trustedVisibleCount,
    visibleCount,
    riskCount,
  ]);

  // TWINCORE_SPOTS_MOVE_PUBLISH_R14_2C
  useEffect(() => {
    publishMoveCandidate(moveCandidate);
  }, [moveCandidate]);

  // TWINCORE_SPOTS_RECOMMENDATION_ORCHESTRATION_R14_4D
  //
  // Spots owns the live R14.2 Move Candidate and
  // R14.3 Venue Fit outputs available on this surface.
  //
  // R14.4 does not rescore either system. It only
  // orchestrates their existing canonical outputs.
  //
  // Crew remains null here intentionally. Crew owns
  // its own R13 recommendation intelligence and will
  // publish into the canonical layer from /crew rather
  // than being recreated inside Spots.
  const twinMeRecommendation = useMemo(() => {
    const hasMeaningfulTonightContext = Boolean(
      (tonight.vibeLabel || "").trim() ||
      (tonight.desiredFeeling || "").trim() ||
      (tonight.destination || "").trim() ||
      (tonight.dressCode || "").trim() ||
      (tonight.occasion || "").trim(),
    );

    return orchestrateTwinMeRecommendation({
      tonight: {
        hasMeaningfulContext: hasMeaningfulTonightContext,
      },

      crew: null,

      move: moveCandidate,

      venueFit,
    });
  }, [
    tonight.vibeLabel,
    tonight.desiredFeeling,
    tonight.destination,
    tonight.dressCode,
    tonight.occasion,
    moveCandidate,
    venueFit,
  ]);

  // TWINCORE_RECOMMENDATION_FRESHNESS_REAL_SIGNALS_R14_6D
  //
  // R14.6 consumes canonical bridge timestamps rather than
  // manufacturing source freshness inside Spots.
  //
  // No canonical source currently exposes an explicit stale
  // boolean, so stale remains UNKNOWN (null).
  const recommendationFreshness = useMemo(() => {
    const currentRecommendation = readTwinMeRecommendation();
    const venueRecommendation = readVenueRecommendation();
    const publishedMoveCandidate = readMoveCandidate();
    const publishedVenueFit = readVenueFit();

    const hasMeaningfulTonightContext = Boolean(
      (tonight.vibeLabel || "").trim() ||
      (tonight.desiredFeeling || "").trim() ||
      (tonight.destination || "").trim() ||
      (tonight.dressCode || "").trim() ||
      (tonight.occasion || "").trim(),
    );

    return decideRecommendationFreshness({
      currentRecommendation,

      nextRecommendation: twinMeRecommendation,

      sources: [
        {
          source: "RECOMMENDATION",
          updatedAt: currentRecommendation?.updatedAt ?? null,
          stale: null,
          available: Boolean(currentRecommendation),
        },
        {
          source: "TONIGHT_CONTEXT",
          updatedAt: null,
          stale: null,
          available: hasMeaningfulTonightContext,
        },
        {
          source: "VENUE_RECOMMENDATION",
          updatedAt: venueRecommendation?.updatedAt ?? null,
          stale: null,
          available: Boolean(venueRecommendation?.spotName),
        },
        {
          source: "VENUE_FIT",
          updatedAt: publishedVenueFit?.updatedAt ?? null,
          stale: null,
          available: Boolean(
            publishedVenueFit &&
            publishedVenueFit.spotName &&
            publishedVenueFit.hasMeaningfulFit,
          ),
        },
        {
          source: "MOVE_CANDIDATE",
          updatedAt: publishedMoveCandidate?.updatedAt ?? null,
          stale: null,
          available: Boolean(publishedMoveCandidate),
        },
        {
          source: "SAFETY",
          updatedAt: publishedMoveCandidate?.updatedAt ?? null,
          stale: null,
          available: Boolean(publishedMoveCandidate),
        },
      ],
    });
  }, [
    twinMeRecommendation,
    tonight.vibeLabel,
    tonight.desiredFeeling,
    tonight.destination,
    tonight.dressCode,
    tonight.occasion,
  ]);

  // TWINCORE_RECOMMENDATION_FRESHNESS_RUNTIME_R14_6D

  // TWINCORE_RECOMMENDATION_FRESHNESS_OBSERVE_R14_6F1
  useEffect(() => {
    publishRecommendationFreshness(recommendationFreshness);
  }, [recommendationFreshness]);

  //
  // R14.6E maps freshness lifecycle decisions to canonical
  // publication behavior without recreating recommendation
  // intelligence inside TwinMe.
  useEffect(() => {
    // TWINCORE_RECOMMENDATION_FRESHNESS_DELIVERY_R14_6E
    switch (recommendationFreshness.decision) {
      case "KEEP":
        // Preserve the current recommendation and its timestamp.
        break;

      case "REFRESH":
        publishTwinMeRecommendation(twinMeRecommendation);
        break;

      case "SUPERSEDE":
        // TWINCORE_RECOMMENDATION_OUTCOME_FRESHNESS_R14_7E
        if (recommendationFreshness.currentRecommendation) {
          publishRecommendationOutcome(
            createRecommendationOutcomeRecord({
              recommendation: recommendationFreshness.currentRecommendation,
              state: "SUPERSEDED",
              evidence: "FRESHNESS_SUPERSEDED",
            }),
          );
        }

        publishTwinMeRecommendation(twinMeRecommendation);
        break;

      case "EXPIRE":
        // TWINCORE_RECOMMENDATION_OUTCOME_EXPIRED_R14_7E
        if (recommendationFreshness.currentRecommendation) {
          publishRecommendationOutcome(
            createRecommendationOutcomeRecord({
              recommendation: recommendationFreshness.currentRecommendation,
              state: "EXPIRED",
              evidence: "FRESHNESS_EXPIRED",
            }),
          );
        }

        publishTwinMeRecommendation({
          lane: "HOLD",
          headline: "Recommendation expired",
          message:
            "TwinCore is waiting for fresh authoritative intelligence before presenting another recommendation.",
          action: "NONE",
          destination: null,
          crewNames: [],
          reasons: [recommendationFreshness.reason],
          sources: recommendationFreshness.currentRecommendation?.sources ?? [],
          confidence: "unknown",
          venueMatchConfidence: null,
          moveDecisionConfidence: null,
          hasMeaningfulVenueFit: false,
          safetyOverride: false,
          actionable: false,
        });
        break;

      case "HOLD":
        // Do not overwrite the current recommendation until
        // enough trustworthy evidence exists.
        break;
    }
  }, [recommendationFreshness, twinMeRecommendation]);

  async function loadRealNearbySpots() {
    if (!userCoords) {
      setNearbyError("Location is required to discover nearby places.");
      return;
    }

    try {
      setNearbyLoading(true);
      setNearbyError(null);

      const response = await fetch(
        apiUrl(`/api/spots/nearby?lat=${userCoords.lat}&lng=${userCoords.lng}`),
      );

      if (!response.ok) {
        throw new Error("Unable to load nearby places.");
      }

      const data = await response.json();

      if (!Array.isArray(data?.spots)) {
        throw new Error("Nearby places returned an invalid response.");
      }

      setRealNearbySpots(data.spots as NearbySpot[]);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Nearby discovery failed:", error);

      setNearbyError(
        "Live nearby discovery is unavailable right now. Try again shortly.",
      );
    } finally {
      setNearbyLoading(false);
    }
  }

  useEffect(() => {
    if (activeView !== "nearby") return;
    if (!userCoords) return;
    if (realNearbySpots.length > 0) return;

    void loadRealNearbySpots();
  }, [activeView, userCoords, realNearbySpots.length]);

  async function handlePostLiveUpdate() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be signed in to post a live update.");
      return;
    }


    const activityType: LiveActivity["activityType"] =
      livePostType === "Calm spot"
        ? "Outdoor"
        : livePostType === "Avoid area"
          ? "Event"
          : "Nightlife";

    const crowdLevel: LiveActivity["crowdLevel"] =
      livePostType === "Getting packed"
        ? "Packed"
        : livePostType === "Busy here"
          ? "Busy"
          : livePostType === "Calm spot"
            ? "Low"
            : "Moderate";

    if (liveLocationMode === "venue" && !livePostLocation.trim()) {
      alert("Please enter a venue or location name.");
      return;
    }

    const normalizedArea =
      liveLocationMode === "current"
        ? "Current location"
        : livePostLocation.trim() || "Unnamed location";

    const cooldownCutoff = new Date(
      Date.now() - LIVE_REPORT_COOLDOWN_MINUTES * 60 * 1000,
    ).toISOString();

    const { data: recentExistingPosts, error: recentPostsError } =
      await supabase
        .from("spots_live_posts")
        .select("id, created_at")
        .eq("user_id", user.id)
        .eq("area", normalizedArea)
        .gte("created_at", cooldownCutoff)
        .order("created_at", { ascending: false })
        .limit(1);

    if (recentPostsError) {
      console.error(
        "Unable to check for recent live report:",
        recentPostsError,
      );
    }

    const sharedProfile = await getSharedProfile(user.id);
    const authoritativeDisplayName =
      sharedProfile?.display_name?.trim() ||
      displayName.trim() ||
      "Crew Member";

    const payload = {
      user_id: user.id,
      display_name: authoritativeDisplayName,
      title: livePostType,
      area: normalizedArea,
      activity_type: activityType,
      vibe: livePostType,
      crowd_level: crowdLevel,
      note: livePostNote.trim() || "Live update shared from the area.",
      latitude: userCoords?.lat ?? null,
      longitude: userCoords?.lng ?? null,
      trusted: false,
    };

    let data;
    let error;

    const existingPost = recentExistingPosts?.[0];

    if (existingPost) {
      const result = await supabase
        .from("spots_live_posts")
        .update({
          title: payload.title,
          activity_type: payload.activity_type,
          vibe: payload.vibe,
          crowd_level: payload.crowd_level,
          note: payload.note,
          latitude: payload.latitude,
          longitude: payload.longitude,
          created_at: new Date().toISOString(),
        })
        .eq("id", existingPost.id)
        .eq("user_id", user.id)
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("spots_live_posts")
        .insert(payload)
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Live post failed");
      console.error("message:", error.message);
      console.error("details:", error.details);
      console.error("hint:", error.hint);
      console.error("code:", error.code);

      alert(`Your live update could not be posted.\n\n${error.message}`);

      return;
    }

    if (data) {
      const newPost = convertLivePostRow(data as LivePostRow);

      setDatabaseLivePosts((current) => [
        newPost,
        ...current.filter((post) => post.id !== newPost.id),
      ]);
    }

    setLivePostNote("");
    setLivePostLocation("Current Location");
    setLiveLocationMode("current");
    setPostComposerOpen(false);
  }
  return (
    <AuthGuard>
      <main className="relative min-h-screen overflow-hidden bg-[#06070a] text-white">
        <Link
          href="/"
          className="twincore-spots-dashboard relative z-20 inline-flex rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
        >
          ← Dashboard
        </Link>
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className={`absolute inset-0 ${ambientClasses.top}`} />
          <div
            className={`absolute left-1/2 top-14 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full blur-3xl animate-orb-drift ${ambientClasses.orbA}`}
          />
          <div
            className={`absolute bottom-10 right-[-8%] h-64 w-64 rounded-full blur-3xl animate-orb-drift ${ambientClasses.orbB}`}
          />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:26px_26px]" />
        </div>

        <div className="twincore-spots-content relative mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10 lg:px-8">
          <header className="mb-9 border-b border-white/[0.07] pb-7">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.055] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/75">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" />
              TwinCore • Live Discovery
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Spots</h1>
                <p className="mt-2 text-sm text-white/60">
                  Know where to go, what it feels like, and what is changing around you.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSweepOn((prev) => !prev)}
                className={`twincore-press rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${
                  activeView === "crew" ? "inline-flex" : "hidden"
                }`}
              >
                {sweepOn ? "Radar On" : "Radar Off"}
              </button>
            </div>
          </header>

          {/* SPOTS VIEW SWITCHER */}
          <section className="mb-8 rounded-[1.65rem] border border-white/10 bg-white/[0.035] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    id: "crew",
                    label: "Crew Radar",
                    description: "Private awareness",
                  },
                  {
                    id: "nearby",
                    label: "Discover",
                    description: "Places that fit",
                  },
                  {
                    id: "live",
                    label: "Live Now",
                    description: "What is changing",
                  },
                ] as const
              ).map((view) => {
                const active = activeView === view.id;

                return (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => setActiveView(view.id)}
                    className={`rounded-2xl px-3 py-3 text-center transition active:scale-[0.98] ${
                      active
                        ? "border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,0.12)]"
                        : "border border-transparent text-white/55 hover:bg-white/[0.05] hover:text-white/80"
                    }`}
                  >
                    <div className="text-sm font-black">{view.label}</div>

                    <div className="mt-1 hidden text-[10px] font-medium text-white/40 sm:block">
                      {view.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* NEARBY VIEW */}
          {activeView === "nearby" ? (
            <div className="space-y-5">
              <section className="overflow-hidden rounded-[2rem] border border-fuchsia-300/20 bg-[radial-gradient(circle_at_18%_0%,rgba(217,70,239,0.18),transparent_38%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.09),transparent_30%),linear-gradient(180deg,#15111d,#0b0b0f)] p-6 shadow-[0_24px_80px_rgba(217,70,239,0.10)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-fuchsia-100">
                  <MapPin className="h-3.5 w-3.5" />
                  Nearby Discovery
                </div>

                <h2 className="mt-4 text-2xl font-black text-white">
                  Find What Fits Right Now
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/65">
                  Discover nearby places based on distance, energy, activity,
                  and what fits your current night.
                </p>
              </section>

              {nearbyLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
                  Finding places near you...
                </div>
              ) : null}

              {nearbyError ? (
                <div className="rounded-2xl border border-orange-300/20 bg-orange-300/[0.06] p-4 text-sm text-orange-100/80">
                  {nearbyError}
                </div>
              ) : null}

              <div className="flex items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(
                  [
                    "All",
                    "Food",
                    "Nightlife",
                    "Events",
                    "Sports",
                    "Outdoor",
                    "Stay In",
                  ] as const
                ).map((category) => {
                  const active = nearbyCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setNearbyCategory(category)}
                      className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        active
                          ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                          : "border-white/10 bg-white/[0.04] text-white/55"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-white/40">
                  Heat
                </div>

                <div className="flex items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {(["All", "Hot", "Busy", "Calm"] as const).map((filter) => {
                    const active = heatFilter === filter;

                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setHeatFilter(filter)}
                        className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          active
                            ? filter === "Hot"
                              ? "border-red-300/30 bg-red-300/10 text-red-100"
                              : filter === "Busy"
                                ? "border-orange-300/30 bg-orange-300/10 text-orange-100"
                                : filter === "Calm"
                                  ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                                  : "border-white/20 bg-white/10 text-white"
                            : "border-white/10 bg-white/[0.04] text-white/55"
                        }`}
                      >
                        {filter === "Hot"
                          ? "🔥 Hot"
                          : filter === "Busy"
                            ? "🟠 Busy"
                            : filter === "Calm"
                              ? "🧊 Calm"
                              : "All"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <section className="space-y-3">
                {nearbySpotsWithLiveActivity.map((spot) => (
                  <div
                    key={spot.id}
                    className={`rounded-3xl border p-4 transition-all duration-500 ${
                      spot.heatScore >= 85
                        ? "border-red-400/40 bg-gradient-to-br from-red-500/15 via-red-900/10 to-black shadow-[0_0_35px_rgba(239,68,68,0.35)]"
                        : spot.heatScore >= 65
                          ? "border-orange-400/40 bg-gradient-to-br from-orange-500/12 via-orange-900/10 to-black shadow-[0_0_30px_rgba(249,115,22,0.30)]"
                          : spot.heatScore >= 35
                            ? "border-amber-400/35 bg-gradient-to-br from-amber-500/10 via-amber-900/10 to-black shadow-[0_0_24px_rgba(245,158,11,0.22)]"
                            : "border-cyan-300/25 bg-gradient-to-br from-cyan-500/8 via-slate-900 to-black shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                    }`}
                  >
                    <Link
                      href={Capacitor.isNativePlatform() ? `/spots/__native__?placeId=${encodeURIComponent(spot.id)}` : `/spots/${encodeURIComponent(spot.id)}`}
                      aria-label={`Open details for ${spot.name}`}
                      className={`relative mb-5 block h-36 overflow-hidden rounded-2xl ${
                        spot.category === "Food"
                          ? "bg-gradient-to-br from-orange-500/30 to-red-500/20"
                          : spot.category === "Nightlife"
                            ? "bg-gradient-to-br from-violet-500/30 to-indigo-500/20"
                            : spot.category === "Outdoor"
                              ? "bg-gradient-to-br from-emerald-500/30 to-green-500/20"
                              : "bg-gradient-to-br from-cyan-500/25 to-sky-500/20"
                      }`}
                    >
                      <div className="absolute inset-0 bg-black/25" />

                      {spot.momentum === "building" ? (
                        <div className="absolute left-4 top-4 rounded-full bg-orange-500/90 px-3 py-1 text-xs font-bold text-white">
                          🔥 Building Momentum
                        </div>
                      ) : spot.momentum === "peak" ? (
                        <div className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                          🚀 Peak Activity
                        </div>
                      ) : spot.momentum === "cooling" ? (
                        <div className="absolute left-4 top-4 rounded-full bg-sky-500 px-3 py-1 text-xs font-bold text-white">
                          🌙 Cooling Down
                        </div>
                      ) : null}

                      {spot.name === twinMeNearbySuggestion.spotName &&
                      twinMeNearbySuggestion.matchConfidence >= 90 ? (
                        <div className="absolute right-4 top-4 rounded-full bg-cyan-400 px-3 py-1 text-xs font-black text-slate-900 shadow-lg">
                          ✨ TwinMe Pick
                        </div>
                      ) : null}

                      <div
                        className={`absolute bottom-4 right-4 rounded-full border px-3 py-1 text-xs font-black backdrop-blur ${
                          spot.heatScore >= 85
                            ? "border-red-300/30 bg-red-500/20 text-red-100"
                            : spot.heatScore >= 65
                              ? "border-orange-300/30 bg-orange-500/20 text-orange-100"
                              : spot.heatScore >= 35
                                ? "border-amber-300/30 bg-amber-500/20 text-amber-100"
                                : "border-cyan-300/30 bg-cyan-500/20 text-cyan-100"
                        }`}
                      >
                        🔥 {spot.heatScore >= 85
                          ? "Very busy"
                          : spot.heatScore >= 65
                            ? "Busy"
                            : spot.heatScore >= 35
                              ? "Moderate"
                              : "Quiet"}
                      </div>

                      <div className="absolute bottom-4 left-4">
                        <div className="text-xs font-black uppercase tracking-[0.25em] text-white/70">
                          {spot.category}
                        </div>

                        <div className="mt-1 text-2xl font-black text-white">
                          {spot.name}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {spot.address ? (
                          <div className="mt-1 text-xs text-white/45">
                            📍 {spot.address}
                          </div>
                        ) : null}

                        <div className="mt-1 text-xs text-white/45">
                          {spot.category}
                        </div>
                      </div>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                        {spot.distanceKm === 0
                          ? "Home"
                          : `${spot.distanceKm.toFixed(1)} km`}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
                        {spot.vibe}
                      </span>

                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
                        {spot.status}
                      </span>

                      {typeof spot.rating === "number" ? (
                        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                          ★ {spot.rating.toFixed(1)}
                          {typeof spot.reviewCount === "number"
                            ? ` (${spot.reviewCount})`
                            : ""}
                        </span>
                      ) : null}

                      {spot.isOpen === true ? (
                        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                          Open now
                        </span>
                      ) : spot.isOpen === false ? (
                        <span className="rounded-full border border-red-300/20 bg-red-300/10 px-3 py-1 text-xs font-semibold text-red-100">
                          Closed
                        </span>
                      ) : null}

                      {spot.liveReportCount > 0 ? (
                        <>
                          <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs font-semibold text-orange-100">
                            🔥 {spot.liveReportCount} live report
                            {spot.liveReportCount === 1 ? "" : "s"}
                          </span>

                          {spot.corroborationLevel === "strong" ? (
                            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                              Strong signal
                            </span>
                          ) : spot.corroborationLevel === "moderate" ? (
                            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                              Confirmed activity
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </div>

                    {/* MOMENTUM BADGE*/}
                    {spot.crowdTrend === "rising" ? (
                      <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs font-semibold text-orange-100">
                        ↗ Getting busier
                      </span>
                    ) : spot.crowdTrend === "steady" ? (
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                        → Holding steady
                      </span>
                    ) : spot.crowdTrend === "falling" ? (
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                        ↘ Calming down
                      </span>
                    ) : null}

                    {spot.momentum === "building" ? (
                      <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold text-violet-100">
                        📈 Building momentum
                      </span>
                    ) : spot.momentum === "peak" ? (
                      <span className="rounded-full border border-red-300/20 bg-red-300/10 px-3 py-1 text-xs font-semibold text-red-100">
                        🔥 Peak activity
                      </span>
                    ) : spot.momentum === "cooling" ? (
                      <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100">
                        🌙 Cooling down
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                        ➖ Stable
                      </span>
                    )}

                    <p className="mt-3 text-sm leading-6 text-white/60">
                      {spot.note}
                    </p>
                    {spot.latestLiveReport ? (
                      <div className="mt-3 rounded-2xl border border-orange-300/15 bg-orange-300/[0.06] p-3">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-orange-100">
                          Live now
                        </div>

                        <p className="mt-1 text-sm font-semibold text-white/85">
                          {spot.latestLiveReport.title}
                        </p>

                        <p className="mt-1 text-xs text-white/50">
                          {spot.latestLiveReport.minutesAgo} min ago
                        </p>
                      </div>
                    ) : null}

                    {spot.recentTimeline.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                            Live activity
                          </div>

                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-200/70">
                            Latest {spot.recentTimeline.length}
                          </div>
                        </div>

                        <div className="mt-3 space-y-3">
                          {spot.recentTimeline.map((report) => (
                            <div
                              key={report.id}
                              className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/10 px-3 py-3"
                            >
                              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-300" />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-sm font-semibold text-white/80">
                                    {report.title}
                                  </div>

                                  <div className="shrink-0 text-xs text-white/40">
                                    {report.minutesAgo === 0
                                      ? "Just now"
                                      : `${report.minutesAgo} min ago`}
                                  </div>
                                </div>

                                {report.note ? (
                                  <p className="mt-1 text-xs leading-5 text-white/50">
                                    {report.note}
                                  </p>
                                ) : null}

                                <div className="mt-2 flex flex-wrap gap-2">
                                  {report.crowdLevel ? (
                                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/60">
                                      {report.crowdLevel}
                                    </span>
                                  ) : null}

                                  {report.vibe ? (
                                    <span className="rounded-full bg-orange-300/10 px-2.5 py-1 text-[10px] font-semibold text-orange-100/80">
                                      {report.vibe}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Crowd Level
                        </span>

                        <span className="text-sm font-semibold text-white/75">
                          {spot.latestLiveReport?.crowdLevel ?? "Unknown"}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-orange-400 transition-all duration-700"
                          style={{
                            width:
                              (spot.latestLiveReport?.crowdLevel ?? "")
                                .toLowerCase() === "packed"
                                ? "100%"
                                : (spot.latestLiveReport?.crowdLevel ?? "")
                                      .toLowerCase() === "busy"
                                  ? "75%"
                                  : (spot.latestLiveReport?.crowdLevel ?? "")
                                        .toLowerCase() === "moderate"
                                    ? "50%"
                                    : (spot.latestLiveReport?.crowdLevel ?? "")
                                          .toLowerCase() === "low"
                                      ? "25%"
                                      : "0%",
                          }}
                        />
                      </div>

                      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-white/35">
                        <span>Quiet</span>
                        <span>Moderate</span>
                        <span>Busy</span>
                        <span>Packed</span>
                      </div>
                    </div>

                    <div
                      className={`mt-4 rounded-2xl border p-4 ${
                        spot.prediction.title === "Peak activity"
                          ? "border-red-500/25 bg-red-500/[0.05]"
                          : spot.prediction.title === "Getting busier"
                            ? "border-orange-400/25 bg-orange-400/[0.05]"
                            : spot.prediction.title === "Calming down"
                              ? "border-sky-400/25 bg-sky-400/[0.05]"
                              : "border-cyan-400/15 bg-cyan-400/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {spot.prediction.icon}
                          </span>

                          <div>
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                              TwinMe Prediction
                            </div>

                            <div className="mt-1 text-base font-bold text-white">
                              {spot.prediction.title}
                            </div>
                          </div>
                        </div>

                        <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-bold text-cyan-200">
                          {spot.prediction.confidence}% Confidence
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-white/70">
                        {spot.prediction.message}
                      </p>
                    </div>
                  </div>
                ))}
              </section>

              <section className="rounded-3xl border border-blue-500/20 bg-[linear-gradient(180deg,#1a1f2e,#0c0f1a)] p-5">
                <div className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  TwinMe Suggests
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-white">
                      {twinMeNearbySuggestion.spotName}
                    </p>

                    {twinMeNearbySuggestion.matchConfidence > 0 ? (
                      <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                        {twinMeNearbySuggestion.matchConfidence}% Match
                      </span>
                    ) : null}
                  </div>

                  <span className="text-xs text-white/45">
                    {(() => {
                      const score = twinMeNearbySuggestion.matchConfidence;

                      if (score >= 90) return "Excellent fit";
                      if (score >= 75) return "Strong fit";
                      if (score >= 60) return "Good fit";
                      return "Possible fit";
                    })()}
                  </span>

                  <p className="mt-2 text-sm leading-6 text-white/75">
                    {twinMeNearbySuggestion.message}
                  </p>

                  {twinMeNearbySuggestion.arrivalRecommendation ? (
                    <>
                      <div
                        className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                          twinMeNearbySuggestion.arrivalRecommendation
                            .colour === "emerald"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : twinMeNearbySuggestion.arrivalRecommendation
                                  .colour === "amber"
                              ? "bg-amber-500/15 text-amber-300"
                              : twinMeNearbySuggestion.arrivalRecommendation
                                    .colour === "red"
                                ? "bg-red-500/15 text-red-300"
                                : "bg-cyan-500/15 text-cyan-300"
                        }`}
                      >
                        {twinMeNearbySuggestion.arrivalRecommendation.label}
                      </div>

                      <p className="mt-2 text-sm text-white/60">
                        {twinMeNearbySuggestion.arrivalRecommendation.message}
                      </p>
                    </>
                  ) : null}

                  {twinMeNearbySuggestion.reasons.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                          Why TwinMe picked this
                        </div>

                        <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                          AI reasoning
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {twinMeNearbySuggestion.reasons.map((reason, index) => (
                          <div
                            key={`${reason}-${index}`}
                            className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-sm text-white/70"
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-[11px] font-black text-cyan-200">
                              {index + 1}
                            </span>

                            <span className="leading-5">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}

          {/* LIVE VIEW */}
          {activeView === "live" ? (
            <div className="space-y-5">
              <section className="overflow-hidden rounded-[2rem] border border-orange-300/20 bg-[radial-gradient(circle_at_18%_0%,rgba(251,146,60,0.18),transparent_38%),radial-gradient(circle_at_88%_18%,rgba(244,63,94,0.08),transparent_30%),linear-gradient(180deg,#1c130e,#0b0b0f)] p-6 shadow-[0_24px_80px_rgba(251,146,60,0.10)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-orange-100">
                  <Flame className="h-3.5 w-3.5" />
                  Happening Now
                </div>

                <h2 className="mt-4 text-2xl font-black text-white">
                  Live From the Area
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/65">
                  Real-time crowd movement, atmosphere checks, event activity,
                  and trusted reports from nearby.
                </p>

                <button
                  type="button"
                  onClick={() => setPostComposerOpen((current) => !current)}
                  className="mt-4 w-full rounded-2xl border border-orange-300/25 bg-orange-300/10 px-4 py-3 text-sm font-bold text-orange-100 transition hover:bg-orange-300/15 active:scale-[0.98]"
                >
                  {postComposerOpen ? "Close Update" : "+ Post Live Update"}
                </button>

                {postComposerOpen ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-white/50">
                      What&apos;s happening?
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(
                        [
                          "Great vibe",
                          "Busy here",
                          "Getting packed",
                          "Calm spot",
                          "Avoid area",
                        ] as const
                      ).map((type) => {
                        const active = livePostType === type;

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setLivePostType(type)}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                              active
                                ? "border-orange-300/30 bg-orange-300/10 text-orange-100"
                                : "border-white/10 bg-white/[0.04] text-white/55"
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/50">
                        Where is this happening?
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLiveLocationMode("current");
                            setLivePostLocation("Current Location");
                          }}
                          className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                            liveLocationMode === "current"
                              ? "border-orange-300/30 bg-orange-300/10 text-orange-100"
                              : "border-white/10 bg-white/[0.04] text-white/55"
                          }`}
                        >
                          Use Current Location
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLiveLocationMode("venue");

                            if (livePostLocation === "Current Location") {
                              setLivePostLocation("");
                            }
                          }}
                          className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                            liveLocationMode === "venue"
                              ? "border-orange-300/30 bg-orange-300/10 text-orange-100"
                              : "border-white/10 bg-white/[0.04] text-white/55"
                          }`}
                        >
                          Enter Venue
                        </button>
                      </div>

                      {liveLocationMode === "current" ? (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-sm font-semibold text-white/80">
                            Current Location
                          </p>

                          <p className="mt-1 text-xs text-white/45">
                            Your current coordinates will be attached to this
                            live update.
                          </p>
                        </div>
                      ) : (
                        <input
                          id="live-post-location"
                          type="text"
                          value={livePostLocation}
                          onChange={(event) =>
                            setLivePostLocation(event.target.value)
                          }
                          placeholder="Enter venue or location name"
                          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-orange-300/30"
                        />
                      )}
                    </div>

                    <textarea
                      value={livePostNote}
                      onChange={(event) => setLivePostNote(event.target.value)}
                      placeholder="Add a quick note..."
                      className="mt-4 min-h-[90px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-orange-300/30"
                    />

                    <button
                      type="button"
                      onClick={handlePostLiveUpdate}
                      className="mt-3 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-600 active:scale-[0.98]"
                    >
                      Post Update
                    </button>
                  </div>
                ) : null}
              </section>

              <div className="flex items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(
                  [
                    "All",
                    "Nightlife",
                    "Food",
                    "Event",
                    "Sports",
                    "Outdoor",
                  ] as const
                ).map((filter) => {
                  const active = liveFilter === filter;

                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setLiveFilter(filter)}
                      className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        active
                          ? "border-orange-300/30 bg-orange-300/10 text-orange-100"
                          : "border-white/10 bg-white/[0.04] text-white/55"
                      }`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>

              <section className="space-y-3">
                {filteredLiveActivities.map((activity) => {
                  const distance = getLiveActivityDistance(
                    activity,
                    userCoords,
                  );

                  return (
                    <div
                      key={activity.id}
                      className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-white">
                            {activity.title}
                          </div>

                          <div className="mt-1 text-xs text-white/45">
                            {activity.area}
                          </div>
                        </div>

                        <div className="shrink-0">
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                              {activity.minutesAgo} min ago
                            </span>

                            {distance !== null ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                                {distance.toFixed(1)} km
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
                          {activity.activityType}
                        </span>

                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
                          {activity.vibe}
                        </span>

                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
                          Crowd: {activity.crowdLevel}
                        </span>

                        {activity.trusted ? (
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                            Trusted report
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-white/60">
                        {activity.note}
                      </p>
                    </div>
                  );
                })}
              </section>

              <section className="rounded-3xl border border-blue-500/20 bg-[linear-gradient(180deg,#1a1f2e,#0c0f1a)] p-5">
                <div className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  TwinMe Live Read
                </div>

                <p className="text-sm leading-6 text-white/75">
                  Activity is changing in real time. Use trusted reports, crowd
                  levels, distance, and your crew state together before deciding
                  where to move next.
                </p>
              </section>
            </div>
          ) : null}

          {/* CREW VIEW */}
          {activeView === "crew" ? (
            <div>
              <section className="mb-6 overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.11),transparent_36%),linear-gradient(180deg,#12161c,#090b0f)] p-6 shadow-[0_24px_80px_rgba(34,211,238,0.08)]">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-cyan-100/85">
                  <Radar className="h-3.5 w-3.5" />
                  CREW RADAR
                </div>

                <h2 className="text-2xl font-semibold text-white">
                  {displayName}&apos;s Live Awareness
                </h2>

                <p className="mt-3 text-sm leading-6 text-white/70">
                  This layer compares live crew distance, signal intensity, and
                  safer movement options before you move.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                    <span className="twincore-live-dot" />
                    LIVE
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                    {hasSharedLocation ? "LOCATION ON" : "LOCATION OFF"}
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                    {partyStatus || "NOT ACTIVE"}
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                    {nearbyCount} NEARBY
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                    <EyeOff className="h-3.5 w-3.5" />
                    {ghostMode ? "GHOST ON" : "GHOST OFF"}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                    <Lock className="h-3.5 w-3.5" />
                    {trustedOnly
                      ? "TRUSTED ONLY"
                      : `${trustedVisibleCount} TRUSTED`}
                  </span>
                </div>

                {locationError ? (
                  <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {locationError}
                  </div>
                ) : null}
              </section>

              <section className="mb-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/55">
                    <Zap className="h-3.5 w-3.5" />
                    Grid Energy
                  </div>
                  <div className="text-2xl font-semibold">{gridLabel}</div>
                  <p className="mt-1 text-sm text-white/60">
                    {hotspotCount} hotspot{hotspotCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/55">
                    <Activity className="h-3.5 w-3.5" />
                    Visible Layer
                  </div>
                  <div className="text-2xl font-semibold">{visibleCount}</div>
                  <p className="mt-1 text-sm text-white/60">signals on map</p>
                </div>
              </section>

              <section className="mb-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#101216,#090A0D)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.42)]">
                <div className="relative aspect-square overflow-hidden rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.10),rgba(0,0,0,0.4)_52%,rgba(0,0,0,0.88)_100%)]">
                  <div className="absolute inset-6 rounded-full border border-white/10" />
                  <div className="absolute inset-12 rounded-full border border-white/10" />
                  <div className="absolute inset-20 rounded-full border border-white/10" />
                  <div className="absolute inset-28 rounded-full border border-white/10" />

                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10" />
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />

                  {hotspotCount > 0
                    ? radarPoints
                        .filter((spot) => spot.clusterStrength >= 3)
                        .slice(0, 3)
                        .map((spot) => {
                          const tone = getToneClasses(spot.tone);
                          const hotspotSize = clamp(
                            spot.clusterStrength * 42,
                            70,
                            130,
                          );

                          return (
                            <div
                              key={`hotspot-${spot.id}`}
                              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl ${tone.haze} opacity-60`}
                              style={{
                                left: `${spot.x}%`,
                                top: `${spot.y}%`,
                                width: `${hotspotSize}px`,
                                height: `${hotspotSize}px`,
                              }}
                            />
                          );
                        })
                    : null}

                  {sweepOn ? (
                    <div className="pointer-events-none absolute inset-0">
                      <div
                        className="absolute left-1/2 top-1/2 h-[48%] w-[48%] -translate-x-1/2 -translate-y-1/2 origin-bottom-right rounded-tl-full bg-[conic-gradient(from_0deg,rgba(96,165,250,0.0)_0deg,rgba(96,165,250,0.0)_280deg,rgba(96,165,250,0.28)_340deg,rgba(96,165,250,0.0)_360deg)]"
                        style={{
                          animation: `spin ${sweepDuration}s linear infinite`,
                        }}
                      />
                    </div>
                  ) : null}

                  <div
                    className={`absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 backdrop-blur ${
                      ghostMode
                        ? "bg-white/8 opacity-60 blur-[1px]"
                        : "bg-white/15"
                    }`}
                    style={{
                      left: `${userPosition.x}%`,
                      top: `${userPosition.y}%`,
                    }}
                  >
                    <LocateFixed
                      className={`h-4 w-4 text-white ${ghostMode ? "opacity-70" : ""}`}
                    />
                  </div>

                  {ghostMode ? (
                    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 blur-sm" />
                  ) : null}

                  {radarPoints.length > 0 ? (
                    radarPoints.map((spot) => {
                      const tone = getToneClasses(spot.tone);
                      const selected = selectedSpot?.id === spot.id;
                      const glowScale = spot.blurred
                        ? 0.38
                        : clamp(0.4 + spot.intensity / 120, 0.45, 1.15);

                      const nodeSize = clamp(
                        34 + spot.clusterStrength * 3,
                        34,
                        46,
                      );

                      return (
                        <button
                          key={spot.id}
                          type="button"
                          onClick={() => setSelectedSpotId(spot.id)}
                          className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 ${
                            spot.blurred ? "opacity-80" : ""
                          }`}
                          style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                        >
                          <span
                            className={`absolute inset-0 rounded-full ${
                              spot.blurred ? "bg-white/60" : tone.dot
                            } ${spot.tone === "risk" ? "animate-ping" : spot.tone === "lit" ? "animate-pulse" : ""}`}
                            style={{
                              opacity: spot.blurred ? 0.16 : glowScale,
                              filter: spot.blurred
                                ? "blur(12px)"
                                : "blur(10px)",
                              transform: `scale(${spot.clusterStrength >= 3 ? 1.6 : 1.2})`,
                            }}
                          />
                          <span
                            className={`relative flex items-center justify-center rounded-full border bg-black/50 backdrop-blur ${
                              spot.blurred ? "border-white/20" : tone.ring
                            } ${selected ? "scale-110" : "scale-100"} transition-all duration-200`}
                            style={{
                              width: `${nodeSize}px`,
                              height: `${nodeSize}px`,
                            }}
                          >
                            <span
                              className={`rounded-full ${
                                spot.blurred
                                  ? "bg-white/60 blur-[1px]"
                                  : tone.dot
                              }`}
                              style={{
                                width: `${clamp(10 + spot.clusterStrength, 10, 15)}px`,
                                height: `${clamp(10 + spot.clusterStrength, 10, 15)}px`,
                              }}
                            />
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <div className="max-w-[260px] rounded-3xl border border-white/10 bg-black/30 px-5 py-6 text-center backdrop-blur">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
                          <Radar className="h-5 w-5 text-white/75" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">
                          No live signals yet
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-white/60">
                          {emptyStateReason}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/75">
                    NORTH
                  </div>

                  <div className="absolute bottom-4 right-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/75">
                    RANGE: {ghostMode ? "MASKED" : "LIVE"}
                  </div>
                </div>
              </section>

              {selectedSpot ? (
                <section
                  className={`mb-6 rounded-3xl border p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)] ${
                    getToneClasses(selectedSpot.tone).card
                  } ${selectedSpot.blurred ? "backdrop-blur-sm" : ""}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                          selectedSpot.blurred
                            ? "bg-white/10 text-white/80"
                            : getToneClasses(selectedSpot.tone).badge
                        }`}
                      >
                        {selectedSpot.blurred ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          getToneIcon(selectedSpot.tone)
                        )}
                        {selectedSpot.blurred
                          ? "LIMITED DETAIL"
                          : selectedSpot.tone.toUpperCase()}
                      </div>

                      <h3
                        className={`mt-3 text-2xl font-semibold text-white ${selectedSpot.blurred ? "blur-[1.2px]" : ""}`}
                      >
                        {selectedSpot.name}
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-medium text-white/85">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {selectedSpot.crew}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-white/75">
                    {selectedSpot.note}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                      Intensity {selectedSpot.intensity}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                      Cluster {selectedSpot.clusterStrength}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <MiniMeter
                      label="Risk"
                      value={
                        selectedSpot.tone === "risk"
                          ? clamp(selectedSpot.intensity, 60, 100)
                          : selectedSpot.tone === "lit"
                            ? 68
                            : selectedSpot.tone === "safe"
                              ? 18
                              : 36
                      }
                    />
                    <MiniMeter
                      label="Crew"
                      value={
                        selectedSpot.blurred
                          ? 12
                          : Math.min(100, selectedSpot.clusterStrength * 24)
                      }
                    />
                    <MiniMeter
                      label="Exit"
                      value={
                        selectedSpot.tone === "safe"
                          ? 92
                          : selectedSpot.tone === "chill"
                            ? 74
                            : selectedSpot.tone === "lit"
                              ? 52
                              : 24
                      }
                    />
                  </div>
                </section>
              ) : (
                <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/80">
                    <Activity className="h-3.5 w-3.5" />
                    SIGNAL STATE
                  </div>

                  <h3 className="text-2xl font-semibold text-white">
                    Waiting for live movement
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    {emptyStateReason}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/50">
                        Location
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {hasSharedLocation || userCoords ? "Ready" : "Needed"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/50">
                        Crew Layer
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {hasRealSignals ? "Listening" : "Standby"}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="mb-6 rounded-3xl border border-blue-500/20 bg-[linear-gradient(180deg,#1a1f2e,#0c0f1a)] p-5 shadow-[0_18px_50px_rgba(59,130,246,0.18)]">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  TWINME SIGNAL
                </div>

                <p className="text-sm leading-6 text-white/82">{twinInsight}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                    STATE: {safetyState.toUpperCase()}
                  </span>
                  {selectedSpot ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                      POINT: {selectedSpot.name.toUpperCase()}
                    </span>
                  ) : null}
                </div>
              </section>

              <section className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    Live Points
                  </h2>
                  <span className="text-sm text-white/55">
                    {visibleCount} visible
                  </span>
                </div>

                {radarPoints.length > 0 ? (
                  <div className="space-y-3">
                    {radarPoints.map((spot) => {
                      const tone = getToneClasses(spot.tone);
                      const selected = selectedSpot?.id === spot.id;

                      return (
                        <button
                          key={spot.id}
                          type="button"
                          onClick={() => setSelectedSpotId(spot.id)}
                          className={`twincore-press w-full rounded-3xl border p-4 text-left shadow-[0_12px_30px_rgba(0,0,0,0.28)] ${
                            spot.blurred
                              ? "border-white/10 bg-[linear-gradient(180deg,#17181d,#0d0e12)]"
                              : tone.card
                          } ${selected ? "ring-1 ring-white/20" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 text-white">
                                {spot.blurred ? (
                                  <Lock className="h-4 w-4" />
                                ) : (
                                  getToneIcon(spot.tone)
                                )}
                                <span
                                  className={`text-lg font-semibold ${spot.blurred ? "blur-[1px]" : ""}`}
                                >
                                  {spot.name}
                                </span>
                              </div>

                              <p className="mt-2 text-sm leading-6 text-white/70">
                                {spot.note}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                                spot.blurred
                                  ? "bg-white/10 text-white/75"
                                  : tone.badge
                              }`}
                            >
                              {spot.blurred ? "blurred" : spot.tone}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-sm text-white/65">
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              Crew nearby: {spot.clusterStrength}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <Route className="h-4 w-4" />
                              {spot.distanceKm.toFixed(2)} km
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
                    <p className="text-lg font-semibold text-white">
                      No live points yet
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/65">
                      {emptyStateReason}
                    </p>
                  </div>
                )}
              </section>

              <nav className="grid grid-cols-2 gap-3">
                <Link
                  href="/"
                  className="twincore-press rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-4 text-center text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                >
                  Home
                </Link>

                <Link
                  href="/crew"
                  className="twincore-press rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-4 text-center text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                >
                  Crew
                </Link>
              </nav>
            </div>
          ) : null}
        </div>
      </main>
    </AuthGuard>
  );
}
