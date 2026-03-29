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
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type SpotTone = "lit" | "safe" | "risk" | "chill";

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
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
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
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean);
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
    };
  }

  if (tone === "safe") {
    return {
      dot: "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.75)]",
      ring: "border-emerald-400/40",
      card: "border-emerald-500/20 bg-[linear-gradient(180deg,#102019,#09120d)]",
      badge: "bg-emerald-500/15 text-emerald-100",
    };
  }

  if (tone === "risk") {
    return {
      dot: "bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.85)]",
      ring: "border-red-400/40",
      card: "border-red-500/20 bg-[linear-gradient(180deg,#2a1417,#15090b)]",
      badge: "bg-red-500/15 text-red-100",
    };
  }

  return {
    dot: "bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.75)]",
    ring: "border-blue-400/40",
    card: "border-blue-500/20 bg-[linear-gradient(180deg,#131c2b,#0b1119)]",
    badge: "bg-blue-500/15 text-blue-100",
  };
}

function getToneIcon(tone: SpotTone) {
  if (tone === "lit") return <Flame className="h-4 w-4" />;
  if (tone === "safe") return <Shield className="h-4 w-4" />;
  if (tone === "risk") return <AlertTriangle className="h-4 w-4" />;
  return <MapPin className="h-4 w-4" />;
}

