"use client";

import Link from "next/link";

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
  HeartPulse,
  ShieldCheck,
  Sparkles,
  HomeIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { calculateDistanceKm } from "@/lib/distance";
import StatusChip from "../_components/status-chip";
import PageHeader from "../_components/page-header";
import GlobalStatusBar from "../_components/global-status-bar";
import AnimatedCard from "../_components/animated-card";

import AuthGuard from "@/components/auth/AuthGuard";

const getProfileStorageKey = (userId: string) =>
  `twincore_profile_${userId}`;

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
  member_name?: string | null;
crew_owner?: string | null;
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

function getPrivacySettings(userId: string): PrivacySettings {
  try {
    const raw = window.localStorage.getItem(getProfileStorageKey(userId));
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
  const inviteCode = "TWIN-" + (privacy.displayName || "CREW").slice(0, 4).toUpperCase();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  async function loadCrewSignals() {
  if (!supabase) {
    setCrewRows([]);
    setCrewMessage("Crew connection unavailable");
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setCrewRows([]);
    setCrewMessage("Please sign in to see your crew.");
    return;
  }

  const [
    { data: statusData, error: statusError },
    { data: membersData, error: membersError },
  ] = await Promise.all([
    supabase
      .from("crew_status")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),

    supabase
      .from("crew_members")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false }),
  ]);

  console.log("CREW PAGE USER:", user.email);
  console.log("CREW PAGE USER ID:", user.id);
  console.log("MEMBERS ERROR:", membersError);
  console.log("STATUS ERROR:", statusError);

  const combined: CrewStatusRow[] = [];

  if (!statusError && Array.isArray(statusData) && statusData.length > 0) {
    combined.push(...(statusData as CrewStatusRow[]));
  }

  if (!membersError && Array.isArray(membersData) && membersData.length > 0) {
    const mappedMembers = (membersData as CrewMemberRow[]).map((member) => ({
      id: member.id,
      name: member.member_name || member.display_name || "Crew Member",
      status: "joined",
      heartbeat_bpm: null,
      vibe_label: "Connected",
      location_name: member.crew_name || member.crew_owner || "TwinCore Crew",
      updated_at: new Date().toISOString(),
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
setCrewMessage(
  "No crew connected yet. TwinCore works best when your trusted people are connected. Invite trusted people to stay connected, share movement, and check in together."
);
}
async function pushCrewSignal(status: string, vibe: string) {
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const payload = {
    user_id: user.id,
    name: privacy.displayName || "Neo",
    status,
    vibe_label: vibe,
    location_name: "Current Layer",
    updated_at: new Date().toISOString(),
  };

  const { data: existingRows, error: existingError } = await supabase
    .from("crew_status")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (existingError) {
    console.log("CREW EXISTING ERROR:", existingError);
    return;
  }

  if (existingRows && existingRows.length > 0) {
    const { data: updateData, error: updateError } = await supabase
      .from("crew_status")
      .update(payload)
      .eq("user_id", user.id)
      .select();

    console.log("SUPABASE UPDATE DATA:", updateData);
    console.log("SUPABASE UPDATE ERROR:", updateError);

    if (updateError) return;
  } else {
    const { data: insertData, error: insertError } = await supabase
      .from("crew_status")
      .insert(payload)
      .select();

    console.log("SUPABASE INSERT DATA:", insertData);
    console.log("SUPABASE INSERT ERROR:", insertError);

    if (insertError) return;
  }

  void loadCrewSignals();
}

useEffect(() => {
  

  async function loadUserPrivacy() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setCurrentUserId(user.id);
setPrivacy(getPrivacySettings(user.id));
  }

  loadUserPrivacy();
  void loadCrewSignals();

  const pulseInterval = window.setInterval(() => {
    setLiveTick((prev) => !prev);
  }, 1800);

  const onStorage = () => {
    if (currentUserId) {
      setPrivacy(getPrivacySettings(currentUserId));
    }
  };

  window.addEventListener("storage", onStorage);

  const channel = supabase
    .channel("crew-status-live")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "crew_status",
      },
      (payload) => {
        console.log("LIVE CREW STATUS CHANGE:", payload);
        void loadCrewSignals();
        setLiveTick((prev) => !prev);
      }
    )
    .subscribe((status) => {
      console.log("CREW LIVE CHANNEL:", status);
    });

  return () => {
    window.clearInterval(pulseInterval);
    window.removeEventListener("storage", onStorage);
    void supabase.removeChannel(channel);
  };
}, []);

  const displayRows = useMemo(
    () => crewRows.map((row) => getDisplayRow(row, privacy)),
    [crewRows, privacy]
  );

