"use client";

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

import AuthGuard from "@/components/auth/AuthGuard";

type SpotTone = "lit" | "safe" | "risk" | "chill";

type SpotsView = "crew" | "nearby" | "live";

type NearbySpot = {
  id: string;
  name: string;
  category: "Food" | "Nightlife" | "Events" | "Sports" | "Outdoor" | "Stay In";
  distanceKm: number;
  vibe: string;
  status: string;
  note: string;
};

type LiveActivity = {
  id: string;
  title: string;
  area: string;
  activityType: "Nightlife" | "Food" | "Event" | "Sports" | "Outdoor";
  vibe: string;
  crowdLevel: "Low" | "Moderate" | "Busy" | "Packed";
  minutesAgo: number;
  userId?: string;
  trusted: boolean;
  note: string;
  latitude?: number | null;
longitude?: number | null;
};

type LivePostRow = {
  id: string;
  user_id: string;
  display_name: string;
  title: string;
  area: string;
  activity_type: string;
  vibe: string;
  crowd_level: string;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  trusted: boolean;
  created_at: string;
};

type LivePostType =
  | "Great vibe"
  | "Busy here"
  | "Getting packed"
  | "Calm spot"
  | "Avoid area";

const nearbySpots: NearbySpot[] = [
  {
    id: "spot-1",
    name: "Harbour Social",
    category: "Nightlife",
    distanceKm: 1.2,
    vibe: "High energy",
    status: "Open",
    note: "Busy social atmosphere with strong late-night activity.",
  },
  {
    id: "spot-2",
    name: "North Shore Kitchen",
    category: "Food",
    distanceKm: 0.8,
    vibe: "Relaxed",
    status: "Open",
    note: "Good option for food and a lower-energy reset.",
  },
  {
    id: "spot-3",
    name: "Community Arena",
    category: "Sports",
    distanceKm: 2.4,
    vibe: "Active",
    status: "Event tonight",
    note: "Local sports activity with moderate crowd energy.",
  },
  {
    id: "spot-4",
    name: "Waterfront Walk",
    category: "Outdoor",
    distanceKm: 1.6,
    vibe: "Calm",
    status: "Open",
    note: "Lower-energy outdoor option for a quieter evening.",
  },
  {
    id: "spot-5",
    name: "Stay In",
    category: "Stay In",
    distanceKm: 0,
    vibe: "Private",
    status: "Always available",
    note: "Best fallback when weather, fatigue, or safety makes staying in the better move.",
  },
];

