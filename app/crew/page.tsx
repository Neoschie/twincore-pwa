"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  MapPin,
  Radio,
  Route,
  Siren,
  Users,
  EyeOff,
  Ghost,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import StatusChip from "../_components/status-chip";
import PageHeader from "../_components/page-header";
import GlobalStatusBar from "../_components/global-status-bar";
import AnimatedCard from "../_components/animated-card";

const STORAGE_KEY = "twincore_profile";

type CrewStatusRow = {
  id?: string;
  name?: string | null;
  status?: string | null;
  heartbeat_bpm?: number | null;
  vibe_label?: string | null;
  location_name?: string | null;
  updated_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type CrewMemberRow = {
  id: string;
  invite_code?: string | null;
  display_name?: string | null;
  crew_name?: string | null;
  joined_at?: string | null;
};

type FilterMode = "all" | "active" | "heading-home";

type PrivacySettings = {
  displayName: string;
  ghostMode: boolean;
  ghostLabel: string;
  blurPresence: boolean;
  trustedOnly: boolean;
  trustedList: string[];
};

const defaultPrivacy: PrivacySettings = {
  displayName: "Neo",
  ghostMode: false,
  ghostLabel: "Low Visibility",
  blurPresence: true,
  trustedOnly: false,
  trustedList: [],
};

function timeAgo(input?: string | null) {
  if (!input) return "No update";
  const then = new Date(input).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

function isFlaggedRow(row: CrewStatusRow) {
  const s = (row.status || "").toLowerCase();
  const v = (row.vibe_label || "").toLowerCase();

  return (
    s.includes("alert") ||
    s.includes("danger") ||
    s.includes("help") ||
    v.includes("alert") ||
    v.includes("danger") ||
    v.includes("help")
  );
}

function getRowTone(row: CrewStatusRow): "red" | "cyan" | "orange" | "neutral" {
  const status = (row.status || "").toLowerCase();

  if (isFlaggedRow(row)) return "red";
  if (status === "heading home") return "cyan";
  if (!status || status === "inactive") return "neutral";
  return "orange";
}

function getRadarPointClass(row: CrewStatusRow) {
  const tone = getRowTone(row);

  if (tone === "red") {
    return {
      dot: "bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.85)]",
      ring: "border-red-400/40",
      pulse: "animate-ping",
      label: "text-red-100",
    };
  }

  if (tone === "cyan") {
    return {
      dot: "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.8)]",
      ring: "border-cyan-300/40",
      pulse: "animate-pulse",
      label: "text-cyan-100",
    };
  }

  if (tone === "orange") {
    return {
      dot: "bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.8)]",
      ring: "border-orange-400/40",
      pulse: "animate-pulse",
      label: "text-orange-100",
    };
  }

  return {
    dot: "bg-white/70 shadow-[0_0_14px_rgba(255,255,255,0.4)]",
    ring: "border-white/20",
    pulse: "",
    label: "text-white/80",
  };
}

function getMockRadarPosition(index: number, total: number) {
  const presets = [
    { x: 50, y: 50 },
    { x: 34, y: 38 },
    { x: 68, y: 32 },
    { x: 28, y: 68 },
    { x: 74, y: 64 },
    { x: 52, y: 24 },
  ];

  if (index < presets.length) return presets[index];

  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    x: 50 + Math.cos(angle) * 26,
    y: 50 + Math.sin(angle) * 26,
  };
}

function getPrivacySettings(): PrivacySettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrivacy;

    const parsed = JSON.parse(raw) as Partial<PrivacySettings>;
    return {
      displayName: parsed.displayName || "Neo",
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

function canSeeFull(row: CrewStatusRow, privacy: PrivacySettings) {
  if (!privacy.trustedOnly) return true;

  const rowName = (row.name || "").trim().toLowerCase();
  const selfName = privacy.displayName.trim().toLowerCase();

  if (rowName && rowName === selfName) return true;

  return privacy.trustedList.some(
    (name) => name.trim().toLowerCase() === rowName
  );
}

function getDisplayRow(row: CrewStatusRow, privacy: PrivacySettings): CrewStatusRow {
  if (canSeeFull(row, privacy)) return row;

  return {
    ...row,
    status: "Trusted Only",
    vibe_label: privacy.ghostLabel || "Low Visibility",
    location_name: "Hidden",
  };
}

function dedupeCrewRows(rows: CrewStatusRow[]) {
  const seen = new Set<string>();
  const deduped: CrewStatusRow[] = [];

  for (const row of rows) {
    const key = `${(row.name || "").trim().toLowerCase()}::${(row.status || "")
      .trim()
      .toLowerCase()}::${(row.location_name || "").trim().toLowerCase()}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(row);
    }
  }

  return deduped;
}

export default function CrewPage() {
  const [crewRows, setCrewRows] = useState<CrewStatusRow[]>([]);
  const [crewMessage, setCrewMessage] = useState("Checking crew pulse...");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [liveTick, setLiveTick] = useState(false);
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacy);

  async function loadCrewSignals() {
    if (!supabase) {
      setCrewRows([]);
      setCrewMessage("Crew connection unavailable");
      return;
    }

    const [{ data: statusData, error: statusError }, { data: membersData, error: membersError }] =
      await Promise.all([
        supabase.from("crew_status").select("*").order("updated_at", { ascending: false }),
        supabase.from("crew_members").select("*").order("joined_at", { ascending: false }),
      ]);

    const combined: CrewStatusRow[] = [];

    if (!statusError && Array.isArray(statusData) && statusData.length > 0) {
      combined.push(...(statusData as CrewStatusRow[]));
    }

    if (!membersError && Array.isArray(membersData) && membersData.length > 0) {
      const mappedMembers = (membersData as CrewMemberRow[]).map((member) => ({
        id: member.id,
        name: member.display_name || "Crew Member",
        status: "joined",
        heartbeat_bpm: null,
        vibe_label: "Connected",
        location_name: member.crew_name || "TwinCore Crew",
        updated_at: member.joined_at || new Date().toISOString(),
        latitude: null,
        longitude: null,
      }));

      combined.push(...mappedMembers);
    }

    const deduped = dedupeCrewRows(combined);

    if (deduped.length > 0) {
      setCrewRows(deduped);
      setCrewMessage("Crew pulse connected");
      return;
    }

    setCrewRows([]);
    setCrewMessage("Crew energy unavailable");
  }

  useEffect(() => {
    setPrivacy(getPrivacySettings());
    void loadCrewSignals();

    const interval = window.setInterval(() => {
      void loadCrewSignals();
      setLiveTick((prev) => !prev);
    }, 8000);

    const pulseInterval = window.setInterval(() => {
      setLiveTick((prev) => !prev);
    }, 1800);

    const onStorage = () => {
      setPrivacy(getPrivacySettings());
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(pulseInterval);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const displayRows = useMemo(
    () => crewRows.map((row) => getDisplayRow(row, privacy)),
    [crewRows, privacy]
  );

  const crewStats = useMemo(() => {
    const headingHome = displayRows.filter(
      (r) => (r.status || "").toLowerCase() === "heading home"
    ).length;

    const flagged = displayRows.filter(isFlaggedRow).length;

    return {
      total: displayRows.length,
      headingHome,
      flagged,
    };
  }, [displayRows]);

  const filteredRows = useMemo(() => {
    if (filter === "heading-home") {
      return displayRows.filter(
        (r) => (r.status || "").toLowerCase() === "heading home"
      );
    }

    if (filter === "active") {
      return displayRows.filter(
        (r) => (r.status || "").toLowerCase() !== "heading home"
      );
    }

    return displayRows;
  }, [displayRows, filter]);

  const radarRows = filteredRows.slice(0, 6);

  return (
    <main className="min-h-screen overflow-hidden bg-[#0A0A0B] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_bottom,rgba(34,197,94,0.08),transparent_34%)]" />
        <div className="absolute left-1/2 top-16 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl animate-orb-drift" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:26px_26px]" />
      </div>

      <div className="relative py-6">
        <PageHeader
          title="Crew"
          subtitle="Live crew awareness"
          rightSlot={<GlobalStatusBar />}
        />

        <div className="space-y-5">
          <AnimatedCard className="rounded-3xl p-6 bg-[linear-gradient(180deg,#142033,#0d1624)] border border-blue-500/15 shadow-[0_20px_55px_rgba(0,0,0,0.35)]">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-white/80">
                <Radio className="h-3.5 w-3.5" />
                LIVE CREW STREAM
              </div>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Crew looks steady
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-white/70">
                {crewMessage}. Trusted-only visibility is{" "}
                {privacy.trustedOnly ? "active" : "off"} on this device.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatPill icon={Users} value={crewStats.total} label="Connected" />
              <StatPill icon={Route} value={crewStats.headingHome} label="Home" />
              <StatPill icon={Siren} value={crewStats.flagged} label="Alerts" />
            </div>
          </AnimatedCard>

          <AnimatedCard className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#101216,#090A0D)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.42)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-100">
                  <Activity className="h-4 w-4" />
                  Crew Radar
                </div>
                <p className="mt-1 text-sm text-white/55">
                  Live pulse around your crew layer
                </p>
              </div>

              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                {radarRows.length} visible
              </span>
            </div>

            <div className="relative aspect-square overflow-hidden rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.10),rgba(0,0,0,0.45)_52%,rgba(0,0,0,0.9)_100%)]">
              <div className="absolute inset-6 rounded-full border border-white/10" />
              <div className="absolute inset-12 rounded-full border border-white/10" />
              <div className="absolute inset-20 rounded-full border border-white/10" />
              <div className="absolute inset-28 rounded-full border border-white/10" />

              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10" />
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />

              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[48%] w-[48%] -translate-x-1/2 -translate-y-1/2 origin-bottom-right rounded-tl-full bg-[conic-gradient(from_0deg,rgba(96,165,250,0.0)_0deg,rgba(96,165,250,0.0)_280deg,rgba(96,165,250,0.25)_340deg,rgba(96,165,250,0.0)_360deg)] animate-[spin_4s_linear_infinite]" />
              </div>

              <div className="absolute left-1/2 top-1/2 z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/15 backdrop-blur">
                <div className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.8)]" />
              </div>

              {radarRows.map((row, index) => {
                const pos = getMockRadarPosition(index, radarRows.length);
                const tone = getRadarPointClass(row);
                const shift = liveTick && index !== 0 ? 0.8 : -0.8;
                const x = index % 2 === 0 ? pos.x + shift : pos.x;
                const y = index % 2 !== 0 ? pos.y + shift : pos.y;

                return (
                  <div
                    key={row.id || `${row.name || "crew"}-${index}`}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <span
                      className={`absolute inset-0 rounded-full ${tone.dot} opacity-50 blur-md ${tone.pulse}`}
                    />
                    <span
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full border bg-black/50 backdrop-blur ${tone.ring}`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full ${tone.dot}`} />
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {radarRows.map((row, index) => {
                const tone = getRadarPointClass(row);
                const trusted = canSeeFull(filteredRows[index] || row, privacy);

                return (
                  <div
                    key={row.id || `legend-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                      <span className={`truncate text-sm font-medium ${tone.label}`}>
                        {row.name || `Crew ${index + 1}`}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-white/55">
                      {!trusted && privacy.trustedOnly ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Trusted Only
                        </>
                      ) : (
                        row.status || "active"
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimatedCard>

          <AnimatedCard className="rounded-3xl bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-4 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "active", "heading-home"] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilter(mode)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition duration-200 hover:scale-[1.02] active:scale-[0.97] ${
                    filter === mode
                      ? "bg-orange-500/15 text-orange-100 shadow-[0_6px_20px_rgba(249,115,22,0.18)]"
                      : "bg-white/8 text-white/75 hover:bg-white/12"
                  }`}
                >
                  {mode === "all" ? "All" : mode === "active" ? "Active" : "Heading Home"}
                </button>
              ))}
            </div>
          </AnimatedCard>

          <AnimatedCard className="animate-glow rounded-3xl border border-blue-500/20 bg-[linear-gradient(180deg,#1a1f2e,#0c0f1a)] p-5 shadow-[0_20px_55px_rgba(59,130,246,0.18)]">
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-blue-100">
              <Brain className="h-4 w-4" />
              TwinMe Live Insight
            </div>

            <div className="text-base leading-7 text-white">
              {privacy.trustedOnly
                ? "TwinMe: trusted-only visibility is active. Non-trusted crew members are masked on this device."
                : crewStats.flagged > 0
                ? "TwinMe: one or more crew signals need attention. Reduce drift and check in now."
                : crewStats.headingHome > 0
                ? "TwinMe: your crew is starting to split. Keep tabs on who is heading home."
                : crewStats.total > 0
                ? "TwinMe: your crew is building. Stay connected and keep the energy aligned."
                : "TwinMe: your crew looks stable right now. Stay connected and enjoy the moment."}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip
                label={crewStats.flagged > 0 ? "HIGH ATTENTION" : "LIVE CREW STREAM"}
                tone={crewStats.flagged > 0 ? "red" : "blue"}
              />
              {privacy.trustedOnly ? (
                <StatusChip label="TRUSTED ONLY" tone="orange" />
              ) : null}
              {privacy.ghostMode ? <StatusChip label="GHOST MODE" tone="blue" /> : null}
            </div>
          </AnimatedCard>

          <div className="space-y-4">
            {filteredRows.map((row, i) => {
              const name = row.name || `Crew ${i + 1}`;
              const status = row.status || "active";
              const location = row.location_name || "Unknown";
              const tone = getRowTone(row);
              const trusted = canSeeFull(row, privacy);

              return (
                <AnimatedCard
                  key={row.id || `${name}-${i}`}
                  className="p-5 rounded-3xl bg-[linear-gradient(180deg,#111113,#0c0c0f)] shadow-[0_16px_45px_rgba(0,0,0,0.42)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-lg font-semibold text-white">
                        {tone === "red" ? (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                        ) : null}
                        {!trusted && privacy.trustedOnly ? (
                          <Ghost className="h-4 w-4 shrink-0 text-white/60" />
                        ) : null}
                        <span className="truncate">{name}</span>
                      </div>

                      <div className="mt-2 inline-flex items-center gap-2 text-sm text-white/60">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{location}</span>
                      </div>
                    </div>

                    <StatusChip
                      label={status}
                      tone={
                        tone === "red"
                          ? "red"
                          : tone === "cyan"
                          ? "cyan"
                          : tone === "orange"
                          ? "orange"
                          : "neutral"
                      }
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <MiniInfo
                      icon={Activity}
                      label="Heartbeat"
                      value={
                        trusted || !privacy.trustedOnly
                          ? row.heartbeat_bpm
                            ? `${row.heartbeat_bpm} BPM`
                            : "Linked"
                          : "Masked"
                      }
                    />
                    <MiniInfo
                      icon={Users}
                      label="Vibe"
                      value={row.vibe_label || "No vibe"}
                    />
                  </div>

                  <div className="mt-4 text-xs text-white/50">
                    {timeAgo(row.updated_at)}
                  </div>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatPill({
  icon: Icon,
  value,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <div className="mb-2 flex items-center justify-center">
        <Icon className="h-4 w-4 text-white/70" />
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-white/50">
        {label}
      </div>
    </div>
  );
}

function MiniInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="truncate text-sm font-medium text-white/85">{value}</div>
    </div>
  );
}