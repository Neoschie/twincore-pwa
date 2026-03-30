"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  Flame,
  MapPin,
  Users,
  Shield,
  Radar,
  Route,
  AlertTriangle,
  Snowflake,
  Music4,
  EyeOff,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
   TYPES
========================= */
type CrewRow = {
  id?: string;
  name?: string | null;
  status?: string | null;
  updated_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const featureCards = [
  {
    title: "Spots",
    description: "Safe places, hotspots, and live map signals",
    href: "/spots",
    tone: "ice",
  },
  {
    title: "Crew",
    description: "Live crew awareness and movement",
    href: "/crew",
    tone: "blue",
  },
  {
    title: "Party Mode",
    description: "Live status and energy tracking",
    href: "/party",
    tone: "warm",
  },
  {
    title: "TwinMe",
    description: "Real-time awareness and guidance",
    href: "/twinme",
    tone: "blue",
  },
  {
    title: "Profile",
    description: "Identity and personal setup",
    href: "/profile",
    tone: "default",
  },
] as const;

/* =========================
   HELPERS
========================= */
function getToneClass(tone: string) {
  if (tone === "blue") {
    return "border border-blue-500/20 bg-[linear-gradient(180deg,#1a1f2e,#0c0f1a)] shadow-[0_18px_45px_rgba(59,130,246,0.14)]";
  }

  if (tone === "warm") {
    return "border border-orange-500/20 bg-[linear-gradient(180deg,#22160f,#120d09)] shadow-[0_18px_45px_rgba(249,115,22,0.14)]";
  }

  if (tone === "ice") {
    return "border border-cyan-400/20 bg-[linear-gradient(180deg,#10202a,#091218)] shadow-[0_18px_45px_rgba(34,211,238,0.14)]";
  }

  return "border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] shadow-[0_16px_40px_rgba(0,0,0,0.34)]";
}

function getStatusIcon(status: string | null) {
  if (!status) {
    return <Music4 className="h-4 w-4 text-fuchsia-300" />;
  }

  const normalized = status.toLowerCase();

  if (normalized.includes("drinking") || normalized.includes("club")) {
    return <Flame className="h-4 w-4 text-orange-400" />;
  }

  if (normalized.includes("home") || normalized.includes("safe")) {
    return <Snowflake className="h-4 w-4 text-cyan-300" />;
  }

  return <Music4 className="h-4 w-4 text-fuchsia-300" />;
}

function getRadarPosition(index: number) {
  const presets = [
    { x: 50, y: 50 },
    { x: 30, y: 38 },
    { x: 70, y: 34 },
    { x: 26, y: 70 },
    { x: 76, y: 66 },
  ];

  return presets[index] || { x: 50, y: 50 };
}

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

function minutesSince(input?: string | null) {
  if (!input) return Number.POSITIVE_INFINITY;
  const then = new Date(input).getTime();
  return Math.floor((Date.now() - then) / 60000);
}

function parseStoredBoolean(raw: string | null) {
  if (!raw) return false;
  const value = raw.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

/* =========================
   MAIN
========================= */
export default function HomePage() {
  const [name, setName] = useState("Neo");
  const [status, setStatus] = useState<string | null>(null);
  const [location, setLocation] = useState(false);
  const [crewRows, setCrewRows] = useState<CrewRow[]>([]);
  const [pulse, setPulse] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);
  const [trustedOnly, setTrustedOnly] = useState(false);

  useEffect(() => {
    const n = localStorage.getItem("twincore_display_name");
    const s = localStorage.getItem("twincore_party_status");
    const l = localStorage.getItem("twincore_last_shared_location");
    const g =
      localStorage.getItem("twincore_ghost_mode") ||
      localStorage.getItem("ghost_mode");
    const t =
      localStorage.getItem("twincore_trusted_only") ||
      localStorage.getItem("trusted_crew_only");

    if (n) setName(n);
    if (s) setStatus(s);
    if (l) setLocation(true);
    setGhostMode(parseStoredBoolean(g));
    setTrustedOnly(parseStoredBoolean(t));

    async function loadCrew() {
      const { data } = await supabase
        .from("crew_status")
        .select("id,name,status,updated_at,latitude,longitude")
        .order("updated_at", { ascending: false })
        .limit(8);

      if (data) {
        setCrewRows(data as CrewRow[]);
      }
    }

    void loadCrew();

    const refreshInterval = window.setInterval(() => {
      void loadCrew();
    }, 8000);

    const pulseInterval = window.setInterval(() => {
      setPulse((prev) => !prev);
    }, 1400);

    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(pulseInterval);
    };
  }, []);

  const systemState = useMemo(() => {
    if (status === "need-help") return "alert";
    if (status === "Heading home" || status === "Safe") return "safe";
    if (status) return "active";
    return "idle";
  }, [status]);

  const crewStats = useMemo(() => {
    const connected = crewRows.length;
    const headingHome = crewRows.filter((row) =>
      (row.status || "").toLowerCase().includes("home")
    ).length;
    const alerts = crewRows.filter((row) => {
      const current = (row.status || "").toLowerCase();
      return (
        current.includes("alert") ||
        current.includes("danger") ||
        current.includes("help")
      );
    }).length;
    const recent = crewRows.filter((row) => minutesSince(row.updated_at) <= 10).length;
    const stale = crewRows.filter((row) => minutesSince(row.updated_at) > 20).length;
    const noCoords = crewRows.filter(
      (row) =>
        typeof row.latitude !== "number" || typeof row.longitude !== "number"
    ).length;

    return { connected, headingHome, alerts, recent, stale, noCoords };
  }, [crewRows]);

  const predictiveSignals = useMemo(() => {
    const signals: Array<{
      level: "red" | "orange" | "blue";
      title: string;
      body: string;
    }> = [];

    if (crewStats.alerts > 0) {
      signals.push({
        level: "red",
        title: "Elevated crew risk",
        body: "One or more crew signals look elevated. Check in now before drift becomes a problem.",
      });
    }

    if (crewStats.headingHome > 0 && systemState === "active") {
      signals.push({
        level: "orange",
        title: "Crew split starting",
        body: "Some of your crew is heading home while you’re still active. Decide early whether you’re staying or leaving.",
      });
    }

    if (location && crewStats.connected === 0 && systemState === "active") {
      signals.push({
        level: "orange",
        title: "No live crew nearby",
        body: "You’re active, but there are no connected live crew rows right now. Move with extra awareness.",
      });
    }

    if (crewStats.stale >= 2) {
      signals.push({
        level: "blue",
        title: "Crew data getting stale",
        body: "Several crew signals have not refreshed recently. Live awareness may be weaker than it looks.",
      });
    }

    if (crewStats.noCoords >= 1 && systemState !== "idle") {
      signals.push({
        level: "blue",
        title: "Location coverage incomplete",
        body: "At least one crew member is missing live coordinates. Radar visibility may be partial.",
      });
    }

    if (signals.length === 0) {
      signals.push({
        level: "blue",
        title: "System stable",
        body: "No major predictive concerns right now. Stay connected and keep your next move intentional.",
      });
    }

    return signals.slice(0, 3);
  }, [crewStats, systemState, location]);

  const ambient = useMemo(() => {
    const highest = predictiveSignals[0]?.level;

    if (highest === "red") {
      return "bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_40%)]";
    }
    if (highest === "orange") {
      return "bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_40%)]";
    }
    if (systemState === "safe") {
      return "bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.14),transparent_40%)]";
    }
    return "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_40%)]";
  }, [predictiveSignals, systemState]);

  const twinInsight = useMemo(() => {
    const highest = predictiveSignals[0];

    if (highest.level === "red") {
      return "TwinMe: something in the crew layer needs immediate attention.";
    }

    if (highest.level === "orange") {
      return "TwinMe: the next 10–20 minutes matter. Make your movement intentional.";
    }

    if (systemState === "active") {
      return "TwinMe: your night is active. Keep your exits easy and your signals current.";
    }

    if (systemState === "safe") {
      return "TwinMe: the system looks stable. This is a good moment to keep things simple.";
    }

    return "TwinMe: the system is ready. Activate Party Mode when your night begins moving.";
  }, [predictiveSignals, systemState]);

  const spotsStatusText = useMemo(() => {
    if (ghostMode && trustedOnly) {
      return "Ghost on • Trusted only";
    }
    if (ghostMode) {
      return "Ghost protected";
    }
    if (trustedOnly) {
      return "Trusted layer active";
    }
    if (crewStats.alerts > 0) {
      return "Risk-aware";
    }
    if (systemState === "active") {
      return "Live map active";
    }
    return "Ready";
  }, [ghostMode, trustedOnly, crewStats.alerts, systemState]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#0A0A0B] text-white">
      <div className={`fixed inset-0 pointer-events-none ${ambient}`} />
      <div
        className={`pointer-events-none fixed left-1/2 top-24 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full blur-3xl transition-all duration-700 ${
          predictiveSignals[0]?.level === "red"
            ? "bg-red-500/10"
            : predictiveSignals[0]?.level === "orange"
            ? "bg-orange-500/10"
            : "bg-blue-500/10"
        } ${pulse ? "scale-110 opacity-100" : "scale-100 opacity-75"}`}
      />

      <div className="relative mx-auto max-w-md px-4 py-8">
        <header className="mb-8">
          <div className="text-xs tracking-[0.3em] text-white/50">TWINCORE</div>
          <h1 className="mt-2 text-4xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-white/60">Your live social awareness system</p>
        </header>

        <section className="mb-8">
          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-6 shadow-[0_20px_55px_rgba(0,0,0,0.34)]">
            <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
              <Activity className="h-4 w-4" />
              LIVE SYSTEM
            </div>

            <h2 className="text-3xl font-semibold">{name}</h2>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                {getStatusIcon(status)}
                {status || "Not active"}
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-400" />
                {location ? "Location On" : "Location Off"}
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-white/70" />
                {crewStats.connected} Connected
              </div>

              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-white/70" />
                TwinMe Active
              </div>
            </div>

            <p className="mt-4 text-sm text-white/70">
              TwinCore is monitoring your environment in real-time.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#101216,#090A0D)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.42)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-100">
                  <Radar className="h-4 w-4" />
                  Live Core Radar
                </div>
                <p className="mt-1 text-sm text-white/55">
                  Your crew layer at a glance
                </p>
              </div>

              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                {crewStats.connected} visible
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

              {crewRows.slice(0, 5).map((row, index) => {
                const pos = getRadarPosition(index);
                const current = (row.status || "").toLowerCase();

                const dotClass = current.includes("home")
                  ? "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.8)]"
                  : current.includes("alert") ||
                    current.includes("danger") ||
                    current.includes("help")
                  ? "bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.85)]"
                  : "bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.8)]";

                return (
                  <div
                    key={row.id || `${row.name || "crew"}-${index}`}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    <span className={`absolute inset-0 rounded-full ${dotClass} opacity-50 blur-md animate-pulse`} />
                    <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 backdrop-blur">
                      <span className={`h-3.5 w-3.5 rounded-full ${dotClass}`} />
                    </span>
                  </div>
                );
              })}

              <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/75">
                HOME CORE
              </div>

              <div className="absolute bottom-4 right-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/75">
                LIVE
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="rounded-3xl border border-blue-500/20 bg-[linear-gradient(180deg,#1a1f2e,#0c0f1a)] p-5 shadow-[0_18px_45px_rgba(59,130,246,0.14)]">
            <div className="mb-3 flex items-center gap-2 text-sm text-blue-100">
              <Brain className="h-4 w-4" />
              TWINME SNAPSHOT
            </div>

            <p className="text-sm leading-6 text-white/80">{twinInsight}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                {systemState.toUpperCase()}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                {crewStats.connected} CONNECTED
              </span>
              {crewStats.headingHome > 0 ? (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                  {crewStats.headingHome} HOME
                </span>
              ) : null}
              {crewStats.alerts > 0 ? (
                <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-100">
                  {crewStats.alerts} ALERT
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.34)]">
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-white/85">
              <AlertTriangle className="h-4 w-4" />
              Predictive Alerts
            </div>

            <div className="space-y-3">
              {predictiveSignals.map((signal, index) => (
                <div
                  key={`${signal.title}-${index}`}
                  className={`rounded-2xl border p-4 ${
                    signal.level === "red"
                      ? "border-red-500/20 bg-red-500/10"
                      : signal.level === "orange"
                      ? "border-orange-500/20 bg-orange-500/10"
                      : "border-blue-500/20 bg-blue-500/10"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                    {signal.level === "red" ? (
                      <AlertTriangle className="h-4 w-4 text-red-300" />
                    ) : signal.level === "orange" ? (
                      <Route className="h-4 w-4 text-orange-300" />
                    ) : (
                      <Activity className="h-4 w-4 text-blue-300" />
                    )}
                    {signal.title}
                  </div>

                  <p className="text-sm leading-6 text-white/75">{signal.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Core</h3>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/75">
              {spotsStatusText}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {featureCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className={`rounded-3xl p-5 transition hover:scale-[1.02] active:scale-[0.98] ${getToneClass(
                  card.tone
                )} ${card.title === "Spots" ? "ring-1 ring-cyan-300/20" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-2xl font-semibold">{card.title}</div>
                  {card.title === "Spots" ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white/85">
                        <EyeOff className="h-3 w-3" />
                        {ghostMode ? "Ghost" : "Map"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white/85">
                        <Lock className="h-3 w-3" />
                        {trustedOnly ? "Trusted" : "Open"}
                      </span>
                    </div>
                  ) : null}
                </div>

                <p className="mt-2 text-sm text-white/65">{card.description}</p>

                {card.title === "Spots" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85">
                      <MapPin className="h-3.5 w-3.5" />
                      Live spots
                    </span>
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.34)]">
            <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
              <Shield className="h-4 w-4" />
              SAFETY STATE
            </div>

            <div className="text-3xl font-semibold capitalize">{systemState}</div>

            <p className="mt-3 text-sm text-white/65">
              {systemState === "alert"
                ? "Immediate attention recommended."
                : systemState === "active"
                ? "Stay aware and connected."
                : systemState === "safe"
                ? "System stable."
                : "Activate Party Mode to begin."}
            </p>

            {crewRows.length > 0 ? (
              <div className="mt-5 space-y-2">
                {crewRows.slice(0, 3).map((row, index) => (
                  <div
                    key={row.id || `${row.name || "crew-row"}-${index}`}
                    className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">
                        {row.name || `Crew ${index + 1}`}
                      </div>
                      <div className="truncate text-xs text-white/50">
                        {row.status || "active"}
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 text-xs text-white/50">
                      <Route className="h-3.5 w-3.5" />
                      {timeAgo(row.updated_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