const liveActivities: LiveActivity[] = [
  {
    id: "live-1",
    title: "Crowd building at Harbour Social",
    area: "Downtown",
    activityType: "Nightlife",
    vibe: "High energy",
    crowdLevel: "Busy",
    minutesAgo: 3,
    trusted: true,
    note: "Music is picking up and the crowd is growing quickly.",
  },
  {
    id: "live-2",
    title: "Late-night food rush",
    area: "North Shore Kitchen",
    activityType: "Food",
    vibe: "Relaxed",
    crowdLevel: "Moderate",
    minutesAgo: 8,
    trusted: true,
    note: "Good food option with a calmer atmosphere than nearby nightlife.",
  },
  {
    id: "live-3",
    title: "Local game ending soon",
    area: "Community Arena",
    activityType: "Sports",
    vibe: "Active",
    crowdLevel: "Busy",
    minutesAgo: 12,
    trusted: false,
    note: "Expect heavier movement and traffic as people begin leaving.",
  },
  {
    id: "live-4",
    title: "Waterfront is quiet",
    area: "Waterfront Walk",
    activityType: "Outdoor",
    vibe: "Calm",
    crowdLevel: "Low",
    minutesAgo: 5,
    trusted: true,
    note: "Low crowd activity and a quieter environment right now.",
  },
];

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
  userCoords: { lat: number; lng: number } | null
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
    activity.longitude
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
      return parsed.ids.map((item: unknown) => String(item).trim()).filter(Boolean);
    }

    if (Array.isArray(parsed?.names)) {
      return parsed.names.map((item: unknown) => String(item).trim()).filter(Boolean);
    }

    if (Array.isArray(parsed?.members)) {
      return parsed.members
        .map((item: unknown) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object") {
            const maybeName =
              "name" in item ? String((item as { name?: unknown }).name || "") : "";
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

function convertLivePostRow(
  row: LivePostRow
): LiveActivity {
  const createdTime = new Date(row.created_at).getTime();
  const now = Date.now();

  const minutesAgo = Math.max(
    0,
    Math.floor((now - createdTime) / 60000)
  );

  const validActivityTypes: LiveActivity["activityType"][] = [
    "Nightlife",
    "Food",
    "Event",
    "Sports",
    "Outdoor",
  ];

  const activityType =
    validActivityTypes.includes(
      row.activity_type as LiveActivity["activityType"]
    )
      ? (row.activity_type as LiveActivity["activityType"])
      : "Event";

  const validCrowdLevels: LiveActivity["crowdLevel"][] = [
    "Low",
    "Moderate",
    "Busy",
    "Packed",
  ];

  const crowdLevel =
    validCrowdLevels.includes(
      row.crowd_level as LiveActivity["crowdLevel"]
    )
      ? (row.crowd_level as LiveActivity["crowdLevel"])
      : "Moderate";

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    area: row.area,
    activityType,
    vibe: row.vibe,
    crowdLevel,
    minutesAgo,
    trusted: row.trusted,
    note:
      row.note ||
      "Live update shared from the area.",
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

  if (heartbeat >= 100 || status.includes("club") || status.includes("drinking")) {
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

const getPartyStatusKey = (userId: string) =>
  `twincore_party_status_${userId}`;

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

// PASTE ABOVE THE COMPONENT
export default function SpotsPage() {

  const [activeView, setActiveView] = useState<SpotsView>("crew");
  const [nearbyCategory, setNearbyCategory] =
  useState<NearbySpot["category"] | "All">("All");
  const [liveFilter, setLiveFilter] =
  useState<LiveActivity["activityType"] | "All">("All");
  const [postComposerOpen, setPostComposerOpen] = useState(false);
const [databaseLivePosts, setDatabaseLivePosts] =
  useState<LiveActivity[]>([]);
const [livePostType, setLivePostType] =
  useState<LivePostType>("Great vibe");

const [livePostNote, setLivePostNote] = useState("");

const [livePostLocation, setLivePostLocation] =
  useState("Current Location");

const [liveLocationMode, setLiveLocationMode] =
  useState<"current" | "venue">("current");

const [localLivePosts, setLocalLivePosts] =
  useState<LiveActivity[]>([]);
  const [displayName, setDisplayName] = useState("Neo");
  const [partyStatus, setPartyStatus] = useState<string | null>(null);
  const [hasSharedLocation, setHasSharedLocation] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string>("");
  const [sweepOn, setSweepOn] = useState(true);
  const [liveTick, setLiveTick] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
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

    if (savedName) setDisplayName(savedName);
    if (savedStatus) setPartyStatus(savedStatus);
    if (savedLocation) setHasSharedLocation(true);

    setGhostMode(parseStoredBoolean(savedGhostMode));
    setTrustedOnly(parseStoredBoolean(savedTrustedOnly));
    setTrustedIds(parseStoredStringArray(savedTrustedIds).map(normalizeValue));
    setTrustedNames(parseStoredStringArray(savedTrustedNames).map(normalizeValue));

       const interval = window.setInterval(() => {
      setLiveTick((prev) => !prev);
    }, 1800);

    return () => window.clearInterval(interval);
  }

  loadSpotsPage();
}, []);

  useEffect(() => {
    if (ghostMode) {
      setLocationError("Ghost Mode is on. Your exact position is being visually softened.");
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
    console.error("Geolocation error:", error);
    setLocationError("Unable to get your location.");
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000,
  }
);
  }, [ghostMode]);

  useEffect(() => {
    async function loadCrewStatus() {
      const { data, error } = await supabase
        .from("crew_status")
        .select(
          "id,name,status,latitude,longitude,location_name,vibe_label,heartbeat_bpm,updated_at"
        )
        .order("updated_at", { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
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
        }
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
        Number.isFinite(row.longitude)
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
        Number.isFinite(row.longitude)
    );

    if (validRows.length === 0) {
      return [] as RadarPoint[];
    }

    const draftPoints = validRows.map((row, index) => {
      const distanceKm = getDistanceKm(
        userCoords.lat,
        userCoords.lng,
        row.latitude as number,
        row.longitude as number
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
        name: blurred ? getBlurredName(index, tone) : row.name || `Crew ${index + 1}`,
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
        100
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

  const trustedVisibleCount = radarPoints.filter((point) => point.trusted).length;
  const visibleCount = radarPoints.length;
  const riskCount = radarPoints.filter((point) => point.tone === "risk").length;
  const litCount = radarPoints.filter((point) => point.tone === "lit").length;
  const safeCount = radarPoints.filter((point) => point.tone === "safe").length;
  const hotspotCount = radarPoints.filter((point) => point.clusterStrength >= 3).length;

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
  }, [ghostMode, trustedOnly, hasSharedLocation, userCoords, radarPoints.length, selectedSpot]);

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
    selectedName:
      selectedSpot.originalName || selectedSpot.name || null,
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
    JSON.stringify(snapshot)
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

const filteredNearbySpots = useMemo(() => {
  if (nearbyCategory === "All") {
    return nearbySpots;
  }

  return nearbySpots.filter(
    (spot) => spot.category === nearbyCategory
  );
}, [nearbyCategory]);

const filteredLiveActivities = useMemo(() => {
  const allLiveActivities = [
    ...databaseLivePosts,
    ...localLivePosts,
    ...liveActivities,
  ];

  const uniqueActivities = allLiveActivities.filter(
    (activity, index, array) =>
      array.findIndex(
        (item) => item.id === activity.id
      ) === index
  );

  const freshActivities = uniqueActivities.filter(
    (activity) =>
      activity.minutesAgo <= LIVE_POST_EXPIRY_MINUTES
  );


  const nearbyActivities = freshActivities.filter(
  (activity) => {
    const distance = getLiveActivityDistance(
      activity,
      userCoords
    );

    if (distance === null) {
      return true;
    }

    return distance <= 25;
  }
);

  if (liveFilter === "All") {
    return nearbyActivities;
  }

  return nearbyActivities.filter(
    (activity) =>
      activity.activityType === liveFilter
  );
}, [
  liveFilter,
  databaseLivePosts,
  localLivePosts,
   userCoords,
]);

const nearbySpotsWithLiveActivity = useMemo(() => {
  return filteredNearbySpots.map((spot) => {
    const matchingLiveReports = filteredLiveActivities.filter(
      (activity) =>
        activity.area.trim().toLowerCase() ===
        spot.name.trim().toLowerCase()
    );

    const latestReport = matchingLiveReports[0] ?? null;

    const uniqueReporterIds = new Set(
  matchingLiveReports
    .map((report) => report.userId)
    .filter((userId): userId is string => Boolean(userId))
);

const uniqueReporterCount = uniqueReporterIds.size;

    const liveSignalStrength = matchingLiveReports.reduce(
      (total, report) =>
        total + getLiveReportWeight(report.minutesAgo),
      0
    );

    const corroborationLevel =
  uniqueReporterCount >= 3
    ? "strong"
    : uniqueReporterCount >= 2
    ? "moderate"
    : matchingLiveReports.length >= 1
    ? "single"
    : "none";

    return {
      ...spot,
      liveReportCount: matchingLiveReports.length,
      uniqueReporterCount,
      latestLiveReport: latestReport,
      liveSignalStrength,
      corroborationLevel,
    };
  });
}, [
  filteredNearbySpots,
  filteredLiveActivities,
]);

const twinMeNearbySuggestion = useMemo(() => {
 if (nearbySpotsWithLiveActivity.length === 0) {
  return {
    spotName: "No recommendation yet",
    message:
      "TwinMe is waiting for nearby places and live activity before making a recommendation.",
    reasons: [],
    matchConfidence: 0,
  };
}

  const normalizedPartyStatus =
    (partyStatus || "").trim().toLowerCase();

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
      let score = 0;

      const vibe = spot.vibe.toLowerCase();
      const crowdLevel =
        spot.latestLiveReport?.crowdLevel?.toLowerCase() ?? "";

      score += Math.max(0, 25 - spot.distanceKm * 5);

      // LIVE SIGNAL STRENGTH
// Fresh and corroborated reports influence recommendations more.
score += Math.min(
  30,
  spot.liveSignalStrength * 12
);

// MULTIPLE REPORTS
if (spot.corroborationLevel === "strong") {
  score += 20;
} else if (spot.corroborationLevel === "moderate") {
  score += 10;
}

      if (crewIsHighEnergy) {
        if (vibe.includes("high energy")) {
          score += 45;
        }

        if (vibe.includes("active")) {
          score += 20;
        }

        if (
          vibe.includes("relaxed") ||
          vibe.includes("calm")
        ) {
          score -= 10;
        }
      }

      if (crewNeedsStability) {
        if (
          vibe.includes("relaxed") ||
          vibe.includes("calm")
        ) {
          score += 45;
        }

        if (vibe.includes("high energy")) {
          score -= 25;
        }
      }

      if (crowdLevel === "packed") {
        score -= crewNeedsStability ? 35 : 10;
      }

      if (crowdLevel === "busy") {
        score -= crewNeedsStability ? 20 : 0;
      }

      if (
        crowdLevel === "low" &&
        crewNeedsStability
      ) {
        score += 15;
      }

      return {
        ...spot,
        twinScore: score,
      };
    })
    .sort((a, b) => b.twinScore - a.twinScore);

 const bestSpot = rankedSpots[0];

if (!bestSpot) {
  return {
    spotName: "No recommendation yet",
    message:
      "TwinMe does not have enough information to recommend a nearby option yet.",
    reasons: [],
    matchConfidence: 0,
  };
}

const secondBestSpot = rankedSpots[1];

const scoreGap = secondBestSpot
  ? bestSpot.twinScore - secondBestSpot.twinScore
  : bestSpot.twinScore;

const matchConfidence = Math.min(
  95,
  Math.max(55, Math.round(65 + scoreGap))
);

  const reasons: string[] = [];

  if (crewIsHighEnergy) {
    reasons.push(
      "Matches your current higher-energy Party Mode."
    );
  }

  if (crewNeedsStability) {
    reasons.push(
      "Crew safety and stability signals were prioritized."
    );
  }

  reasons.push(
    `${bestSpot.distanceKm.toFixed(1)} km away.`
  );

  if (bestSpot.liveReportCount > 0) {
  reasons.push(
    `${bestSpot.liveReportCount} recent live report${
      bestSpot.liveReportCount === 1 ? "" : "s"
    } considered.`
  );
}

if (bestSpot.corroborationLevel === "strong") {
  reasons.push(
    `${bestSpot.uniqueReporterCount} different people support the current activity signal.`
  );
} else if (bestSpot.corroborationLevel === "moderate") {
  reasons.push(
    `${bestSpot.uniqueReporterCount} different people reported activity here.`
  );
} else if (
  bestSpot.liveReportCount > 1 &&
  bestSpot.uniqueReporterCount === 1
) {
  reasons.push(
    "Multiple updates were posted, but they came from the same reporter."
  );
}

  if (bestSpot.latestLiveReport) {
    reasons.push(
      `Latest update: "${bestSpot.latestLiveReport.title}".`
    );
  }

  return {
  spotName: bestSpot.name,
  message: `${bestSpot.name} looks like the strongest match right now.`,
  reasons,
  matchConfidence,
};

}, [
  nearbySpotsWithLiveActivity,
  partyStatus,
  riskCount,
]);

async function handlePostLiveUpdate() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("You must be signed in to post a live update.");
    return;
  }


console.log("Posting live update as user:", user.id);

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

if (
  liveLocationMode === "venue" &&
  !livePostLocation.trim()
) {
  alert("Please enter a venue or location name.");
  return;
}

const normalizedArea =
  liveLocationMode === "current"
    ? "Current location"
    : livePostLocation.trim() || "Unnamed location";

const cooldownCutoff = new Date(
  Date.now() - LIVE_REPORT_COOLDOWN_MINUTES * 60 * 1000
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
    recentPostsError
  );
}

  const payload = {
    user_id: user.id,
    display_name: displayName,
    title: livePostType,
    area: normalizedArea,
    activity_type: activityType,
    vibe: livePostType,
    crowd_level: crowdLevel,
    note:
      livePostNote.trim() ||
      "Live update shared from the area.",
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

  alert(
    `Your live update could not be posted.\n\n${error.message}`
  );

  return;
}

  if (data) {
    const newPost = convertLivePostRow(
      data as LivePostRow
    );

    setDatabaseLivePosts((current) => [
      newPost,
      ...current.filter(
        (post) => post.id !== newPost.id
      ),
    ]);
  }

  setLivePostNote("");
setLivePostLocation("Current Location");
setLiveLocationMode("current");
setPostComposerOpen(false);
}
  return (
    <AuthGuard>
    <main className="min-h-screen overflow-hidden bg-[#0A0A0B] text-white">
      <Link
  href="/"
  className="relative z-20 inline-flex rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
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

       <div className="relative mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="mb-2 text-xs tracking-[0.3em] text-white/50">TWINCORE</div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">
  Spots
</h1>
             <p className="mt-2 text-sm text-white/60">
  Crew awareness, nearby places, and live activity
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
<section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.035] p-2 backdrop-blur-xl">
  <div className="grid grid-cols-3 gap-2">
    {(
      [
        {
          id: "crew",
          label: "Crew",
          description: "Private radar",
        },
        {
          id: "nearby",
          label: "Nearby",
          description: "Places & events",
        },
        {
          id: "live",
          label: "Live",
          description: "Happening now",
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
          <div className="text-sm font-black">
            {view.label}
          </div>

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
    <section className="rounded-3xl border border-fuchsia-300/20 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.14),transparent_45%),linear-gradient(180deg,#15111d,#0b0b0f)] p-5 shadow-[0_0_45px_rgba(217,70,239,0.10)]">
      <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-fuchsia-100">
        <MapPin className="h-3.5 w-3.5" />
        Nearby Discovery
      </div>

      <h2 className="mt-4 text-2xl font-black text-white">
        Find What Fits Right Now
      </h2>

      <p className="mt-2 text-sm leading-6 text-white/65">
        Discover nearby places based on distance, energy,
        activity, and what fits your current night.
      </p>
    </section>

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

    <section className="space-y-3">
      {nearbySpotsWithLiveActivity.map((spot) => (
        <div
          key={spot.id}
          className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-white">
                {spot.name}
              </div>

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
           {spot.liveReportCount > 0 ? (
          <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs font-semibold text-orange-100">
           🔥 {spot.liveReportCount} live report

          {spot.corroborationLevel === "strong" ? (
  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
    Strong signal
  </span>
) : spot.corroborationLevel === "moderate" ? (
  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
    Confirmed activity
  </span>
) : null}

           {spot.liveReportCount === 1 ? "" : "s"}
          </span>
          ) : null}

          </div>

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

  <p className="mt-2 text-sm leading-6 text-white/75">
    {twinMeNearbySuggestion.message}
  </p>

  {twinMeNearbySuggestion.reasons.length > 0 ? (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
        Why this?
      </div>

      <div className="mt-3 space-y-2">
        {twinMeNearbySuggestion.reasons.map(
          (reason, index) => (
            <div
              key={`${reason}-${index}`}
              className="flex items-start gap-2 text-sm text-white/65"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />

              <span>
                {reason}
              </span>
            </div>
          )
        )}
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
    <section className="rounded-3xl border border-orange-300/20 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.14),transparent_45%),linear-gradient(180deg,#1c130e,#0b0b0f)] p-5 shadow-[0_0_45px_rgba(251,146,60,0.10)]">
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
  onClick={() =>
    setPostComposerOpen((current) => !current)
  }
  className="mt-4 w-full rounded-2xl border border-orange-300/25 bg-orange-300/10 px-4 py-3 text-sm font-bold text-orange-100 transition hover:bg-orange-300/15 active:scale-[0.98]"
>
  {postComposerOpen
    ? "Close Update"
    : "+ Post Live Update"}
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
        Your current coordinates will be attached to this live update.
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
      onChange={(event) =>
        setLivePostNote(event.target.value)
      }
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
    userCoords
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
    <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-white/80">
        <Radar className="h-3.5 w-3.5" />
        LIVE RADAR
      </div>

      <h2 className="text-2xl font-semibold text-white">
        {displayName}&apos;s Awareness Grid
      </h2>

          <p className="mt-3 text-sm leading-6 text-white/70">
            This layer compares live crew distance, signal intensity, and safer movement options before you move.
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
              {trustedOnly ? "TRUSTED ONLY" : `${trustedVisibleCount} TRUSTED`}
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
                    const hotspotSize = clamp(spot.clusterStrength * 42, 70, 130);

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
                ghostMode ? "bg-white/8 opacity-60 blur-[1px]" : "bg-white/15"
              }`}
              style={{ left: `${userPosition.x}%`, top: `${userPosition.y}%` }}
            >
              <LocateFixed className={`h-4 w-4 text-white ${ghostMode ? "opacity-70" : ""}`} />
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

                const nodeSize = clamp(34 + spot.clusterStrength * 3, 34, 46);

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
                        filter: spot.blurred ? "blur(12px)" : "blur(10px)",
                        transform: `scale(${spot.clusterStrength >= 3 ? 1.6 : 1.2})`,
                      }}
                    />
                    <span
                      className={`relative flex items-center justify-center rounded-full border bg-black/50 backdrop-blur ${
                        spot.blurred ? "border-white/20" : tone.ring
                      } ${selected ? "scale-110" : "scale-100"} transition-all duration-200`}
                      style={{ width: `${nodeSize}px`, height: `${nodeSize}px` }}
                    >
                      <span
                        className={`rounded-full ${
                          spot.blurred ? "bg-white/60 blur-[1px]" : tone.dot
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
                  <h3 className="text-lg font-semibold text-white">No live signals yet</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">{emptyStateReason}</p>
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
                  {selectedSpot.blurred ? <Lock className="h-4 w-4" /> : getToneIcon(selectedSpot.tone)}
                  {selectedSpot.blurred ? "LIMITED DETAIL" : selectedSpot.tone.toUpperCase()}
                </div>

                <h3 className={`mt-3 text-2xl font-semibold text-white ${selectedSpot.blurred ? "blur-[1.2px]" : ""}`}>
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

            <p className="text-sm leading-6 text-white/75">{selectedSpot.note}</p>

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
                value={selectedSpot.blurred ? 12 : Math.min(100, selectedSpot.clusterStrength * 24)}
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

            <h3 className="text-2xl font-semibold text-white">Waiting for live movement</h3>
            <p className="mt-3 text-sm leading-6 text-white/70">{emptyStateReason}</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/50">Location</div>
                <div className="mt-2 text-lg font-semibold">
                  {hasSharedLocation || userCoords ? "Ready" : "Needed"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/50">Crew Layer</div>
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
            <h2 className="text-xl font-semibold text-white">Live Points</h2>
            <span className="text-sm text-white/55">{visibleCount} visible</span>
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
                          {spot.blurred ? <Lock className="h-4 w-4" /> : getToneIcon(spot.tone)}
                          <span className={`text-lg font-semibold ${spot.blurred ? "blur-[1px]" : ""}`}>
                            {spot.name}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/70">{spot.note}</p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                          spot.blurred ? "bg-white/10 text-white/75" : tone.badge
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
              <p className="text-lg font-semibold text-white">No live points yet</p>
              <p className="mt-2 text-sm leading-6 text-white/65">{emptyStateReason}</p>
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