function getPulseClass(tone: SpotTone) {
  if (tone === "risk") return "animate-ping";
  if (tone === "lit") return "animate-pulse";
  return "";
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

function buildFallbackPoints(
  partyStatus: string | null,
  hasSharedLocation: boolean,
  trustedOnly: boolean
): RadarPoint[] {
  const base: RadarPoint[] = [
    {
      id: "fallback-1",
      name: "Downtown Club",
      tone: "lit",
      crew: 2,
      x: 72,
      y: 28,
      note: "High energy. Stay with your people.",
      distanceKm: 1.4,
      status: "active",
      trusted: true,
      blurred: false,
    },
    {
      id: "fallback-2",
      name: "Late Night Diner",
      tone: "safe",
      crew: 1,
      x: 26,
      y: 78,
      note: "Good reset point if the night is winding down.",
      distanceKm: 2.1,
      status: "safe",
      trusted: true,
      blurred: false,
    },
    {
      id: "fallback-3",
      name: "Unknown House Party",
      tone: "risk",
      crew: 0,
      x: 82,
      y: 68,
      note: "Low visibility and no crew presence.",
      distanceKm: 3.7,
      status: "unknown",
      trusted: false,
      blurred: true,
    },
    {
      id: "fallback-4",
      name: "Lounge Bar",
      tone: "chill",
      crew: 3,
      x: 42,
      y: 36,
      note: "Lower pressure environment with crew nearby.",
      distanceKm: 0.9,
      status: "active",
      trusted: true,
      blurred: false,
    },
  ];

  const processed = base.map((point, index) => {
    if (point.trusted) return point;

    return {
      ...point,
      name: getBlurredName(index, point.tone),
      note: getBlurredNote(point.tone, point.distanceKm),
      x: clamp(point.x + 3, 10, 90),
      y: clamp(point.y - 2, 10, 90),
    };
  });

  if (trustedOnly) {
    return processed.filter((point) => point.trusted);
  }

  if (!hasSharedLocation && !partyStatus) {
    return processed;
  }

  return processed;
}

export default function SpotsPage() {
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
    const savedName = window.localStorage.getItem("twincore_display_name");
    const savedStatus = window.localStorage.getItem("twincore_party_status");
    const savedLocation = window.localStorage.getItem("twincore_last_shared_location");

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
        setHasSharedLocation(true);
        setLocationError(null);

        window.localStorage.setItem(
          "twincore_last_shared_location",
          JSON.stringify({
            latitude: nextCoords.lat,
            longitude: nextCoords.lng,
            timestamp: new Date().toISOString(),
            mapsUrl: `https://maps.google.com/?q=${nextCoords.lat},${nextCoords.lng}`,
          })
        );
      },
      () => {
        setLocationError("Location access is off. Turn it on for live crew radar.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 12000,
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

    if (ghostMode) {
      return { x: 50, y: 50 };
    }

    return { x: 50, y: 50 };
  }, [partyStatus, userCoords, ghostMode]);

  const radarPoints = useMemo(() => {
    if (!userCoords) {
      return buildFallbackPoints(partyStatus, hasSharedLocation, trustedOnly).map((point) => {
        const slightShift = liveTick ? 0.8 : -0.8;

        if (point.tone === "lit") {
          return { ...point, x: point.x + slightShift, y: point.y };
        }

        if (point.tone === "risk") {
          return { ...point, x: point.x, y: point.y + slightShift };
        }

        return point;
      });
    }

    const validRows = crewRows.filter(
      (row) =>
        typeof row.latitude === "number" &&
        typeof row.longitude === "number" &&
        Number.isFinite(row.latitude) &&
        Number.isFinite(row.longitude)
    );

    if (validRows.length === 0) {
      return buildFallbackPoints(partyStatus, hasSharedLocation, trustedOnly);
    }

    const builtPoints = validRows.map((row, index) => {
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
          ? 0.5
          : tone === "risk"
          ? 0.3
          : 0
        : tone === "lit"
        ? -0.5
        : tone === "risk"
        ? -0.3
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
      } as RadarPoint;
    });

    if (trustedOnly) {
      return builtPoints.filter((point) => point.trusted);
    }

    return builtPoints;
  }, [
    crewRows,
    userCoords,
    liveTick,
    partyStatus,
    hasSharedLocation,
    trustedIds,
    trustedNames,
    trustedOnly,
  ]);

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

  const twinInsight = useMemo(() => {
    if (ghostMode && trustedOnly) {
      return "TwinMe: Ghost Mode and Trusted Crew Only are both on. Your view is privacy-first and restricted to trusted signals.";
    }

    if (ghostMode) {
      return "TwinMe: Ghost Mode is on. Your exact position is visually softened while awareness stays active.";
    }

    if (trustedOnly) {
      return "TwinMe: only trusted crew signals are being shown right now.";
    }

    if (!hasSharedLocation) {
      return "TwinMe: turn location on to improve live awareness and keep your movement easier for crew to follow.";
    }

    if (!selectedSpot) {
      return "TwinMe: no live crew points yet. Keep awareness high until more signals arrive.";
    }

    if (!selectedSpot.trusted) {
      return "TwinMe: this point is outside your trusted layer, so details are intentionally blurred.";
    }

    if (selectedSpot.tone === "risk") {
      return "TwinMe: this point needs attention. Someone may be isolated, off-pattern, or signaling risk.";
    }

    if (selectedSpot.tone === "lit") {
      return "TwinMe: energy is high here. Only move in if your people are aligned and your exit stays easy.";
    }

    if (selectedSpot.tone === "safe") {
      return "TwinMe: this looks like a strong anchor or reset point if you want to cool the night down.";
    }

    if (selectedSpot.distanceKm > 3) {
      return "TwinMe: this crew point is getting far from you. Watch for separation before it becomes a problem.";
    }

    return "TwinMe: this area looks more balanced. Stay aware, but it is a better choice than high-chaos spots.";
  }, [ghostMode, trustedOnly, hasSharedLocation, selectedSpot]);

  const safetyState = useMemo(() => {
    if (!selectedSpot) return "aware";
    if (!selectedSpot.trusted) return "restricted";
    if (selectedSpot.tone === "risk") return "high attention";
    if (selectedSpot.tone === "lit") return "active";
    if (selectedSpot.tone === "safe") return "stable";
    return "aware";
  }, [selectedSpot]);

  const nearbyCount = useMemo(() => {
    return radarPoints.filter((point) => point.distanceKm <= 1.5).length;
  }, [radarPoints]);

  const visibleCount = radarPoints.length;
  const trustedVisibleCount = radarPoints.filter((point) => point.trusted).length;

  return (
    <main className="min-h-screen overflow-hidden bg-[#0A0A0B] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.10),transparent_34%)]" />
        <div className="absolute left-1/2 top-14 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl animate-orb-drift" />
        <div className="absolute bottom-10 right-[-8%] h-64 w-64 rounded-full bg-orange-500/10 blur-3xl animate-orb-drift" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:26px_26px]" />
      </div>

      <div className="relative mx-auto w-full max-w-md px-4 py-8">
        <header className="mb-8">
          <div className="mb-2 text-xs tracking-[0.3em] text-white/50">
            TWINCORE
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">Map Mode</h1>
              <p className="mt-2 text-sm text-white/60">
                Live situational awareness around you
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSweepOn((prev) => !prev)}
              className="twincore-press rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            >
              {sweepOn ? "Radar On" : "Radar Off"}
            </button>
          </div>
        </header>

        <section className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-white/80">
            <Radar className="h-3.5 w-3.5" />
            LIVE RADAR
          </div>

          <h2 className="text-2xl font-semibold text-white">
            {displayName}'s Awareness Grid
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

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#101216,#090A0D)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.42)]">
          <div className="relative aspect-square overflow-hidden rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.10),rgba(0,0,0,0.4)_52%,rgba(0,0,0,0.88)_100%)]">
            <div className="absolute inset-6 rounded-full border border-white/10" />
            <div className="absolute inset-12 rounded-full border border-white/10" />
            <div className="absolute inset-20 rounded-full border border-white/10" />
            <div className="absolute inset-28 rounded-full border border-white/10" />

            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10" />
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />

            {sweepOn ? (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[48%] w-[48%] -translate-x-1/2 -translate-y-1/2 origin-bottom-right rounded-tl-full bg-[conic-gradient(from_0deg,rgba(96,165,250,0.0)_0deg,rgba(96,165,250,0.0)_280deg,rgba(96,165,250,0.28)_340deg,rgba(96,165,250,0.0)_360deg)] animate-[spin_4s_linear_infinite]" />
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

            {radarPoints.map((spot) => {
              const tone = getToneClasses(spot.tone);
              const selected = selectedSpot?.id === spot.id;

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
                    className={`absolute inset-0 rounded-full ${tone.dot} ${
                      spot.blurred ? "opacity-25 blur-lg" : `opacity-50 blur-md ${getPulseClass(spot.tone)}`
                    }`}
                  />
                  <span
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border bg-black/50 backdrop-blur ${
                      spot.blurred ? "border-white/20" : tone.ring
                    } ${selected ? "scale-110" : "scale-100"} transition-all duration-200`}
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded-full ${
                        spot.blurred ? "bg-white/60 blur-[1px]" : tone.dot
                      }`}
                    />
                  </span>
                </button>
              );
            })}

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

            <div className="mt-4 grid grid-cols-3 gap-3">
              <MiniMeter
                label="Risk"
                value={
                  selectedSpot.tone === "risk"
                    ? 90
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
                    : Math.min(100, selectedSpot.crew * 35)
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
        ) : null}

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

                      <p className="mt-2 text-sm leading-6 text-white/70">
                        {spot.note}
                      </p>
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
                      Crew nearby: {spot.crew}
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
    </main>
  );
}

function MiniMeter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
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