const homeCore = useMemo(() => {
 
  const selfWithCoordinates = displayRows.find(
    (row) =>
      row.id === currentUserId &&
      typeof row.latitude === "number" &&
      typeof row.longitude === "number"
  );

  const firstAvailableLocation = displayRows.find(
    (row) =>
      typeof row.latitude === "number" &&
      typeof row.longitude === "number"
  );

  const anchor =
    selfWithCoordinates || firstAvailableLocation;

  if (
    !anchor ||
    typeof anchor.latitude !== "number" ||
    typeof anchor.longitude !== "number"
  ) {
    return null;
  }

  return {
    latitude: anchor.latitude,
    longitude: anchor.longitude,
  };
}, [displayRows, currentUserId]);

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

const crewMembersWithRisk = useMemo(() => {
  return displayRows.map((row) => {
    let risk = 0;

    const status = (row.status || "").toLowerCase();

    if (
      status.includes("help") ||
      status.includes("danger") ||
      status.includes("alert")
    ) {
      risk += 75;
    }

    if (status.includes("heading home")) {
      risk += 20;
    }

    if (!row.updated_at) {
      risk += 10;
    } else {
      const minutes =
        (Date.now() -
          new Date(row.updated_at).getTime()) /
        1000 /
        60;

      if (minutes > 30) risk += 10;
      if (minutes > 60) risk += 20;
    }

    const hasCoordinates =
  typeof row.latitude === "number" &&
  typeof row.longitude === "number";

const distanceKm =
  homeCore && hasCoordinates
    ? calculateDistanceKm(
        homeCore.latitude,
        homeCore.longitude,
        row.latitude as number,
        row.longitude as number
      )
    : null;

if (distanceKm !== null && distanceKm > 5) {
  risk += 15;
}

if (distanceKm !== null && distanceKm > 15) {
  risk += 20;
}

return {
  ...row,
  risk: Math.min(100, risk),
  distanceKm,
};
  });
}, [displayRows, homeCore]);

const highestRisk = useMemo(() => {
  return Math.max(
    ...crewMembersWithRisk.map((m) => m.risk),
    0
  );
}, [crewMembersWithRisk]);

const geographicDrift = useMemo(() => {
  return crewMembersWithRisk.some(
    (member) =>
      member.distanceKm !== null &&
      member.distanceKm > 10
  );
}, [crewMembersWithRisk]);

const cohesionScore = useMemo(() => {
  if (displayRows.length === 0) {
    return 0;
  }

  const riskPenalty = highestRisk * 0.4;
  const homePenalty = crewStats.headingHome * 6;
  const alertPenalty = crewStats.flagged * 8;

  const score =
    100 -
    riskPenalty -
    homePenalty -
    alertPenalty;

  return Math.round(
    Math.max(35, Math.min(100, score))
  );
}, [
  displayRows.length,
  highestRisk,
  crewStats.headingHome,
  crewStats.flagged,
]);

