"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  Flame,
  Home,
  MapPin,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import StatusChip from "../_components/status-chip";
import PageHeader from "../_components/page-header";
import GlobalStatusBar from "../_components/global-status-bar";
import AnimatedCard from "../_components/animated-card";

type CrewStatusRow = {
  id?: string;
  name?: string | null;
  status?: string | null;
  heartbeat_bpm?: number | null;
  vibe_label?: string | null;
  location_name?: string | null;
  updated_at?: string | null;
};

type SafetyState = "safe" | "active" | "alert";
type FilterMode = "all" | "active" | "heading-home";
type TwinMeTone = "red" | "orange" | "blue" | "green";

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

function formatLocationLink(location: string) {
  const trimmed = location.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://maps.google.com/?q=${encodeURIComponent(trimmed)}`;
}

function buildLocalFallbackCrew(): CrewStatusRow[] {
  if (typeof window === "undefined") return [];

  const displayName = window.localStorage.getItem("twincore_display_name") || "Neo";
  const partyStatus = window.localStorage.getItem("twincore_party_status");
  const afterStatus = window.localStorage.getItem("twincore_exit_crew_status");
  const savedLocationRaw = window.localStorage.getItem("twincore_last_shared_location");

  let location_name = "Location unavailable";
  if (savedLocationRaw) {
    try {
      const parsed = JSON.parse(savedLocationRaw) as {
        latitude?: number;
        longitude?: number;
        mapsUrl?: string;
      };
      if (
        typeof parsed.latitude === "number" &&
        typeof parsed.longitude === "number"
      ) {
        location_name = `${parsed.latitude},${parsed.longitude}`;
      } else if (parsed.mapsUrl) {
        location_name = parsed.mapsUrl;
      }
    } catch {
      location_name = "Location unavailable";
    }
  }

  let status = "active";
  let vibe_label = "Party active";
  let heartbeat_bpm = 72;

  if (partyStatus === "need-help") {
    status = "alert";
    vibe_label = "Needs help";
    heartbeat_bpm = 110;
  } else if (partyStatus === "im-good") {
    status = "active";
    vibe_label = "I’m good";
    heartbeat_bpm = 72;
  } else if (afterStatus) {
    status = "heading home";
    vibe_label = "After active";
    heartbeat_bpm = 72;
  }

  return [
    {
      id: "local-self",
      name: displayName,
      status,
      heartbeat_bpm,
      vibe_label,
      location_name,
      updated_at: new Date().toISOString(),
    },
  ];
}

function isFlaggedRow(row: CrewStatusRow) {
  const status = (row.status || "").toLowerCase();
  const vibe = (row.vibe_label || "").toLowerCase();

  return (
    status.includes("help") ||
    status.includes("alert") ||
    status.includes("danger") ||
    status.includes("unsafe") ||
    vibe.includes("help") ||
    vibe.includes("alert") ||
    vibe.includes("danger") ||
    vibe.includes("unsafe")
  );
}

