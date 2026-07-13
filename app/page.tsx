"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  Flame,
  MapPin,
  Users,
  Shield,
  Route,
  AlertTriangle,
  Snowflake,
  Music4,
  EyeOff,
  Lock,
} from "lucide-react";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardOrb } from "@/components/dashboard/DashboardOrb";
import { TwinPulseCard } from "@/components/dashboard/TwinPulseCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { PredictiveAlertsCard } from "@/components/dashboard/PredictiveAlertsCard";
import { ActivityCard } from "@/components/dashboard/ActivityCard";


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
  title: "Invite Crew",
  description: "Create, share and accept crew invites",
  href: "/join",
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
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;

      if (!user) return;

 const n = localStorage.getItem(`twincore_display_name_${user.id}`);
const s = localStorage.getItem(`twincore_party_status_${user.id}`);
const l = localStorage.getItem(`twincore_last_shared_location_${user.id}`);

if (n) {
  const lower = n.toLowerCase();

  const safeName =
    lower.includes("account-a") ||
    lower.includes("account-b") ||
    lower.includes("final") ||
    lower.includes("test")
      ? "Neo"
      : n;

  setName(safeName);
}
if (s) {
  if (s.toLowerCase() === "at club") {
    setStatus("At Club");
  } else {
    setStatus(s);
  }
}
if (s === "At club" || s === "at club") {
  setStatus("At Club");
} else {
  setStatus(s);
}
 if (l) setLocation(true);

});
    const g =
      localStorage.getItem("twincore_ghost_mode") ||
      localStorage.getItem("ghost_mode");
    const t =
      localStorage.getItem("twincore_trusted_only") ||
      localStorage.getItem("trusted_crew_only");

    setGhostMode(parseStoredBoolean(g));
    setTrustedOnly(parseStoredBoolean(t));

    async function loadCrew() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setCrewRows([]);
    return;
  }

  const { data } = await supabase
    .from("crew_status")
    .select("id,name,status,updated_at,latitude,longitude")
    .eq("user_id", user.id)
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

const dashboardInsight = useMemo(() => {
  const highest = predictiveSignals[0];

  if (highest?.level === "red") {
    return "One or more crew signals require attention.";
  }

  if (highest?.level === "orange") {
    return "Your environment is changing quickly.";
  }

  if (highest?.level === "blue") {
    return "Crew awareness is partially degraded.";
  }

  return "Crew synchronization appears healthy.";
}, [predictiveSignals]);

const orbState = useMemo<
  "stable" | "learning" | "elevated"
>(() => {
  if (predictiveSignals[0]?.level === "red") {
    return "elevated";
  }

  if (systemState === "active") {
    return "learning";
  }

  return "stable";
}, [predictiveSignals, systemState]);

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

 const syncScore = useMemo(() => {
  const base = 85;
  const bonus = Math.min(crewStats.connected * 3, 13);

  return base + bonus;
}, [crewStats.connected]);

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
        <div className="mb-8">
  <DashboardHero name={name} status={status} />
</div>

<DashboardOrb state={orbState} />

<TwinPulseCard
  name={name}
  status={status}
  location={location}
  connected={crewStats.connected}
  syncScore={syncScore}
  statusIcon={getStatusIcon(status)}
/>

<InsightCard
  insight={dashboardInsight}
  confidence={syncScore}
/>

<QuickActions
  features={featureCards}
  getToneClass={getToneClass}
  spotsStatusText={spotsStatusText}
  ghostMode={ghostMode}
  trustedOnly={trustedOnly}
/>

<PredictiveAlertsCard
  predictiveSignals={predictiveSignals}
/>
      </div>
    </main>
  );
}
