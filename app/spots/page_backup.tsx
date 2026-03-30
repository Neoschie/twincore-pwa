"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Flame,
  MapPin,
  Shield,
  Radar,
  EyeOff,
  Lock,
  Activity,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ================= TYPES ================= */

type SpotTone = "lit" | "safe" | "risk" | "chill";

type CrewStatusRow = {
  id?: string;
  name?: string | null;
  status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  vibe_label?: string | null;
  heartbeat_bpm?: number | null;
};

type RadarPoint = {
  id: string;
  name: string;
  tone: SpotTone;
  x: number;
  y: number;
  distanceKm: number;
  trusted: boolean;
  blurred: boolean;
  clusterStrength: number;
};

/* ================= HELPERS ================= */

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function toRad(v: number) {
  return (v * Math.PI) / 180;
}

function distanceKm(a: any, b: any) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

/* ================= PAGE ================= */

export default function SpotsPage() {
  const [selectedSpotId, setSelectedSpotId] = useState("");
  const [crewRows, setCrewRows] = useState<CrewStatusRow[]>([]);
  const [userCoords, setUserCoords] = useState<any>(null);

  const [ghostMode, setGhostMode] = useState(false);
  const [trustedOnly, setTrustedOnly] = useState(false);
  const [trustedIds, setTrustedIds] = useState<string[]>([]);

  /* ================= LOAD ================= */

  useEffect(() => {
    const g = localStorage.getItem("twincore_ghost_mode");
    const t = localStorage.getItem("twincore_trusted_only");
    const ids = localStorage.getItem("twincore_trusted_crew_ids");

    if (g === "true") setGhostMode(true);
    if (t === "true") setTrustedOnly(true);
    if (ids) setTrustedIds(JSON.parse(ids));
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    });
  }, []);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("crew_status")
        .select("*")
        .limit(50);

      if (data) setCrewRows(data);
    }

    load();
  }, []);

  /* ================= RADAR ================= */

  const radarPoints = useMemo(() => {
    if (!userCoords) return [];

    const points = crewRows
      .filter((r) => r.latitude && r.longitude)
      .map((r, i) => {
        const dist = distanceKm(userCoords, {
          lat: r.latitude,
          lng: r.longitude,
        });

        const trusted = trustedIds.includes(r.id || "");

        return {
          id: r.id || String(i),
          name: trusted ? r.name || "Crew" : "Hidden",
          tone:
            r.status?.includes("help") ? "risk" :
            r.status?.includes("safe") ? "safe" :
            r.heartbeat_bpm && r.heartbeat_bpm > 100 ? "lit" :
            "chill",
          x: clamp(50 + (r.longitude! - userCoords.lng) * 9000, 10, 90),
          y: clamp(50 - (r.latitude! - userCoords.lat) * 9000, 10, 90),
          distanceKm: dist,
          trusted,
          blurred: !trusted,
          clusterStrength: 1,
        } as RadarPoint;
      });

    if (trustedOnly) return points.filter((p) => p.trusted);

    return points;
  }, [crewRows, userCoords, trustedIds, trustedOnly]);

  /* ================= SELECT ================= */

  useEffect(() => {
    if (!selectedSpotId && radarPoints.length) {
      setSelectedSpotId(radarPoints[0].id);
    }
  }, [radarPoints, selectedSpotId]);

  const selectedSpot =
    radarPoints.find((s) => s.id === selectedSpotId) || radarPoints[0];

  /* ================= COUNTS ================= */

  const visibleCount = radarPoints.length;
  const riskCount = radarPoints.filter((p) => p.tone === "risk").length;
  const safeCount = radarPoints.filter((p) => p.tone === "safe").length;
  const litCount = radarPoints.filter((p) => p.tone === "lit").length;

  const radarEnergy =
    riskCount > 0 ? "risk" :
    litCount >= 2 ? "lit" :
    safeCount > 0 ? "safe" :
    "calm";

  /* ================= 🔥 SNAPSHOT FIX ================= */

  useEffect(() => {
    if (!selectedSpot) return;

    const snapshot = {
      visibleCount,
      riskCount,
      safeCount,
      litCount,
      radarEnergy,
      selectedTone: selectedSpot.tone,
      selectedName: selectedSpot.name,
      distanceKm: Number(selectedSpot.distanceKm.toFixed(2)),
      trusted: selectedSpot.trusted,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "twincore_spots_snapshot",
      JSON.stringify(snapshot)
    );
  }, [
    visibleCount,
    riskCount,
    safeCount,
    litCount,
    radarEnergy,
    selectedSpot,
  ]);

  /* ================= UI ================= */

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl mb-6">Spots</h1>

      <div className="mb-4">
        Energy: <b>{radarEnergy}</b>
      </div>

      <div className="mb-4">
        Visible: {visibleCount}
      </div>

      <div className="space-y-2">
        {radarPoints.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedSpotId(p.id)}
            className="block w-full text-left p-3 bg-white/5 rounded"
          >
            {p.name} — {p.tone}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <Link href="/twinme">→ Go to TwinMe</Link>
      </div>
    </main>
  );
}