const twinMeRecommendation = useMemo(() => {
  if (highestRisk >= 75) {
    return "TwinMe recommends an immediate check-in. One or more crew signals indicate elevated risk.";
  }

if (geographicDrift) {
  return "TwinMe detects increasing crew separation. Cohesion may be weakening because of geographic drift.";
}

  if (highestRisk >= 40) {
    return "TwinMe is monitoring changes in crew movement, location coverage, and signal freshness.";
  }

  if (crewStats.headingHome > 0) {
    return "TwinMe detects weakening crew proximity as part of your crew begins heading home.";
  }

  if (crewStats.total > 3) {
    return "TwinMe predicts strong social cohesion based on current crew signals.";
  }

  if (crewStats.total > 0) {
    return "TwinMe is reading early crew alignment. Connection strength is building.";
  }

  return "TwinMe is awaiting new crew signals.";
}, [
  highestRisk,
  geographicDrift,
  crewStats.headingHome,
  crewStats.total,
]);

  const filteredRows = useMemo(() => {
  if (filter === "heading-home") {
    return crewMembersWithRisk.filter(
      (row) =>
        (row.status || "").toLowerCase() ===
        "heading home"
    );
  }

  if (filter === "active") {
    return crewMembersWithRisk.filter(
      (row) =>
        (row.status || "").toLowerCase() !==
        "heading home"
    );
  }

  return crewMembersWithRisk;
}, [crewMembersWithRisk, filter]);

  const radarRows = filteredRows.slice(0, 6);

  function handleCrewAction(action: "check-in" | "heading-home" | "need-help") {
  const now = new Date().toISOString();

  setCrewRows((prev) => {
    if (prev.length === 0) {
      return [
        {
          id: "self-local",
          name: privacy.displayName || "Me",
          status:
            action === "check-in"
              ? "active"
              : action === "heading-home"
              ? "heading home"
              : "help",
          heartbeat_bpm: null,
          vibe_label:
            action === "check-in"
              ? "Checked In"
              : action === "heading-home"
              ? "Heading Home"
              : "Needs Help",
          location_name: "Current Layer",
          updated_at: now,
          latitude: null,
          longitude: null,
        },
      ];
    }

    return prev.map((row, index) =>
      index === 0
        ? {
            ...row,
            status:
              action === "check-in"
                ? "active"
                : action === "heading-home"
                ? "heading home"
                : "help",
            vibe_label:
              action === "check-in"
                ? "Checked In"
                : action === "heading-home"
                ? "Heading Home"
                : "Needs Help",
            updated_at: now,
          }
        : row
    );
  });

const message =
  action === "check-in"
    ? "Check-in sent"
    : action === "heading-home"
    ? "Heading home signal sent"
    : "Help signal activated";

const status =
  action === "check-in"
    ? "active"
    : action === "heading-home"
    ? "heading home"
    : "help";

const vibe =
  action === "check-in"
    ? "Checked In"
    : action === "heading-home"
    ? "Heading Home"
    : "Needs Help";

setCrewMessage(message);

console.log("CREW ACTION CLICKED:", action);
console.log("CREW STATUS TO PUSH:", status);
console.log("CREW VIBE TO PUSH:", vibe);

void pushCrewSignal(status, vibe);
}

  return (
     <AuthGuard>
    <main className="min-h-screen overflow-hidden bg-[#0A0A0B] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_bottom,rgba(34,197,94,0.08),transparent_34%)]" />
        <div className="absolute left-1/2 top-16 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl animate-orb-drift" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:26px_26px]" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8"> 
        <PageHeader
  title="Crew"
  subtitle="Live crew awareness"
  rightSlot={
    <div className="flex items-center gap-2">
      <Link
        href="/"
        className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
      >
        ← Dashboard
      </Link>
      <GlobalStatusBar />
    </div>
  }
/>

        <div className="space-y-4">
          <AnimatedCard className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_38%),linear-gradient(180deg,#111827,#070A12)] p-5 shadow-[0_0_70px_rgba(34,211,238,0.12)] sm:p-6">
  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.06),transparent)] opacity-40" />
            <div className="mb-4">
              <div className="relative inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold tracking-[0.22em] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
                <Radio className="h-3.5 w-3.5" />
                LIVE CREW STREAM
              </div>

<div className="relative mx-auto mt-6 mb-5 flex h-32 items-center justify-center">

{/* Left ECG */}

<svg
width="180"
height="50"
viewBox="0 0 180 50"
className="absolute left-0 hidden md:block drop-shadow-[0_0_20px_rgba(217,70,239,.9)]"
>

<path
d="M0 25
H55
L65 25
L75 8
L90 42
L105 25
H180"

stroke="#d946ef"
strokeWidth="3"
fill="none"
strokeLinecap="round"
/>

</svg>