export default function CrewPage() {
  const [crewRows, setCrewRows] = useState<CrewStatusRow[]>([]);
  const [crewMessage, setCrewMessage] = useState("Checking crew pulse...");
  const [realtimePulse, setRealtimePulse] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sharedLocation, setSharedLocation] = useState<string | null>(null);

  async function loadCrewSignals() {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("crew_status")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(50);

        if (!error && data && data.length > 0) {
          setCrewRows(data as CrewStatusRow[]);
          setCrewMessage("Crew pulse connected");
          return;
        }
      }
    } catch {
      // fallback below
    }

    const fallbackRows = buildLocalFallbackCrew();
    if (fallbackRows.length > 0) {
      setCrewRows(fallbackRows);
      setCrewMessage("Using local crew fallback");
      return;
    }

    setCrewRows([]);
    setCrewMessage(supabase ? "Crew energy unavailable" : "Supabase not configured");
  }

  useEffect(() => {
    void loadCrewSignals();

    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("twincore_last_shared_location");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { mapsUrl?: string };
          setSharedLocation(parsed.mapsUrl || null);
        } catch {
          setSharedLocation(null);
        }
      }
    }

    const refreshInterval = window.setInterval(() => {
      void loadCrewSignals();
    }, 10000);

    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;

    if (supabase) {
      channel = supabase
        .channel("crew-page-status-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "crew_status" },
          async () => {
            await loadCrewSignals();
            setCrewMessage("Crew pulse updated live");
            setRealtimePulse(true);
            window.setTimeout(() => setRealtimePulse(false), 260);
          }
        )
        .subscribe();
    }

    const onStorage = () => {
      void loadCrewSignals();
      const saved = window.localStorage.getItem("twincore_last_shared_location");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { mapsUrl?: string };
          setSharedLocation(parsed.mapsUrl || null);
        } catch {
          setSharedLocation(null);
        }
      } else {
        setSharedLocation(null);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
    }

    return () => {
      window.clearInterval(refreshInterval);
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
      }
    };
  }, []);

  const crewStats = useMemo(() => {
    const active = crewRows.filter((row) => {
      const status = (row.status || "").toLowerCase();
      return !["heading home", "inactive", ""].includes(status);
    }).length;

    const headingHome = crewRows.filter((row) => {
      const status = (row.status || "").toLowerCase();
      return status === "heading home";
    }).length;

    const inactive = crewRows.filter((row) => {
      const status = (row.status || "").toLowerCase();
      return status === "inactive" || status === "";
    }).length;

    const avgHeartbeat =
      crewRows.length > 0
        ? Math.round(
            crewRows.reduce((sum, row) => sum + (row.heartbeat_bpm || 70), 0) /
              crewRows.length
          )
        : 70;

    const flagged = crewRows.filter((row) => isFlaggedRow(row)).length;

    const recent = crewRows.filter((row) => {
      if (!row.updated_at) return false;
      const updatedAt = new Date(row.updated_at).getTime();
      return Date.now() - updatedAt < 1000 * 60 * 10;
    }).length;

    return {
      total: crewRows.length,
      active,
      headingHome,
      inactive,
      avgHeartbeat,
      flagged,
      recent,
    };
  }, [crewRows]);

  const crewEnergy = useMemo(() => {
    const calculated =
      56 +
      crewStats.active * 10 +
      crewStats.recent * 2 +
      Math.max(-4, Math.min(10, Math.round((crewStats.avgHeartbeat - 72) / 2))) -
      crewStats.headingHome * 4 -
      crewStats.inactive * 2 +
      (realtimePulse ? 4 : 0);

    return Math.max(38, Math.min(100, calculated));
  }, [crewStats, realtimePulse]);

  const safetyState = useMemo<SafetyState>(() => {
    if (crewStats.flagged > 0) return "alert";
    if (crewStats.active >= 2 || crewEnergy > 70) return "active";
    return "safe";
  }, [crewStats.flagged, crewStats.active, crewEnergy]);

  const twinMeInsight = useMemo(() => {
    if (crewStats.flagged > 0) {
      return "TwinMe: someone in your crew may need help. Check in immediately and reduce distractions.";
    }

    if (crewStats.headingHome > 0 && crewStats.active <= 1) {
      return "TwinMe: your group is starting to split. Decide whether you’re staying or leaving before you get isolated.";
    }

    if (crewStats.avgHeartbeat > 100) {
      return "TwinMe: group energy is high right now. Keep decisions slower than the pace around you.";
    }

    if (crewStats.avgHeartbeat < 65 && crewStats.total > 0) {
      return "TwinMe: your crew looks like it’s winding down. This may be a good moment to head home cleanly.";
    }

    if (crewStats.total === 0) {
      return "TwinMe: no crew is connected right now. Move with extra awareness and keep your exits simple.";
    }

    return "TwinMe: your crew looks stable right now. Stay connected, stay aware, and enjoy the moment.";
  }, [crewStats]);

  const twinMeTone: TwinMeTone = useMemo(() => {
    if (crewStats.flagged > 0) return "red";
    if (crewStats.headingHome > 0 || crewStats.avgHeartbeat > 100) return "orange";
    if (sharedLocation) return "blue";
    return "green";
  }, [crewStats, sharedLocation]);

  const filteredRows = useMemo(() => {
    const base = crewRows.filter((row) => {
      const status = (row.status || "").toLowerCase();
      if (filter === "active") return !["heading home", "inactive", ""].includes(status);
      if (filter === "heading-home") return status === "heading home";
      return true;
    });

    return [...base].sort((a, b) => {
      const aFlagged = isFlaggedRow(a) ? 1 : 0;
      const bFlagged = isFlaggedRow(b) ? 1 : 0;

      if (aFlagged !== bFlagged) return bFlagged - aFlagged;

      const aUpdated = new Date(a.updated_at || 0).getTime();
      const bUpdated = new Date(b.updated_at || 0).getTime();
      return bUpdated - aUpdated;
    });
  }, [crewRows, filter]);

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_34%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.08),transparent_34%)]" />

      <div className="relative py-6">
        <PageHeader
          title="Crew"
          subtitle="Your people, live and moving"
          rightSlot={<GlobalStatusBar />}
        />

        <div className="space-y-5">
          {sharedLocation ? (
            <AnimatedCard
              className="rounded-3xl border border-blue-500/15 bg-[linear-gradient(180deg,#162033,#0f1624)] p-5 shadow-[0_20px_50px_rgba(59,130,246,0.16)] transition duration-200 hover:scale-[1.01]"
              index={0}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
                <MapPin className="h-4 w-4" />
                Last Shared Location
              </div>

              <a
                href={sharedLocation}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm text-blue-300 underline underline-offset-4"
              >
                Open in Maps
              </a>
            </AnimatedCard>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            <AnimatedCard
              className="rounded-3xl bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)] transition duration-200 hover:scale-[1.01]"
              index={1}
            >
              <MetricCard
                icon={Users}
                label="Total Crew"
                value={crewStats.total.toString()}
                footer={crewMessage}
              />
            </AnimatedCard>

            <AnimatedCard
              className="rounded-3xl bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)] transition duration-200 hover:scale-[1.01]"
              index={2}
            >
              <EnergyCard value={crewEnergy} />
            </AnimatedCard>

            <AnimatedCard
              className="rounded-3xl bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)] transition duration-200 hover:scale-[1.01]"
              index={3}
            >
              <SafetyCard state={safetyState} />
            </AnimatedCard>

            <AnimatedCard
              className="rounded-3xl bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.42)] transition duration-200 hover:scale-[1.01]"
              index={4}
            >
              <MetricCard
                icon={Activity}
                label="Avg Heartbeat"
                value={`${crewStats.avgHeartbeat} BPM`}
                footer={`${crewStats.recent} recent live updates`}
              />
            </AnimatedCard>
          </section>

          <AnimatedCard
            className="rounded-3xl border border-blue-500/20 bg-[linear-gradient(180deg,#1a1f2e,#0c0f1a)] p-5 shadow-[0_20px_55px_rgba(59,130,246,0.18)] transition duration-200 hover:scale-[1.01]"
            index={5}
          >
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-blue-100">
              <Brain className="h-4 w-4" />
              TwinMe Live Insight
            </div>

            <div className="text-base leading-7 text-white">{twinMeInsight}</div>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip
                label={
                  twinMeTone === "red"
                    ? "HIGH ATTENTION"
                    : twinMeTone === "orange"
                      ? "ACTIVE READ"
                      : twinMeTone === "blue"
                        ? "LOCATION AWARE"
                        : "STABLE"
                }
                tone={twinMeTone}
              />
              <StatusChip label="LIVE CREW STREAM" tone="blue" />
              {sharedLocation ? <StatusChip label="LOCATION ACTIVE" tone="blue" /> : null}
              {crewStats.flagged > 0 ? (
                <StatusChip label="ALERT PRIORITY" tone="red" />
              ) : null}
            </div>
          </AnimatedCard>

          <AnimatedCard
            className="rounded-3xl bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-4 shadow-[0_16px_45px_rgba(0,0,0,0.42)]"
            index={6}
          >
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

          <section className="grid gap-4">
            {filteredRows.map((row, index) => {
              const status = (row.status || "inactive").toLowerCase();
              const heartbeat = row.heartbeat_bpm || 70;
              const vibe = row.vibe_label || "No vibe set";
              const name = row.name || `Crew Member ${index + 1}`;
              const location = row.location_name || "Location unavailable";

              const isHeadingHome = status === "heading home";
              const isInactive = status === "inactive" || status === "";
              const isFlagged = isFlaggedRow(row);

              const cardClass = isFlagged
                ? "bg-[linear-gradient(180deg,#341416,#180b0c)] shadow-[0_18px_50px_rgba(239,68,68,0.22)]"
                : isHeadingHome
                  ? "bg-[linear-gradient(180deg,#102129,#0b1418)] shadow-[0_18px_50px_rgba(34,211,238,0.14)]"
                  : isInactive
                    ? "bg-[linear-gradient(180deg,#111113,#0c0c0f)] shadow-[0_16px_45px_rgba(0,0,0,0.42)]"
                    : "bg-[linear-gradient(180deg,#241912,#110d09)] shadow-[0_18px_50px_rgba(249,115,22,0.18)]";

              const tone: "red" | "cyan" | "neutral" | "orange" =
                isFlagged
                  ? "red"
                  : isHeadingHome
                    ? "cyan"
                    : isInactive
                      ? "neutral"
                      : "orange";

              const statusLabel = isFlagged
                ? "Alert"
                : isHeadingHome
                  ? "Heading Home"
                  : isInactive
                    ? "Inactive"
                    : "Active";

              const heartbeatWidth = Math.max(20, Math.min(100, heartbeat));
              const hasLocation = location !== "Location unavailable";
              const locationHref = hasLocation ? formatLocationLink(location) : null;

              return (
                <AnimatedCard
                  key={row.id || `${name}-${index}`}
                  className={`rounded-3xl p-5 transition duration-200 hover:scale-[1.01] ${cardClass}`}
                  index={index + 7}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xl font-semibold text-white">
                        {isFlagged ? (
                          <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
                        ) : null}
                        <span className="truncate">{name}</span>
                      </div>

                      <div className="mt-2 text-sm text-white/60">
                        {locationHref ? (
                          <a
                            href={locationHref}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-300 underline underline-offset-4"
                          >
                            View Location
                          </a>
                        ) : (
                          location
                        )}
                      </div>
                    </div>

                    <StatusChip label={statusLabel} tone={tone} />
                  </div>

                  {isFlagged ? (
                    <div className="mb-4 rounded-2xl bg-red-500/10 px-3 py-2 text-xs font-medium tracking-wide text-red-100">
                      PRIORITY ALERT — crew attention needed
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    <ProgressRow
                      label="Heartbeat"
                      right={`${heartbeat} BPM`}
                      width={heartbeatWidth}
                      barClass={
                        isFlagged
                          ? "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-300"
                          : isHeadingHome
                            ? "bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-500"
                            : isInactive
                              ? "bg-gradient-to-r from-white/30 via-white/40 to-white/50"
                              : "bg-gradient-to-r from-blue-500 via-orange-500 to-yellow-300"
                      }
                    />

                    <ProgressRow
                      label="Vibe"
                      right={vibe}
                      width={isFlagged ? 88 : isHeadingHome ? 68 : isInactive ? 30 : 80}
                      barClass={
                        isFlagged
                          ? "bg-gradient-to-r from-red-500 via-pink-500 to-orange-400"
                          : isHeadingHome
                            ? "bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500"
                            : isInactive
                              ? "bg-gradient-to-r from-white/20 via-white/30 to-white/40"
                              : "bg-gradient-to-r from-indigo-400 via-orange-400 to-yellow-300"
                      }
                    />
                  </div>

                  <div className="mt-5 flex items-center justify-between text-sm text-white/60">
                    <div className="inline-flex items-center gap-2">
                      {isHeadingHome ? (
                        <Home className="h-4 w-4" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {statusLabel}
                    </div>
                    <div>{timeAgo(row.updated_at)}</div>
                  </div>
                </AnimatedCard>
              );
            })}
          </section>

          {filteredRows.length === 0 ? (
            <AnimatedCard
              className="rounded-3xl bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-6 text-center shadow-[0_16px_45px_rgba(0,0,0,0.42)]"
              index={20}
            >
              <div className="text-white/60">No crew members matched that filter.</div>
            </AnimatedCard>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  footer,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  footer?: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm text-white/65">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-4xl font-semibold tracking-tight text-white">{value}</div>
      {footer ? <div className="mt-2 text-sm text-white/55">{footer}</div> : null}
    </div>
  );
}

function EnergyCard({ value }: { value: number }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm text-white/65">
        <Flame className="h-4 w-4" />
        Crew Energy
      </div>

      <div className="text-4xl font-semibold tracking-tight text-white">{value}/100</div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-orange-500 to-yellow-300 transition-all duration-200"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SafetyCard({ state }: { state: SafetyState }) {
  const tone: "red" | "orange" | "blue" =
    state === "alert" ? "red" : state === "active" ? "orange" : "blue";

  const label =
    state === "alert" ? "ALERT STATE" : state === "active" ? "ACTIVE STATE" : "SAFE STATE";

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm text-white/65">
        <Shield className="h-4 w-4" />
        Safety Layer
      </div>

      <div className="text-lg font-semibold text-white">
        <StatusChip label={label} tone={tone} />
      </div>

      <div className="mt-3 text-sm text-white/55">
        Based on live crew signals and flagged statuses.
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  right,
  width,
  barClass,
}: {
  label: string;
  right: string;
  width: number;
  barClass: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm text-white/60">
        <span>{label}</span>
        <span className="truncate text-right">{right}</span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-200 ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