<div
className={`
relative z-10
flex h-28 w-28
items-center
justify-center

rounded-full

border border-cyan-300/50

bg-[radial-gradient(circle,#2563eb55,#020617)]

shadow-[0_0_80px_rgba(59,130,246,.85)]

animate-[pulse_2s_ease-in-out_infinite]
`}
>


<div
className="
flex
h-20
w-20
items-center
justify-center

rounded-full

border border-fuchsia-400/40

bg-black/40
"
>

<Users className="h-9 w-9 text-cyan-300"/>

</div>


</div>



<svg
width="180"
height="50"
viewBox="0 0 180 50"
className="absolute right-0 hidden md:block drop-shadow-[0_0_20px_rgba(34,211,238,.9)]"
>

<path
d="M0 25
H75
L85 25
L95 8
L110 42
L125 25
H180"

stroke="#22d3ee"
strokeWidth="3"
fill="none"
strokeLinecap="round"
/>

</svg>

</div>

<div className="mb-5 flex flex-wrap justify-center gap-2">
  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
    <HeartPulse className="h-3.5 w-3.5" />
    Pulse Connected
  </div>

  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
    <ShieldCheck className="h-3.5 w-3.5" />
    Trusted Layer
  </div>

  <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs font-semibold text-fuchsia-100">
    <Sparkles className="h-3.5 w-3.5" />
    Crew Sync
  </div>
</div>

  <h2 className="relative mt-4 text-center text-4xl font-black tracking-tight text-white sm:text-6xl">
  {crewStats.total > 0 ? (
    <>
      Crew Looks{" "}
      <span className="bg-gradient-to-r from-fuchsia-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
        Steady
      </span>
      <div
className="
absolute

inset-0

opacity-10

animate-[pulse_18s_infinite]

bg-gradient-to-r

from-cyan-400/10

via-fuchsia-400/10

to-emerald-400/10
"
/>
    </>
  ) : (
    <>
      No Crew{" "}
      <span className="bg-gradient-to-r from-fuchsia-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
        Connected
      </span>
    </>
  )}
</h2>
<div className="relative mt-4 flex flex-wrap justify-center gap-2">
  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
    Live Presence
  </span>

  <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs font-bold text-fuchsia-100">
    TwinMe Enhanced
  </span>

  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
    Privacy Layer Active
  </span>
  <div className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse"/>
</div>

<p className="relative mx-auto mt-4 max-w-xl text-center text-sm leading-6 text-white/70">

  {crewStats.total > 0
    ? `${crewMessage}. Trusted-only visibility is ${
        privacy.trustedOnly ? "active" : "off"
      } on this device.`
    : "TwinCore works best when trusted people are connected. Invite people you care about to share movement, check-ins, Party Mode, Spots and TwinMe insights together."}

</p>
</div>

<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
  <StatPill
    icon={Radio}
    value={radarRows.length}
    label="Pulse"
  />

  <StatPill
    icon={Users}
    value={crewStats.total}
    label="Connected"
  />

  <StatPill
    icon={Route}
    value={crewStats.headingHome}
    label="Home"
  />

  <StatPill
    icon={Siren}
    value={crewStats.flagged}
    label="Alerts"
  />
</div>

<div className="mt-4 flex justify-center">
  <Link
    href="/crew/invite"
    className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 active:scale-[0.98]"
  >
    + Invite Crew
  </Link>
</div>           
          </AnimatedCard>

          <AnimatedCard className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#101216,#090A0D)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.42)]">
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

              <div className="flex items-center gap-2">
  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
    {radarRows.length} visible
  </span>

  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]">
    Intelligence Lv. {Math.min(10, Math.max(1, crewStats.total + 1))}
  </span>
</div>
            </div>

  <div className="relative h-[300px] overflow-hidden rounded-[1.6rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),rgba(2,6,23,0.92)_45%,rgba(0,0,0,0.98)_100%)] shadow-[0_0_55px_rgba(34,211,238,0.12)] sm:h-[320px]">
 {/* Ambient Radar Particles */}
{Array.from({ length: 30 }).map((_, i) => (
  <span
    key={`particle-${i}`}
    className="pointer-events-none absolute h-1 w-1 rounded-full bg-cyan-200/20 animate-[particleDrift_18s_ease-in-out_infinite]"
    style={{
      left: `${(i * 37) % 100}%`,
      top: `${(i * 53) % 100}%`,
      animationDelay: `${i * 0.35}s`,
      opacity: 0.04 + (i % 5) * 0.02,
    }}
  />
))}
  <div className="absolute inset-x-0 bottom-[-55%] mx-auto h-[520px] w-[520px] rounded-full border border-cyan-300/20" />
  <div className="absolute inset-x-0 bottom-[-43%] mx-auto h-[430px] w-[430px] rounded-full border border-cyan-300/15" />
  <div className="absolute inset-x-0 bottom-[-31%] mx-auto h-[340px] w-[340px] rounded-full border border-cyan-300/10" />
  <div className="absolute inset-x-0 bottom-[-19%] mx-auto h-[250px] w-[250px] rounded-full border border-cyan-300/10" />

  <div className="absolute bottom-0 left-1/2 h-full w-px -translate-x-1/2 bg-cyan-300/25" />

  <div className="absolute bottom-0 left-1/2 h-[330px] w-[260px] origin-bottom animate-[radarSweep_12s_linear_infinite] bg-cyan-400/10 [clip-path:polygon(50%_100%,0_0,100%_0)]" />
  <div className="absolute bottom-0 left-1/2 h-[330px] w-[260px] origin-bottom animate-[radarSweep_12s_linear_infinite] border-t border-cyan-300/40 [clip-path:polygon(50%_100%,0_0,100%_0)]" />
<div className="
absolute
bottom-0
left-1/2

h-[340px]
w-[280px]

origin-bottom

animate-[radarSweep_18s_linear_infinite]

opacity-20

blur-xl

bg-cyan-400/20

[clip-path:polygon(50%_100%,0_0,100%_0)]
"/>
  {/* Jarvis Crew Core Orb */}
<div className="absolute bottom-5 left-1/2 z-30 flex h-24
w-24 -translate-x-1/2 items-center justify-center rounded-full border border-cyan-300/60 bg-white/[0.04] backdrop-blur-xl shadow-[0_0_60px_rgba(34,211,238,0.85)] animate-[coreBreath_4s_ease-in-out_infinite]">
  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-300/30 via-fuchsia-400/20 to-emerald-300/20 blur-md" />

  <div className="absolute h-32 w-32 rounded-full border border-cyan-300/10 animate-[spin_18s_linear_infinite]" />
  <div className="absolute h-20 w-20 rounded-full border border-fuchsia-300/20 animate-[spin_12s_linear_infinite]" />

  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-black/50 shadow-inner">
    <Users className="h-8 w-8 text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
  </div>

  <span className="absolute left-3 top-4 h-1 w-1 rounded-full bg-cyan-200/70" />
  <span className="absolute right-4 top-7 h-1 w-1 rounded-full bg-fuchsia-200/70" />
  <span className="absolute bottom-5 left-5 h-1 w-1 rounded-full bg-emerald-200/70" />
</div>

{radarRows.length === 0 ? (
  <div className="absolute left-1/2 top-1/2 z-20 w-[82%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-cyan-300/20 bg-black/40 p-5 text-center backdrop-blur-xl shadow-[0_0_45px_rgba(34,211,238,0.12)]">
    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
      <Users className="h-7 w-7 text-cyan-200" />
    </div>

    <h3 className="text-lg font-black text-white">
      Your Crew Layer Is Waiting
    </h3>

    <p className="mt-2 text-sm leading-6 text-white/65">
      Invite trusted people to activate live movement, check-ins, Party Mode, Spots, and TwinMe crew intelligence.
    </p>

    <Link
      href="/join"
      className="mt-4 inline-flex rounded-2xl bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-emerald-400 px-5 py-3 text-sm font-black text-black shadow-[0_0_30px_rgba(34,211,238,0.35)] transition hover:scale-[1.03] active:scale-[0.98]"
    >
      + Activate Crew
    </Link>
  </div>
) : null}

  {radarRows.map((row, index) => {
    const tone = getRowTone(row);
    const positions = [
  { left: "50%", bottom: "60%", labelX: "0px", labelY: "-76px" },
  { left: "68%", bottom: "47%", labelX: "34px", labelY: "-58px" },
  { left: "35%", bottom: "47%", labelX: "-34px", labelY: "-58px" },
  { left: "44%", bottom: "25%", labelX: "0px", labelY: "-50px" },
  { left: "25%", bottom: "20%", labelX: "0px", labelY: "-50px" },
  { left: "75%", bottom: "22%", labelX: "0px", labelY: "-50px" }
];

    const pos = positions[index] || positions[0];

    const statusLabel =
      tone === "red"
        ? "In Distress"
        : tone === "cyan"
        ? "Heading Home"
        : tone === "orange"
        ? "Away / Idle"
        : "Active";

    const color =
      tone === "red"
        ? "text-red-300 bg-red-500/20 border-red-400/40 shadow-[0_0_30px_rgba(248,113,113,0.55)]"
        : tone === "cyan"
        ? "text-cyan-200 bg-cyan-400/15 border-cyan-300/40 shadow-[0_0_25px_rgba(34,211,238,0.45)]"
        : tone === "orange"
        ? "text-orange-200 bg-orange-400/15 border-orange-300/40 shadow-[0_0_25px_rgba(251,146,60,0.45)]"
        : "text-fuchsia-100 bg-fuchsia-400/15 border-fuchsia-300/40 shadow-[0_0_25px_rgba(217,70,239,0.45)]";

    return (
      <div
        key={row.id || `${row.name || "crew"}-${index}`}
        className="absolute z-20 -translate-x-1/2"
        style={{ left: pos.left, bottom: pos.bottom }}
      >

<div className="relative">

<div
className="
absolute

h-16
w-16

rounded-full

animate-ping

border

border-cyan-300/40
"
/>
  
  <div
    className={`flex h-11 w-11 items-center justify-center rounded-full border bg-black/60 ${
      tone === "red"
        ? "border-red-400/50 shadow-[0_0_30px_rgba(248,113,113,0.75)]"
        : tone === "cyan"
        ? "border-cyan-300/50 shadow-[0_0_30px_rgba(34,211,238,0.65)]"
        : tone === "orange"
        ? "border-orange-300/50 shadow-[0_0_25px_rgba(251,146,60,0.55)]"
        : "border-fuchsia-300/50 shadow-[0_0_25px_rgba(217,70,239,0.6)]"
    }`}
  >
    {tone === "red" ? (
  <div className="relative flex h-9 w-9 items-center justify-center">
    <span className="absolute inset-[-8px] rounded-full border border-red-400/50 animate-ping" />
    <span className="absolute inset-0 rounded-full bg-red-500/40 animate-[pulse_1s_ease-in-out_infinite]" />
    <span className="absolute inset-[-14px] rounded-full bg-red-500/10 blur-md animate-[pulse_1s_ease-in-out_infinite]" />
    <AlertTriangle className="relative z-10 h-5 w-5 text-red-200 drop-shadow-[0_0_12px_rgba(248,113,113,0.95)]" />
  </div>
    ) : tone === "cyan" ? (
      <HomeIcon className="h-5 w-5 text-cyan-200" />
    ) : tone === "orange" ? (
      <Radio className="h-5 w-5 text-orange-200" />
    ) : (
      <Users className="h-5 w-5 text-fuchsia-100" />
    )}
  </div>

  <div
  className={`absolute left-1/2 top-1/2 z-30 max-w-[82px] rounded-xl border bg-black/70 px-2 py-[3px] text-center text-[9px] font-bold leading-tight backdrop-blur animate-[pulse_4s_ease-in-out_infinite] ${

     tone === "red"
      ? "border-red-400/35 text-red-200"
      : tone === "cyan"
      ? "border-cyan-300/35 text-cyan-100"
      : tone === "orange"
      ? "border-orange-300/35 text-orange-100"
      : "border-fuchsia-300/35 text-fuchsia-100"
  }`}
  style={{
    transform: `translate(calc(-50% + ${pos.labelX || "0px"}), calc(-50% + ${pos.labelY || "-52px"}))`,
  }}
>

    <div className="truncate">{row.name || `Crew ${index + 1}`}</div>
    <div className="mt-0.5 text-[9px] font-semibold opacity-75">
      {statusLabel}
    </div>
  </div>
</div>
      </div>
    );
  })}

  <div className="absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm font-bold text-white/80">
    N
  </div>

  <div className="absolute right-4 top-4 hidden rounded-2xl border border-white/10 bg-black/35 p-4 text-xs text-white/70 backdrop-blur md:block">
    <div className="mb-3 font-bold uppercase tracking-[0.2em] text-white/80">
      Status Legend
    </div>

    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-400" />
        Active
      </div>

      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
        Heading Home
      </div>

      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
        Away / Idle
      </div>

      <div className="flex items-center gap-2 text-red-300">
        <AlertTriangle className="h-4 w-4" />
        In Distress
      </div>
    </div>
  </div>
</div>

  <div className="mt-4 flex gap-2">
    <button
      type="button"
      onClick={() => handleCrewAction("heading-home")}
      className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-3 text-xs font-black text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.10)] transition hover:scale-[1.02] active:scale-[0.98]"
    >
      Heading Home
    </button>

    <button
      type="button"
      onClick={() => handleCrewAction("need-help")}
      className="rounded-2xl border border-red-400/25 bg-red-500/10 px-3 py-3 text-xs font-black text-red-200 shadow-[0_0_28px_rgba(248,113,113,0.18)] transition hover:scale-[1.02] active:scale-[0.98] animate-[pulse_3s_ease-in-out_infinite]"
    >
      Need Help
    </button>
  </div>

<div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70 md:hidden">
  <div className="flex items-center gap-2">
    <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-400" />
    Active
  </div>

  <div className="flex items-center gap-2">
    <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
    Heading Home
  </div>

  <div className="flex items-center gap-2">
    <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
    Away / Idle
  </div>

  <div className="flex items-center gap-2 text-red-300">
    <AlertTriangle className="h-4 w-4" />
    In Distress
  </div>
</div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
            {radarRows.map((row, index) => {
                const tone = getRadarPointClass(row);
                const trusted = canSeeFull(filteredRows[index] || row, privacy);

                return (
                  <div
                    key={row.id || `legend-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 sm:py-3"
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

          <div className="flex flex-wrap items-center gap-2">

              {(["all", "active", "heading-home"] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilter(mode)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold backdrop-blur-xl transition duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                    filter === mode
                      ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]"
: "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08]"
                  }`}
                >
                  {mode === "all" ? "All" : mode === "active" ? "Active" : "Heading Home"}
                </button>
              ))}
            </div>
            <AnimatedCard className="rounded-3xl border border-cyan-300/20 bg-[linear-gradient(180deg,#0f172a,#080b12)] p-5 shadow-[0_0_45px_rgba(34,211,238,0.12)]">
  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="max-w-md">
      <div className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
        <Brain className="h-4 w-4" />
        TwinMe Crew Cohesion
      </div>

      <p className="mt-1 text-sm text-white/55">
        Adaptive read on crew energy, drift, and attention signals
      </p>

      <p className="mt-3 text-sm leading-6 text-white/70">
        {twinMeRecommendation}
      </p>
    </div>

    <div className="relative mx-auto flex h-28 w-28 items-center justify-center sm:mx-0 sm:h-32 sm:w-32">
      <div className="absolute inset-0 rounded-full bg-cyan-400/10 blur-3xl animate-pulse" />

      <div className="absolute inset-2 rounded-full border border-cyan-300/20 animate-[spin_30s_linear_infinite]" />

      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-fuchsia-400/10 via-cyan-300/20 to-emerald-300/10 blur-md" />

      <div className="relative flex h-20 w-20 flex-col items-center justify-center rounded-full border border-cyan-300/20 bg-black/70 backdrop-blur-xl">
        <div className="text-2xl font-black text-white">{cohesionScore}%</div>
        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">
          Cohesion
        </div>
      </div>
    </div>
  </div>

  <div className="h-3 overflow-hidden rounded-full bg-white/10">
    <div
      className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-emerald-300 transition-all duration-1000 ease-out"
      style={{ width: `${cohesionScore}%` }}
    />
  </div>

  <div className="mt-4 grid grid-cols-1 gap-3 text-center text-xs sm:grid-cols-3">
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-white/45">Energy</div>
      <div className="mt-1 font-bold text-cyan-100">
        {crewStats.total > 0 ? "Connected" : "Dormant"}
      </div>
    </div>

    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-white/45">Drift Risk</div>
      <div className="mt-1 font-bold text-emerald-100">
     {highestRisk >= 75
  ? "High"
  : highestRisk >= 40
  ? "Medium"
  : "Low"}
     </div>
    </div>

    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-white/45">Signals</div>
      <div className="mt-1 font-bold text-fuchsia-100">
        {crewStats.flagged}
      </div>
    </div>
  </div>
</AnimatedCard>
                  
          <div className="space-y-4">
{filteredRows.map((row, i) => {
const isSelf = row.id === currentUserId;

const name = isSelf
? "Neo"
: row.name || `Crew ${i+1}`;

const memberId = row.id || `${name}-${i}`;
const isExpanded = expandedMemberId === memberId;

const status = row.status || "active";
const location = row.location_name || "Unknown";
const tone = getRowTone(row);
const trusted = canSeeFull(row, privacy);

              return (
                <AnimatedCard
                  key={memberId}
                  className={`rounded-3xl border p-5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-cyan-400/30 active:scale-[0.98] shadow-[0_0_40px_rgba(34,211,238,.08)] ${
  tone === "red"
    ? "border-red-400/30 bg-red-950/20"
    : tone === "cyan"
    ? "border-cyan-300/25 bg-cyan-950/15"
    : tone === "orange"
    ? "border-orange-300/25 bg-orange-950/15"
    : "border-white/10 bg-white/[0.03]"
}`}
                >

<div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {tone === "red" ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
        ) : null}

        {!trusted && privacy.trustedOnly ? (
          <Ghost className="h-4 w-4 shrink-0 text-white/60" />
        ) : null}

        <span className="truncate text-base font-semibold text-white">
          {name}
        </span>

        {isSelf ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
            You
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/55">
        <span>{row.vibe_label || status}</span>
        <span className="text-white/25">•</span>
        <span>{timeAgo(row.updated_at)}</span>
      </div>
    </div>

    <div className="flex shrink-0 flex-col items-end gap-2">
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

      <span
        className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
          row.risk >= 75
            ? "border-red-400/30 bg-red-500/10 text-red-200"
            : row.risk >= 40
            ? "border-orange-300/30 bg-orange-400/10 text-orange-100"
            : "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
        }`}
      >
        Risk {row.risk}%
      </span>
    </div>
  </div>

  <button
    type="button"
    onClick={() =>
      setExpandedMemberId(isExpanded ? null : memberId)
    }
    className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-xs font-semibold text-white/70 transition hover:bg-white/[0.07]"
    aria-expanded={isExpanded}
  >
    <span>{isExpanded ? "Hide details" : "View details"}</span>

    <span
      className={`transition-transform duration-200 ${
        isExpanded ? "rotate-180" : ""
      }`}
    >
      ▾
    </span>
  </button>

  {isExpanded ? (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/65">
        <MapPin className="h-4 w-4 shrink-0 text-cyan-300" />
        <span className="truncate">{location}</span>
      </div>

<div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
    Distance From Crew Core
  </div>

  <div className="mt-1 text-sm font-semibold text-white/80">
    {row.distanceKm !== null
      ? row.distanceKm < 0.1
        ? "At crew core"
        : `${row.distanceKm.toFixed(1)} km away`
      : "Location unavailable"}
  </div>
</div>

      <div className="grid grid-cols-2 gap-3">
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

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/50">
        Last updated {timeAgo(row.updated_at)}
      </div>
    </div>
  ) : null}
</AnimatedCard>
              );
            })}
        </div>
        </div>
        </div>
    </main>
     </AuthGuard>
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
    <div className="flex min-h-[92px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center sm:min-h-[105px] sm:p-4">
      <div className="mb-2 flex items-center justify-center">
        <Icon className="h-4 w-4 text-white/70" />
      </div>

      <div className="text-xl font-semibold text-white sm:text-2xl">
        {value}
      </div>

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

      <div className="truncate text-sm font-medium text-white/85">
        {value}
      </div>
    </div>
  );
}
