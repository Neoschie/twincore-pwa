"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/* -------------------------
   TYPES
--------------------------*/

type Message = {
  id: number;
  role: "user" | "twin";
  text: string;
};

type PartyLive = {
  active: boolean;
  status: string;
  mood: string;
  heartbeatBpm: number;
  ghostMode: boolean;
  trustedOnly: boolean;
  timestamp?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type CrewCollapseInsight = {
  level: "stable" | "thinning" | "collapsing";
  summary: string;
  activeNow: number;
};

type CrewStatus = {
  id?: string;
  name: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  heartbeatBpm?: number | null;
  heartbeat_bpm?: number | null;
};

type PositionPoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
};

type SpotsSnapshot = {
  visibleCount?: number;
  nearbyCount?: number;
  hotspotCount?: number;
  riskCount?: number;
  safeCount?: number;
  trustedVisibleCount?: number;
  selectedTone?: "lit" | "safe" | "risk" | "chill" | null;
  selectedName?: string | null;
  radarEnergy?: "risk" | "lit" | "safe" | "calm" | null;
  selectedDistanceKm?: number | null;
  selectedTrusted?: boolean;
  selectedBlurred?: boolean;
  updatedAt?: string;
  timestamp?: string;
};

type AwarenessLevel = "low" | "guarded" | "elevated" | "critical";
type DesyncLevel = "synced" | "watch" | "drifting" | "separated";
type DriftLevel = "stable" | "rising" | "elevated" | "prolonged";
type TrajectoryDirection = "stable" | "rising" | "accelerating" | "dropping";
type TrajectoryRiskWindow = "none" | "approaching" | "imminent";

type BaselineSnapshot = {
  avgBpm: number;
  samples: number;
};

type LearningProfile = {
  observations: number;
  avgActiveBpm: number;
  avgPeakBpm: number;
  avgActiveMinutes: number;
  typicalEscalationMinute: number | null;
  prolongedMoments: number;
  noSupportMoments: number;
  updatedAt?: string;
};

type LearnMeInsight = {
  summary: string;
  label: string;
};

type MicroGuidance = {
  title: string;
  actions: string[];
  tone: "steady" | "supportive" | "protective";
};

type TrajectoryInsight = {
  direction: TrajectoryDirection;
  riskWindow: TrajectoryRiskWindow;
  summary: string;
};

type PredictiveSignal = {
  level: "blue" | "orange" | "red";
  title: string;
  body: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: null | (() => void);
  onend: null | (() => void);
  onerror: null | ((event: { error?: string }) => void);
  onresult: null | ((event: SpeechRecognitionEventLike) => void);
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal?: boolean;
      0: {
        transcript: string;
      };
    };
  };
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

/* -------------------------
   STORAGE KEYS
--------------------------*/

const TWINCORE_BASELINE_KEY = "twincore_internal_baseline";
const TWINCORE_LEARNING_KEY = "twincore_learning_profile";
const TWINCORE_MESSAGES_KEY = "twincore_twinme_messages";
const TWINCORE_POSITION_HISTORY_KEY = "twincore_position_history";
const TWINCORE_PROFILE_KEY = "twincore_profile";

const STARTER_PROMPTS = [
  "What should I do tonight?",
  "Help me think this through",
  "Give me a state check",
  "Am I getting off track?",
];

const DEFAULT_CREW_COLLAPSE: CrewCollapseInsight = {
  level: "stable",
  summary: "No crew-collapse signal yet.",
  activeNow: 0,
};

/* -------------------------
   STORAGE HELPERS
--------------------------*/

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

/* -------------------------
   DATA LOADERS
--------------------------*/

async function getRealCrewContext(displayName: string): Promise<CrewStatus[]> {
  if (!displayName || !supabase) return [];

  try {
    const joinedRaw = localStorage.getItem("twincore_joined_crew");
    const joined = joinedRaw ? JSON.parse(joinedRaw) : {};
    const owner = joined.crewOwner || displayName;

    const { data: members, error: memberError } = await supabase
      .from("crew_members")
      .select("crew_owner, member_name")
      .eq("crew_owner", owner);

    if (memberError) return [];

    const names = new Set<string>();
    names.add(owner);

    (members || []).forEach((m: { member_name?: string | null }) => {
      if (m.member_name) names.add(m.member_name);
    });

    const list = Array.from(names);

    const { data: statuses, error: statusError } = await supabase
      .from("crew_status")
      .select("*")
      .in("name", list);

    if (statusError) return [];

    return (statuses || []) as CrewStatus[];
  } catch {
    return [];
  }
}

function getLiveContext(): PartyLive | null {
  return readJson<PartyLive | null>("twincore_party_live", null);
}

async function getCrewContext(displayName: string): Promise<CrewStatus[]> {
  return await getRealCrewContext(displayName);
}

function getSpotsContext(): SpotsSnapshot | null {
  return readJson<SpotsSnapshot | null>("twincore_spots_snapshot", null);
}

function getPositionHistory(): PositionPoint[] {
  return readJson<PositionPoint[]>(TWINCORE_POSITION_HISTORY_KEY, []);
}

function updatePositionHistory(live: PartyLive | null) {
  if (
    !live?.active ||
    typeof live.latitude !== "number" ||
    typeof live.longitude !== "number"
  ) {
    return;
  }

  const existing = getPositionHistory();
  const next: PositionPoint[] = [
    ...existing.slice(-11),
    {
      latitude: live.latitude,
      longitude: live.longitude,
      timestamp: new Date().toISOString(),
    },
  ];

  writeJson(TWINCORE_POSITION_HISTORY_KEY, next);
}

function getDisplayName() {
  const profile = readJson<{ displayName?: string } | null>(
    TWINCORE_PROFILE_KEY,
    null
  );
  return profile?.displayName?.trim() || "Neo";
}

/* -------------------------
   BASELINE / INTERNAL DRIFT
--------------------------*/

function getBaselineSnapshot(): BaselineSnapshot | null {
  return readJson<BaselineSnapshot | null>(TWINCORE_BASELINE_KEY, null);
}

function updateBaselineSnapshot(currentBpm: number) {
  if (!Number.isFinite(currentBpm) || currentBpm <= 0) return;

  const existing = getBaselineSnapshot();

  if (!existing) {
    writeJson(TWINCORE_BASELINE_KEY, {
      avgBpm: Math.round(currentBpm),
      samples: 1,
    });
    return;
  }

  const nextSamples = existing.samples + 1;
  const nextAvg =
    (existing.avgBpm * existing.samples + currentBpm) / nextSamples;

  writeJson(TWINCORE_BASELINE_KEY, {
    avgBpm: Math.round(nextAvg),
    samples: nextSamples,
  });
}

function getInternalDriftInsight(
  live: PartyLive | null,
  minutes: number
): {
  level: DriftLevel;
  delta: number;
  baselineBpm: number | null;
  summary: string;
} {
  const baseline = getBaselineSnapshot();

  if (!live?.active || typeof live.heartbeatBpm !== "number") {
    return {
      level: "stable",
      delta: 0,
      baselineBpm: baseline?.avgBpm ?? null,
      summary:
        "TwinMe is on standby. Internal drift is only tracked while your live state is active.",
    };
  }

  if (!baseline || baseline.samples < 3) {
    return {
      level: "stable",
      delta: 0,
      baselineBpm: baseline?.avgBpm ?? null,
      summary: "TwinMe is still learning your normal pace.",
    };
  }

  const delta = live.heartbeatBpm - baseline.avgBpm;

  let level: DriftLevel = "stable";

  if (delta >= 24 || minutes >= 45) {
    level = "prolonged";
  } else if (delta >= 16) {
    level = "elevated";
  } else if (delta >= 8) {
    level = "rising";
  }

  let summary = "You look close to your normal pace right now.";

  if (level === "rising") {
    summary =
      "Your pace is rising faster than your usual baseline. Stay intentional before it builds.";
  } else if (level === "elevated") {
    summary =
      "You are more activated than your normal pattern right now. Keep your next moves simple.";
  } else if (level === "prolonged") {
    summary =
      "You have been elevated longer than usual. This may be a good time to slow things down.";
  }

  return {
    level,
    delta,
    baselineBpm: baseline?.avgBpm ?? null,
    summary,
  };
}

/* -------------------------
   LEARNING PROFILE
--------------------------*/

function getLearningProfile(): LearningProfile | null {
  return readJson<LearningProfile | null>(TWINCORE_LEARNING_KEY, null);
}

function updateLearningProfile(
  live: PartyLive | null,
  minutes: number,
  driftLevel: DriftLevel,
  noSupportActive: boolean
) {
  if (!live?.active || typeof live.heartbeatBpm !== "number") return;

  const existing: LearningProfile =
    getLearningProfile() ?? {
      observations: 0,
      avgActiveBpm: 0,
      avgPeakBpm: 0,
      avgActiveMinutes: 0,
      typicalEscalationMinute: null,
      prolongedMoments: 0,
      noSupportMoments: 0,
    };

  const nextObservations = existing.observations + 1;

  const nextAvgActiveBpm = Math.round(
    (existing.avgActiveBpm * existing.observations + live.heartbeatBpm) /
      nextObservations
  );

  const nextPeak = Math.max(existing.avgPeakBpm, live.heartbeatBpm);

  const nextAvgActiveMinutes = Math.round(
    (existing.avgActiveMinutes * existing.observations + minutes) /
      nextObservations
  );

  let nextTypicalEscalationMinute = existing.typicalEscalationMinute;

  if (
    (driftLevel === "rising" ||
      driftLevel === "elevated" ||
      driftLevel === "prolonged" ||
      live.heartbeatBpm >= 100) &&
    minutes > 0
  ) {
    if (typeof existing.typicalEscalationMinute === "number") {
      nextTypicalEscalationMinute = Math.round(
        (existing.typicalEscalationMinute * existing.observations + minutes) /
          nextObservations
      );
    } else {
      nextTypicalEscalationMinute = minutes;
    }
  }

  const nextProfile: LearningProfile = {
    observations: nextObservations,
    avgActiveBpm: nextAvgActiveBpm,
    avgPeakBpm: nextPeak,
    avgActiveMinutes: nextAvgActiveMinutes,
    typicalEscalationMinute: nextTypicalEscalationMinute,
    prolongedMoments:
      existing.prolongedMoments + (driftLevel === "prolonged" ? 1 : 0),
    noSupportMoments:
      existing.noSupportMoments + (noSupportActive ? 1 : 0),
    updatedAt: new Date().toISOString(),
  };

  writeJson(TWINCORE_LEARNING_KEY, nextProfile);
}

function getLearnMeInsight(
  profile: LearningProfile | null,
  live: PartyLive | null,
  minutes: number,
  trajectory: TrajectoryInsight,
  driftLevel: DriftLevel
): LearnMeInsight {
  if (!profile || profile.observations < 5) {
    return {
      label: "learning",
      summary:
        "TwinMe is still learning your personal rhythm. The more you use it, the more specific it gets.",
    };
  }

  if (
    typeof profile.typicalEscalationMinute === "number" &&
    minutes >= profile.typicalEscalationMinute &&
    trajectory.riskWindow !== "none"
  ) {
    return {
      label: "pattern seen",
      summary: `You often start escalating around ${profile.typicalEscalationMinute} minutes in. TwinMe is noticing that this follows your usual pattern.`,
    };
  }

  if (
    live?.active &&
    typeof live.heartbeatBpm === "number" &&
    live.heartbeatBpm >= profile.avgActiveBpm + 10
  ) {
    return {
      label: "above normal",
      summary: `Your current pace is running above your usual active pattern of about ${profile.avgActiveBpm} bpm.`,
    };
  }

  if (driftLevel === "prolonged" && profile.prolongedMoments >= 3) {
    return {
      label: "recurring pattern",
      summary:
        "TwinMe has seen this prolonged elevation pattern before. Catching it earlier may help you stay steadier.",
    };
  }

  return {
    label: "known rhythm",
    summary: `TwinMe is learning your rhythm. Your typical active pace is around ${profile.avgActiveBpm} bpm and your active pattern usually settles around ${profile.avgActiveMinutes} minutes.`,
  };
}

/* -------------------------
   TIME ENGINE
--------------------------*/

function getMinutesActive(live: PartyLive | null) {
  if (!live?.timestamp) return 0;
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(live.timestamp).getTime()) / 60000)
  );
}

/* -------------------------
   CREW AWARENESS
--------------------------*/

function getCrewInsight(crew: CrewStatus[]) {
  if (!crew.length) return "no_crew";

  const activeCrew = crew.filter((c) => c.status !== "Safe");

  if (activeCrew.length === 0) return "alone";
  if (activeCrew.length === 1) return "low";
  return "group";
}

function getCrewCollapseInsight(
  live: PartyLive | null,
  crew: CrewStatus[],
  minutes: number
): CrewCollapseInsight {
  if (!live?.active || !crew.length) {
    return DEFAULT_CREW_COLLAPSE;
  }

  const activeNow = crew.filter(
    (member) =>
      member.status &&
      member.status !== "Safe" &&
      member.status !== "Heading home"
  ).length;

  if (activeNow === 0) {
    return {
      level: "collapsing",
      summary:
        "Your crew support layer has effectively dropped away. Do not treat this moment like you still have the same group coverage.",
      activeNow,
    };
  }

  if (activeNow === 1 && minutes > 20) {
    return {
      level: "thinning",
      summary:
        "Your crew support is thinning. The room may still feel active, but your actual support layer is getting smaller.",
      activeNow,
    };
  }

  return {
    level: "stable",
    summary: "Crew support still looks present.",
    activeNow,
  };
}

/* -------------------------
   MOVEMENT AWARENESS
--------------------------*/

function getDistanceBetweenPoints(a: PositionPoint, b: PositionPoint) {
  const dx = a.latitude - b.latitude;
  const dy = a.longitude - b.longitude;
  return Math.sqrt(dx * dx + dy * dy);
}

function getMovementInsight(history: PositionPoint[]) {
  if (history.length < 2) return "stable";

  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const first = history[0];

  const recentMove = getDistanceBetweenPoints(last, prev);
  const totalMove = getDistanceBetweenPoints(last, first);

  if (recentMove > 0.0007) return "moving";
  if (totalMove > 0.0025) return "drifting";
  return "stable";
}

/* -------------------------
   ENVIRONMENT AWARENESS
--------------------------*/

function getEnvironmentInsight(spots: SpotsSnapshot | null) {
  if (!spots) return "unknown";

  if ((spots.riskCount || 0) > 0 && (spots.safeCount || 0) === 0) {
    return "unsafe";
  }

  if ((spots.safeCount || 0) > 0 && (spots.nearbyCount || 0) > 0) {
    return "supported";
  }

  if ((spots.hotspotCount || 0) > 0 && (spots.riskCount || 0) > 0) {
    return "volatile";
  }

  if ((spots.nearbyCount || 0) === 0) {
    return "thin";
  }

  return "balanced";
}

/* -------------------------
   NO SUPPORT MODE
--------------------------*/

function getNoSupportMode(
  live: PartyLive | null,
  crew: CrewStatus[],
  spots: SpotsSnapshot | null
) {
  const noCrew = crew.length === 0;
  const trustedVisible = spots?.trustedVisibleCount ?? 0;
  const safeCount = spots?.safeCount ?? 0;
  const supportedByMap = trustedVisible > 0 || safeCount > 0;

  const active = !!live?.active && noCrew && !supportedByMap;

  let summary =
    "Support signals are available, so TwinMe can stay in guidance mode.";

  if (active) {
    summary =
      "You do not have active crew or visible support around you right now. TwinMe is staying closer and simplifying guidance.";
  } else if (noCrew) {
    summary =
      "Crew is not connected right now, so TwinMe is leaning more on environmental awareness.";
  }

  return {
    active,
    noCrew,
    trustedVisible,
    safeCount,
    summary,
  };
}

/* -------------------------
   DESYNC ENGINE
--------------------------*/

function averageCrewHeartbeat(crew: CrewStatus[]) {
  const values = crew
    .map((member) => {
      const value = member.heartbeatBpm ?? member.heartbeat_bpm ?? null;
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    })
    .filter((value): value is number => value !== null);

  if (!values.length) return null;

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

function getCrewCenter(crew: CrewStatus[]) {
  const valid = crew.filter(
    (member) =>
      typeof member.latitude === "number" &&
      Number.isFinite(member.latitude) &&
      typeof member.longitude === "number" &&
      Number.isFinite(member.longitude)
  );

  if (!valid.length) return null;

  const totals = valid.reduce(
    (acc, member) => {
      acc.lat += member.latitude as number;
      acc.lng += member.longitude as number;
      return acc;
    },
    { lat: 0, lng: 0 }
  );

  return {
    latitude: totals.lat / valid.length,
    longitude: totals.lng / valid.length,
  };
}

function getDesyncInsight(
  live: PartyLive | null,
  crew: CrewStatus[],
  movementLevel: string
) {
  if (!live?.active) {
    return {
      level: "synced" as DesyncLevel,
      score: 0,
      heartbeatGap: 0,
      distanceFromCrew: null as number | null,
      summary:
        "TwinMe is on standby. Desync is only tracked while Party Mode is active.",
    };
  }

  if (!crew.length) {
    return {
      level: "watch" as DesyncLevel,
      score: 25,
      heartbeatGap: 0,
      distanceFromCrew: null,
      summary:
        "No crew sync signal is available right now, so you are operating without group alignment data.",
    };
  }

  const avgHeartbeat = averageCrewHeartbeat(crew);
  const heartbeatGap =
    typeof avgHeartbeat === "number" && typeof live.heartbeatBpm === "number"
      ? Math.max(0, live.heartbeatBpm - avgHeartbeat)
      : 0;

  const center = getCrewCenter(crew);
  const distanceFromCrew =
    center &&
    typeof live.latitude === "number" &&
    typeof live.longitude === "number"
      ? Math.sqrt(
          (live.latitude - center.latitude) ** 2 +
            (live.longitude - center.longitude) ** 2
        )
      : null;

  let score = 0;

  if (heartbeatGap >= 25) score += 28;
  else if (heartbeatGap >= 15) score += 18;
  else if (heartbeatGap >= 8) score += 10;

  if (distanceFromCrew !== null) {
    if (distanceFromCrew > 0.01) score += 30;
    else if (distanceFromCrew > 0.005) score += 20;
    else if (distanceFromCrew > 0.0025) score += 10;
  }

  if (movementLevel === "drifting") score += 20;
  else if (movementLevel === "moving") score += 8;

  if (live.status === "Drinking" || live.status === "At club") {
    score += 10;
  }

  let level: DesyncLevel = "synced";
  if (score >= 65) level = "separated";
  else if (score >= 40) level = "drifting";
  else if (score >= 18) level = "watch";

  let summary = "You look aligned with your crew right now.";

  if (level === "watch") {
    summary =
      "Your pace is starting to move away from the group. Stay intentional before drift builds.";
  } else if (level === "drifting") {
    summary =
      "You are moving out of sync with your crew. Regroup before the gap gets bigger.";
  } else if (level === "separated") {
    summary =
      "You are clearly out of sync with your crew right now. Slow down, reduce movement, and reconnect.";
  }

  return {
    level,
    score,
    heartbeatGap,
    distanceFromCrew,
    summary,
  };
}

/* -------------------------
   TRAJECTORY ENGINE
--------------------------*/

function getTrajectoryInsight(
  live: PartyLive | null,
  minutes: number,
  movementLevel: string,
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel
): TrajectoryInsight {
  if (!live?.active || typeof live.heartbeatBpm !== "number") {
    return {
      direction: "stable",
      riskWindow: "none",
      summary: "No active trajectory. TwinMe is in standby.",
    };
  }

  let direction: TrajectoryDirection = "stable";
  let riskWindow: TrajectoryRiskWindow = "none";

  if (live.heartbeatBpm >= 115 && minutes > 20) {
    direction = "accelerating";
  } else if (live.heartbeatBpm >= 100) {
    direction = "rising";
  }

  if (driftLevel === "elevated" || driftLevel === "prolonged") {
    direction = "accelerating";
  } else if (driftLevel === "rising" && direction === "stable") {
    direction = "rising";
  }

  if (
    direction === "accelerating" &&
    (desyncLevel === "drifting" ||
      desyncLevel === "separated" ||
      movementLevel === "drifting")
  ) {
    riskWindow = "imminent";
  } else if (
    direction === "rising" ||
    driftLevel === "rising" ||
    desyncLevel === "watch"
  ) {
    riskWindow = "approaching";
  }

  let summary = "Your pace looks stable right now.";

  if (riskWindow === "approaching") {
    summary =
      "If this pace continues, you may enter a higher-risk state soon. Stay intentional.";
  }

  if (riskWindow === "imminent") {
    summary =
      "You are trending toward a high-risk state. Slow down now before it compounds.";
  }

  return {
    direction,
    riskWindow,
    summary,
  };
}

/* -------------------------
   MICRO-GUIDANCE
--------------------------*/

function getMicroGuidance(
  live: PartyLive | null,
  movementLevel: string,
  environmentLevel: string,
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryInsight
): MicroGuidance {
  if (!live?.active) {
    return {
      title: "Steady Start",
      tone: "steady",
      actions: [
        "Take one breath before deciding your next move.",
        "Notice one thing around you that feels calm.",
        "Keep your next choice simple.",
      ],
    };
  }

  if (trajectory.riskWindow === "imminent") {
    return {
      title: "Interrupt The Pattern",
      tone: "protective",
      actions: [
        "Stop where you are for 10 seconds.",
        "Choose one stabilizing move instead of a new stimulating one.",
        "Do not let the next few minutes choose for you.",
      ],
    };
  }

  if (trajectory.riskWindow === "approaching") {
    return {
      title: "Get Ahead Of It",
      tone: "supportive",
      actions: [
        "Slow your next move down on purpose.",
        "Choose the simpler option before pressure builds.",
        "Use the next minute to stabilize, not escalate.",
      ],
    };
  }

  if (noSupportActive) {
    return {
      title: "Stay Close To Yourself",
      tone: "supportive",
      actions: [
        "Pause for 10 seconds before moving again.",
        "Look around and pick one safer direction.",
        "Keep your next step small and deliberate.",
      ],
    };
  }

  if (desyncLevel === "separated" || desyncLevel === "drifting") {
    return {
      title: "Re-Align",
      tone: "protective",
      actions: [
        "Stop and check where your people are.",
        "Choose one direct move that brings you closer to alignment.",
        "Do not add a new stop before you reconnect.",
      ],
    };
  }

  if (driftLevel === "prolonged" || driftLevel === "elevated") {
    return {
      title: "Slow The Pace",
      tone: "supportive",
      actions: [
        "Take one slower breath right now.",
        "Delay your next big decision for a minute.",
        "Choose the quieter option over the louder one.",
      ],
    };
  }

  if (environmentLevel === "unsafe" || environmentLevel === "volatile") {
    return {
      title: "Stabilize",
      tone: "protective",
      actions: [
        "Look for the simplest safe option nearby.",
        "Reduce movement before changing locations.",
        "Stay with the cleaner choice, not the exciting one.",
      ],
    };
  }

  if (movementLevel === "drifting" || movementLevel === "moving") {
    return {
      title: "Move Intentionally",
      tone: "steady",
      actions: [
        "Name your next stop before you go there.",
        "Slow your pace enough to stay aware.",
        "Check whether this move helps or just adds noise.",
      ],
    };
  }

  return {
    title: "Keep It Steady",
    tone: "steady",
    actions: [
      "Stay with what already feels stable.",
      "Keep your next move simple.",
      "Protect your energy before you spend it.",
    ],
  };
}

/* -------------------------
   AWARENESS SCORE
--------------------------*/

function getAwarenessScore(
  live: PartyLive | null,
  minutes: number,
  crewLevel: string,
  movementLevel: string,
  environmentLevel: string,
  spots: SpotsSnapshot | null,
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryInsight
) {
  let score = 18;

  if (!live?.active) score -= 6;
  if (live?.active) score += 8;

  if (live?.status === "Drinking" || live?.status === "At club") {
    score += 14;
  }

  if (live?.status === "Heading home") {
    score -= 4;
  }

  if ((live?.heartbeatBpm || 0) >= 115) {
    score += 14;
  } else if ((live?.heartbeatBpm || 0) >= 100) {
    score += 9;
  } else if ((live?.heartbeatBpm || 0) >= 90) {
    score += 4;
  }

  if (minutes >= 45) {
    score += 10;
  } else if (minutes >= 25) {
    score += 6;
  } else if (minutes >= 10) {
    score += 3;
  }

  if (crewLevel === "no_crew") {
    score += 14;
  } else if (crewLevel === "alone") {
    score += 10;
  } else if (crewLevel === "low") {
    score += 4;
  } else {
    score -= 2;
  }

  if (movementLevel === "drifting") {
    score += 14;
  } else if (movementLevel === "moving") {
    score += 7;
  }

  if (environmentLevel === "unsafe") {
    score += 18;
  } else if (environmentLevel === "volatile") {
    score += 14;
  } else if (environmentLevel === "thin") {
    score += 8;
  } else if (environmentLevel === "supported") {
    score -= 8;
  } else if (environmentLevel === "balanced") {
    score -= 3;
  }

  if ((spots?.riskCount || 0) > 0) score += 8;
  if ((spots?.safeCount || 0) > 0) score -= 4;

  if (spots?.selectedTone === "risk") {
    score += 10;
  } else if (spots?.selectedTone === "safe") {
    score -= 5;
  } else if (spots?.selectedTone === "lit") {
    score += 5;
  }

  if (spots?.selectedTrusted === false) {
    score += 4;
  }

  if (desyncLevel === "watch") {
    score += 8;
  } else if (desyncLevel === "drifting") {
    score += 15;
  } else if (desyncLevel === "separated") {
    score += 24;
  }

  if (driftLevel === "rising") {
    score += 4;
  } else if (driftLevel === "elevated") {
    score += 8;
  } else if (driftLevel === "prolonged") {
    score += 12;
  }

  if (noSupportActive) {
    score += 10;
  }

  if (trajectory.riskWindow === "approaching") {
    score += 6;
  } else if (trajectory.riskWindow === "imminent") {
    score += 12;
  }

  const clamped = Math.max(0, Math.min(100, score));

  let level: AwarenessLevel = "low";
  if (clamped >= 75) level = "critical";
  else if (clamped >= 55) level = "elevated";
  else if (clamped >= 30) level = "guarded";

  return { score: clamped, level };
}

function getAwarenessSummary(level: AwarenessLevel) {
  if (level === "critical") {
    return "Critical awareness needed. Slow movement, reduce drift, and choose the safest next move.";
  }

  if (level === "elevated") {
    return "Awareness should stay high. Your environment or state needs more intentional decisions.";
  }

  if (level === "guarded") {
    return "Stay alert. Things are manageable, but not passive.";
  }

  return "Conditions look calmer. Keep awareness on, but there is less pressure right now.";
}

/* -------------------------
   LIVE NUDGE
--------------------------*/

function getLiveNudge(
  live: PartyLive | null,
  minutes: number,
  crewLevel: string,
  movementLevel: string,
  environmentLevel: string,
  spots: SpotsSnapshot | null,
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryInsight
) {
  if (!live?.active) {
    return "TwinMe is standing by. Turn Party Mode on when your night starts moving.";
  }

  if (trajectory.riskWindow === "imminent") {
    return "If you continue at this pace, you’re about to enter a high-risk state. Slow down now and stabilize your position.";
  }

  if (trajectory.riskWindow === "approaching") {
    return "You’re trending toward a higher-risk state. Stay intentional with your next few moves.";
  }

  if (noSupportActive && driftLevel === "prolonged") {
    return "You have been elevated for a while and you do not have active support around you. Let’s slow this moment down and keep your next move simple.";
  }

  if (noSupportActive && environmentLevel === "unsafe") {
    return "You do not have crew or visible support around you right now. Stay grounded, reduce movement, and choose the safest nearby option.";
  }

  if (noSupportActive) {
    return "I’m staying closer with you right now. Keep your movement simple, stay aware of your surroundings, and do not let the moment rush you.";
  }

  if (desyncLevel === "separated") {
    return "You are clearly out of sync with your crew. Slow down, reduce movement, and reconnect before you go deeper into the night.";
  }

  if (desyncLevel === "drifting") {
    return "You’re drifting away from your crew’s pace or position. Regroup before the gap gets wider.";
  }

  if (driftLevel === "prolonged") {
    return "You have been elevated longer than your usual pace. Slow this moment down before it starts choosing for you.";
  }

  if (driftLevel === "elevated") {
    return "You are more activated than your normal pattern right now. Keep your next move simple and intentional.";
  }

  if (driftLevel === "rising") {
    return "Your pace is rising faster than usual. Stay aware before drift builds.";
  }

  if (environmentLevel === "unsafe") {
    return "You do not have a strong safe-zone layer nearby right now. Reduce drift and move more deliberately.";
  }

  if (environmentLevel === "volatile") {
    return "This environment is unstable. Hotspots and risk are mixing, so your next move needs to be intentional.";
  }

  if (environmentLevel === "thin") {
    return "Your environment looks thin right now. There are not many nearby signals or support points.";
  }

  if (environmentLevel === "supported" && movementLevel === "stable") {
    return "You have some support nearby. This is a better moment to stay grounded and avoid unnecessary movement.";
  }

  if (crewLevel === "no_crew") {
    return "You have no crew connected. Stay extra aware of your environment.";
  }

  if (crewLevel === "alone" && movementLevel === "moving") {
    return "You are alone and moving. Slow down and keep your direction intentional.";
  }

  if (crewLevel === "alone") {
    return "You are currently alone. Increase your awareness and keep your movement intentional.";
  }

  if (movementLevel === "drifting") {
    return "You’re drifting across positions. Pause and re-orient before your next move.";
  }

  if (
    movementLevel === "moving" &&
    (live.status === "Drinking" || live.status === "At club")
  ) {
    return "You’re moving while in a high-energy state. Slow the pace down and stay with your people.";
  }

  if (movementLevel === "moving") {
    return "You’re actively moving. Keep your next stop intentional, not random.";
  }

  if (live.status === "Drinking" || live.status === "At club") {
    if (minutes < 10) return "Energy is rising. Stay close to your people.";
    if (minutes < 25) return "You’ve been active for a while. Check your crew position.";
    if (minutes < 45) return "High-risk window. Stay with your group and slow decisions.";
    return "You’ve been out for a while. Start shifting toward a steadier pace now.";
  }

  return "You look fairly steady right now. Protect that by keeping your next move simple.";
}

function generateTwinResponse({
  input,
  live,
  awareness,
  trajectory,
  desync,
  drift,
  learnMe,
  noSupport,
}: {
  input: string;
  live: PartyLive | null;
  awareness: { score: number; level: AwarenessLevel };
  trajectory: TrajectoryInsight;
  desync: { level: DesyncLevel };
  drift: { level: DriftLevel };
  learnMe: LearnMeInsight;
  noSupport: { active: boolean };
}) {
  // normalize input
  const text = input.toLowerCase();

  // HIGH RISK OVERRIDE
  if (trajectory.riskWindow === "imminent") {
    return "Stay with me for a second. Things are stacking right now. Slow your next move down on purpose.";
  }

  if (noSupport.active) {
    return "I’m here with you. You don’t have strong support around you right now, so keep your next move simple and intentional.";
  }

  if (desync.level === "separated") {
    return "You’re out of sync right now. Before anything else, get yourself back into alignment.";
  }

  if (drift.level === "prolonged") {
    return "You’ve been elevated for a while. This is where things usually start slipping. Slow this moment down.";
  }

  // USER INTENT DETECTION
  if (text.includes("what should i do")) {
    return "Keep it simple. Choose the option that keeps you steady, not the one that pulls you deeper in.";
  }

  if (text.includes("am i good") || text.includes("am i okay")) {
    if (awareness.level === "low") {
      return "You’re okay right now. Just stay aware and don’t drift.";
    }
    return "You’re not off track, but you’re not in a passive state either. Stay intentional.";
  }

  if (text.includes("help")) {
    return "Tell me what’s pulling at you right now. We’ll simplify it.";
  }

  // LEARNING-BASED RESPONSE
  if (learnMe.label === "recurring pattern") {
    return "This feels familiar. You’ve been here before. Catching it earlier this time is the advantage.";
  }

  // DEFAULT (CALM PRESENCE)
  return "I’m here. What’s your next move feeling like right now?";
}

/* -------------------------
   ALERTS
--------------------------*/

function getAlert(
  live: PartyLive | null,
  minutes: number,
  crewLevel: string,
  movementLevel: string,
  environmentLevel: string,
  spots: SpotsSnapshot | null,
  desyncLevel: DesyncLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryInsight
) {
  if (!live?.active) return null;

  if (trajectory.riskWindow === "imminent") {
    return "⚠️ Your current pattern is trending toward a high-risk state. Interrupt it now.";
  }

  if (noSupportActive && minutes > 20 && environmentLevel !== "supported") {
    return "⚠️ You are active without visible support around you. Keep your next move small and intentional.";
  }

  if (desyncLevel === "separated") {
    return "⚠️ You are out of sync with your crew. Reconnect now before the gap widens.";
  }

  if (desyncLevel === "drifting") {
    return "⚠️ You are drifting out of sync with your crew. Pause before your next move.";
  }

  if (
    environmentLevel === "unsafe" &&
    (live.status === "Drinking" || live.status === "At club")
  ) {
    return "⚠️ High-energy state with weak environment support. Prioritize a safer zone now.";
  }

  if (environmentLevel === "volatile" && movementLevel === "drifting") {
    return "⚠️ You are drifting inside an unstable environment. Pause before your next move.";
  }

  if (crewLevel === "alone" && movementLevel === "moving") {
    return "⚠️ You are moving alone in an active state. Reduce movement and reassess.";
  }

  if (
    movementLevel === "drifting" &&
    (live.status === "Drinking" || live.status === "At club")
  ) {
    return "⚠️ You are drifting in a high-energy state. Pause before your next move.";
  }

  if (crewLevel === "alone" && minutes > 15) {
    return "⚠️ You are alone in an active state. Reconnect with your crew.";
  }

  if (
    (live.status === "Drinking" || live.status === "At club") &&
    minutes > 40
  ) {
    return "⚠️ Prolonged high-energy state. Start transitioning out.";
  }

  if ((spots?.safeCount || 0) === 0 && (spots?.riskCount || 0) > 0) {
    return "⚠️ No nearby safe-zone signal is visible while risk is present.";
  }

  return null;
}

/* -------------------------
   PREDICTIVE SIGNALS
--------------------------*/

function getPredictiveSignals(
  live: PartyLive | null,
  awareness: { score: number; level: AwarenessLevel },
  minutes: number,
  movementLevel: string,
  environmentLevel: string,
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryInsight,
  learnMe: LearnMeInsight,
  crewCollapse: CrewCollapseInsight = DEFAULT_CREW_COLLAPSE
): PredictiveSignal[] {
  const signals: PredictiveSignal[] = [];
  const safeCrewCollapse = crewCollapse ?? DEFAULT_CREW_COLLAPSE;

  if (safeCrewCollapse.level === "collapsing") {
    signals.push({
      level: "red",
      title: "Support layer collapsed",
      body: safeCrewCollapse.summary,
    });
  } else if (safeCrewCollapse.level === "thinning") {
    signals.push({
      level: "orange",
      title: "Crew support thinning",
      body: safeCrewCollapse.summary,
    });
  }

  if (!live?.active) {
    signals.push({
      level: "blue",
      title: "TwinMe on standby",
      body: "Party Mode is not active, so predictive signals are quiet right now.",
    });
    return signals;
  }

  if (trajectory.riskWindow === "imminent") {
    signals.push({
      level: "red",
      title: "High-risk window opening",
      body: "Your current pace and pattern suggest a higher-risk state is about to compound.",
    });
  } else if (trajectory.riskWindow === "approaching") {
    signals.push({
      level: "orange",
      title: "Pressure building",
      body: "Your pace is trending upward. If this continues, risk is likely to rise soon.",
    });
  }

  if (desyncLevel === "separated") {
    signals.push({
      level: "red",
      title: "Crew separation detected",
      body: "You are clearly out of sync with your crew’s pace or position.",
    });
  } else if (desyncLevel === "drifting") {
    signals.push({
      level: "orange",
      title: "Crew drift building",
      body: "You are beginning to move out of alignment with your crew.",
    });
  }

  if (driftLevel === "prolonged") {
    signals.push({
      level: "orange",
      title: "Prolonged elevation",
      body: "You have been elevated longer than your usual rhythm.",
    });
  } else if (driftLevel === "elevated") {
    signals.push({
      level: "orange",
      title: "Elevation above baseline",
      body: "Your internal pace is above your normal pattern right now.",
    });
  }

  if (noSupportActive) {
    signals.push({
      level: "orange",
      title: "Low support coverage",
      body: "You do not currently have active crew or visible support around you.",
    });
  }

  if (environmentLevel === "unsafe") {
    signals.push({
      level: "red",
      title: "Unsafe environment signal",
      body: "Risk is present without a strong nearby safe-zone layer.",
    });
  } else if (environmentLevel === "volatile") {
    signals.push({
      level: "orange",
      title: "Volatile environment",
      body: "Hotspots and risk are mixing in your environment.",
    });
  }

  if (movementLevel === "drifting" && minutes > 10) {
    signals.push({
      level: "orange",
      title: "Movement drift",
      body: "Your movement pattern is spreading out instead of staying intentional.",
    });
  }

  if (awareness.level === "critical") {
    signals.push({
      level: "red",
      title: "Critical awareness state",
      body: "Multiple signals are stacking right now. Slow down and simplify your next move.",
    });
  } else if (awareness.level === "elevated") {
    signals.push({
      level: "orange",
      title: "Elevated awareness state",
      body: "Your state needs more deliberate decisions right now.",
    });
  }

  if (
    learnMe.label === "pattern seen" ||
    learnMe.label === "recurring pattern" ||
    learnMe.label === "above normal"
  ) {
    signals.push({
      level: "blue",
      title: "Pattern recognized",
      body: learnMe.summary,
    });
  }

  return signals.slice(0, 6);
}

/* -------------------------
   REPLY
--------------------------*/

function buildReply(
  input: string,
  live: PartyLive | null,
  movementLevel: string,
  environmentLevel: string,
  spots: SpotsSnapshot | null,
  desyncLevel: DesyncLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryInsight,
  learnMe: LearnMeInsight
) {
  const text = input.toLowerCase();

  if (text.includes("state check") || text.includes("check me")) {
    return `${learnMe.summary}

• ${trajectory.summary}
• Stay intentional with your next move
• Keep your decisions cleaner than the environment

TwinMe is reading the pattern, not just the moment.`;
  }

  if (trajectory.riskWindow === "imminent") {
    return `Your current pattern is heading toward a higher-risk state.

• Interrupt the pace now
• Choose one stabilizing move
• Do not let the next few minutes decide for you

The best move right now is the one that slows the pattern down.`;
  }

  if (trajectory.riskWindow === "approaching") {
    return `You are trending toward a more pressured state.

• Get ahead of it early
• Keep your next move simple
• Choose stability before intensity grows

The earlier you intervene, the easier this stays.`;
  }

  if (noSupportActive) {
    return `You do not have much support around you right now.

• Keep your next move small
• Do not let the moment rush you
• Choose the simplest safe option available

I’m here with you — keep this moment steady.`;
  }

  if (desyncLevel === "separated") {
    return `You are out of sync with your crew right now.

• Reconnect before doing anything extra
• Reduce movement
• Make the next move the cleanest one

Alignment matters more than momentum right now.`;
  }

  if (desyncLevel === "drifting") {
    return `You are starting to drift away from your crew.

• Correct it early
• Do not stack more movement
• Get back to alignment before the gap grows

Small corrections now prevent bigger problems later.`;
  }

  if (
    spots?.selectedTone === "risk" &&
    (text.includes("go") || text.includes("move") || text.includes("where"))
  ) {
    return `This environment is carrying more risk right now.

• Stay close to your crew
• Slow your decisions
• Keep control of your movement

Stay intentional.`;
  }

  if (
    spots?.selectedTone === "safe" &&
    (text.includes("go") || text.includes("move") || text.includes("where"))
  ) {
    return `Your environment looks more stable right now.

• Stay near the safer layer if possible
• Do not trade safety for extra noise
• Use the stable zone to reset your decisions

The best move is usually the cleaner one.`;
  }

  if (text.includes("learn me") || text.includes("remember me")) {
    return `${learnMe.summary}

TwinMe is now building pattern memory over time so it can notice:

• when your pace rises above normal
• when you usually start escalating
• when your active window runs longer than usual

This turns TwinMe from a moment-reader into a rhythm-reader.`;
  }

  if (text.includes("tonight") || text.includes("go out")) {
    return `You are deciding how to spend your energy tonight.

• Choose based on how you want to feel after
• Do not follow noise
• Rest is a valid move

What benefits you most tonight?`;
  }

  if (movementLevel === "moving" || movementLevel === "drifting") {
    return `${learnMe.summary}

• Slow your pace enough to stay aware
• Choose direction on purpose
• Do not let movement become noise

What is your cleanest next move?`;
  }

  if (environmentLevel === "unsafe" || environmentLevel === "volatile") {
    return `${learnMe.summary}

• Prioritize the safer option
• Reduce unnecessary movement
• Choose clarity over stimulation

Protect the next few minutes.`;
  }

  return `${learnMe.summary}

• Choose alignment over noise
• Protect your energy
• Keep your next move intentional

What feels right?`;
}

/* -------------------------
   VOICE HELPERS
--------------------------*/

function getStateCheckSpeech(
  awareness: { score: number; level: AwarenessLevel },
  nudge: string,
  microGuidance: MicroGuidance,
  noSupportActive: boolean,
  learnMe: LearnMeInsight
) {
  const actionText = microGuidance.actions.slice(0, 2).join(". ");

  return `TwinMe state check. Awareness score ${awareness.score}. Current state ${awareness.level}. ${nudge} ${learnMe.summary} ${
    noSupportActive ? "Support around you looks thin right now." : ""
  } Next best moves: ${actionText}.`;
}

function getAutoVoiceMessage(
  live: PartyLive | null,
  awareness: { score: number; level: AwarenessLevel },
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryInsight,
  microGuidance: MicroGuidance,
  crewCollapse: CrewCollapseInsight
) {
  const firstAction = microGuidance.actions[0] ?? "Keep your next move simple.";

  if (crewCollapse.level === "collapsing") {
    return `TwinMe check. Your crew support has dropped away. Do not move like you still have the same coverage. ${firstAction}`;
  }

  if (crewCollapse.level === "thinning") {
    return `TwinMe check. Your crew layer is getting thinner. Get ahead of that early. ${firstAction}`;
  }

  if (!live?.active) {
    return null;
  }

  if (trajectory.riskWindow === "imminent") {
    return `TwinMe check. Your pattern is turning high risk. Slow down now. ${firstAction}`;
  }

  if (desyncLevel === "separated") {
    return `TwinMe check. You are out of sync with your crew. Reconnect now. ${firstAction}`;
  }

  if (driftLevel === "prolonged") {
    return `TwinMe check. You have been elevated longer than usual. Slow this moment down. ${firstAction}`;
  }

  if (awareness.level === "critical") {
    return `TwinMe check. Multiple signals are stacking right now. Simplify your next move. ${firstAction}`;
  }

  if (trajectory.riskWindow === "approaching") {
    return `TwinMe check. Your pace is rising. Get ahead of it early. ${firstAction}`;
  }

  if (desyncLevel === "drifting") {
    return `TwinMe check. You are starting to drift away from your crew. Correct it early. ${firstAction}`;
  }

  if (driftLevel === "elevated" || driftLevel === "rising") {
    return `TwinMe check. Your internal pace is above baseline. Stay intentional. ${firstAction}`;
  }

  if (noSupportActive) {
    return `TwinMe check. Support around you looks thin right now. Keep your next move small. ${firstAction}`;
  }

  if (awareness.level === "guarded") {
    return `TwinMe check. Stay aware. ${firstAction}`;
  }

  return null;
}

function speakText(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 0.95;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

/* -------------------------
   THEME / VISUALS
--------------------------*/

function getAmbientTheme(
  awarenessLevel: AwarenessLevel,
  environmentLevel: string,
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryInsight
) {
  if (
    awarenessLevel === "critical" ||
    desyncLevel === "separated" ||
    trajectory.riskWindow === "imminent"
  ) {
    return {
      pageBg:
        "radial-gradient(circle at top, rgba(239,68,68,0.18), rgba(10,10,11,1) 58%)",
      orbA: "rgba(239,68,68,0.18)",
      orbB: "rgba(251,146,60,0.10)",
      card: "linear-gradient(180deg,#1a1010,#0c0b0b)",
      badge: "bg-red-500/15 text-red-100 border-red-400/25",
      border: "border-red-500/20",
      glow: "shadow-[0_0_50px_rgba(239,68,68,0.15)]",
    };
  }

  if (
    awarenessLevel === "elevated" ||
    driftLevel === "prolonged" ||
    noSupportActive ||
    environmentLevel === "volatile"
  ) {
    return {
      pageBg:
        "radial-gradient(circle at top, rgba(251,146,60,0.15), rgba(10,10,11,1) 58%)",
      orbA: "rgba(251,146,60,0.16)",
      orbB: "rgba(245,158,11,0.08)",
      card: "linear-gradient(180deg,#17110a,#0c0b0b)",
      badge: "bg-orange-500/15 text-orange-100 border-orange-400/25",
      border: "border-orange-500/20",
      glow: "shadow-[0_0_45px_rgba(251,146,60,0.12)]",
    };
  }

  return {
    pageBg:
      "radial-gradient(circle at top, rgba(59,130,246,0.14), rgba(10,10,11,1) 58%)",
    orbA: "rgba(59,130,246,0.14)",
    orbB: "rgba(99,102,241,0.08)",
    card: "linear-gradient(180deg,#0f1625,#0a0b10)",
    badge: "bg-blue-500/15 text-blue-100 border-blue-400/25",
    border: "border-white/10",
    glow: "shadow-[0_0_40px_rgba(59,130,246,0.08)]",
  };
}

/* -------------------------
   SMALL UI HELPERS
--------------------------*/

function chipClass(level: PredictiveSignal["level"]) {
  if (level === "red") {
    return "border border-red-400/30 bg-red-500/10 text-red-100";
  }
  if (level === "orange") {
    return "border border-orange-400/30 bg-orange-500/10 text-orange-100";
  }
  return "border border-blue-400/30 bg-blue-500/10 text-blue-100";
}

function levelClass(level: AwarenessLevel) {
  if (level === "critical") return "text-red-300";
  if (level === "elevated") return "text-orange-300";
  if (level === "guarded") return "text-yellow-200";
  return "text-blue-200";
}

/* -------------------------
   PAGE
--------------------------*/

export default function TwinMePage() {
  const [displayName, setDisplayName] = useState("Neo");
  const [live, setLive] = useState<PartyLive | null>(null);
  const [crew, setCrew] = useState<CrewStatus[]>([]);
  const [spots, setSpots] = useState<SpotsSnapshot | null>(null);
  const [history, setHistory] = useState<PositionPoint[]>([]);
 const [messages, setMessages] = useState<Message[]>([
  {
    id: 1,
    role: "twin",
    text: "TwinMe is here. Ask for a state check, help thinking something through, or say what tonight feels like.",
  },
]);
  const [input, setInput] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
const [hasHydrated, setHasHydrated] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const autoVoiceCooldownRef = useRef<number>(0);

useEffect(() => {
  setHasHydrated(true);
  const storedMessages = readJson<Message[]>(TWINCORE_MESSAGES_KEY, [
    {
      id: 1,
      role: "twin",
      text: "TwinMe is here. Ask for a state check, help thinking something through, or say what tonight feels like.",
    },
  ]);
  setMessages(storedMessages);
}, []);
  
  useEffect(() => {
    const name = getDisplayName();
    setDisplayName(name);

    const refresh = async () => {
      const nextLive = getLiveContext();
      const nextSpots = getSpotsContext();
      const nextCrew = await getCrewContext(name);

      setLive(nextLive);
      setSpots(nextSpots);
      setCrew(nextCrew);

      updatePositionHistory(nextLive);
      setHistory(getPositionHistory());

      if (nextLive?.active && typeof nextLive.heartbeatBpm === "number") {
        updateBaselineSnapshot(nextLive.heartbeatBpm);
      }
    };

    refresh();
    const timer = window.setInterval(refresh, 8000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
  if (!hasHydrated) return;
  writeJson(TWINCORE_MESSAGES_KEY, messages.slice(-20));
}, [hasHydrated, messages]);

  const minutes = useMemo(() => getMinutesActive(live), [live]);

  const crewLevel = useMemo(() => getCrewInsight(crew), [crew]);
  const movementLevel = useMemo(() => getMovementInsight(history), [history]);
  const environmentLevel = useMemo(() => getEnvironmentInsight(spots), [spots]);

  const drift = useMemo(
    () => getInternalDriftInsight(live, minutes),
    [live, minutes]
  );

  const desync = useMemo(
    () => getDesyncInsight(live, crew, movementLevel),
    [live, crew, movementLevel]
  );

  const trajectory = useMemo(
    () =>
      getTrajectoryInsight(
        live,
        minutes,
        movementLevel,
        desync.level,
        drift.level
      ),
    [live, minutes, movementLevel, desync.level, drift.level]
  );

  const noSupport = useMemo(
    () => getNoSupportMode(live, crew, spots),
    [live, crew, spots]
  );

  useEffect(() => {
  if (!hasHydrated) return;
  updateLearningProfile(live, minutes, drift.level, noSupport.active);
}, [hasHydrated, live, minutes, drift.level, noSupport.active]);

  const learningProfile = useMemo(() => {
  if (!hasHydrated) return null;
  return getLearningProfile();
}, [hasHydrated, live, minutes]);

  const learnMe = useMemo(
    () =>
      getLearnMeInsight(
        learningProfile,
        live,
        minutes,
        trajectory,
        drift.level
      ),
    [learningProfile, live, minutes, trajectory, drift.level]
  );

  const crewCollapse = useMemo(
    () => getCrewCollapseInsight(live, crew, minutes),
    [live, crew, minutes]
  );

  const microGuidance = useMemo(
    () =>
      getMicroGuidance(
        live,
        movementLevel,
        environmentLevel,
        desync.level,
        drift.level,
        noSupport.active,
        trajectory
      ),
    [
      live,
      movementLevel,
      environmentLevel,
      desync.level,
      drift.level,
      noSupport.active,
      trajectory,
    ]
  );

  const awareness = useMemo(
    () =>
      getAwarenessScore(
        live,
        minutes,
        crewLevel,
        movementLevel,
        environmentLevel,
        spots,
        desync.level,
        drift.level,
        noSupport.active,
        trajectory
      ),
    [
      live,
      minutes,
      crewLevel,
      movementLevel,
      environmentLevel,
      spots,
      desync.level,
      drift.level,
      noSupport.active,
      trajectory,
    ]
  );

  const awarenessSummary = useMemo(
    () => getAwarenessSummary(awareness.level),
    [awareness.level]
  );

  const nudge = useMemo(
    () =>
      getLiveNudge(
        live,
        minutes,
        crewLevel,
        movementLevel,
        environmentLevel,
        spots,
        desync.level,
        drift.level,
        noSupport.active,
        trajectory
      ),
    [
      live,
      minutes,
      crewLevel,
      movementLevel,
      environmentLevel,
      spots,
      desync.level,
      drift.level,
      noSupport.active,
      trajectory,
    ]
  );

  const alert = useMemo(
    () =>
      getAlert(
        live,
        minutes,
        crewLevel,
        movementLevel,
        environmentLevel,
        spots,
        desync.level,
        noSupport.active,
        trajectory
      ),
    [
      live,
      minutes,
      crewLevel,
      movementLevel,
      environmentLevel,
      spots,
      desync.level,
      noSupport.active,
      trajectory,
    ]
  );

  const predictiveSignals = useMemo(
    () =>
      getPredictiveSignals(
        live,
        awareness,
        minutes,
        movementLevel,
        environmentLevel,
        desync.level,
        drift.level,
        noSupport.active,
        trajectory,
        learnMe,
        crewCollapse
      ),
    [
      live,
      awareness,
      minutes,
      movementLevel,
      environmentLevel,
      desync.level,
      drift.level,
      noSupport.active,
      trajectory,
      learnMe,
      crewCollapse,
    ]
  );

  const stateCheckSpeech = useMemo(
    () =>
      getStateCheckSpeech(
        awareness,
        nudge,
        microGuidance,
        noSupport.active,
        learnMe
      ),
    [awareness, nudge, microGuidance, noSupport.active, learnMe]
  );

  const autoVoiceMessage = useMemo(
  () =>
    getAutoVoiceMessage(
      live,
      awareness,
      desync.level,
      drift.level,
      noSupport.active,
      trajectory,
      microGuidance,
      crewCollapse
    ),
    [
      live,
      awareness,
      desync.level,
      drift.level,
      noSupport.active,
      trajectory,
      microGuidance,
      crewCollapse
    ]
  );

  useEffect(() => {
    if (!voiceEnabled || !autoVoiceMessage) return;

    const now = Date.now();
    if (now - autoVoiceCooldownRef.current < 30000) return;

    autoVoiceCooldownRef.current = now;
    speakText(autoVoiceMessage);
  }, [voiceEnabled, autoVoiceMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript =
        event.results?.[event.resultIndex]?.[0]?.transcript?.trim() || "";
      if (!transcript) return;

      setInput(transcript);

      const lowered = transcript.toLowerCase();

      if (
        lowered.includes("state check") ||
        lowered.includes("check me") ||
        lowered.startsWith("twin")
      ) {
        handleSend(transcript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
    } catch {
      // ignore repeated start errors
    }
  }

     const handleSend = (forcedInput?: string) => {
    const text = forcedInput ?? input;
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text,
    };

    const twinReplyText = generateTwinResponse({
      input: text,
      live,
      awareness,
      trajectory,
      desync,
      drift,
      learnMe,
      noSupport,
    });

    const twinMessage: Message = {
      id: Date.now() + 1,
      role: "twin",
      text: twinReplyText,
    };

    setMessages((prev) => [...prev, userMessage, twinMessage].slice(-20));
    setInput("");

    if (voiceEnabled) {
      speakText(twinReplyText);
    }
  };

  const theme = getAmbientTheme(
    awareness.level,
    environmentLevel,
    desync.level,
    drift.level,
    noSupport.active,
    trajectory
  );

  return (
    <main className="min-h-screen text-white" style={{ background: theme.pageBg }}>
      <div className="w-full max-w-[1280px] mx-auto space-y-8 px-4 md:px-6 xl:px-8 pt-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">TwinMe</h1>
          <p className="text-white/50 text-sm">
            Predictive support for {displayName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-2">
          {[
            { label: "Awareness", value: awareness.score, sub: awareness.level },
            { label: "Heartbeat", value: live?.heartbeatBpm || 0, sub: `${minutes} min` },
            { label: "Desync", value: desync.level, sub: desync.summary },
            { label: "LearnMe", value: learnMe.label, sub: learnMe.summary },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white/5 p-3 border border-white/10 min-h-[96px]"
            >
              <div className="text-xs text-white/50">{item.label}</div>
              <div className="text-lg md:text-2xl font-semibold leading-tight">
                {item.value}
              </div>
              <div className="text-[11px] leading-4 text-white/45 mt-1">
                {item.sub}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
          <div className="space-y-5 lg:sticky lg:top-6 self-start">
            <div className="rounded-2xl bg-white/5 p-3 md:p-4 border border-white/10 min-h-[110px]">
              <h3 className="font-semibold mb-2">State</h3>
              <p className="text-sm text-white/60">{nudge}</p>
            </div>

            <div className="rounded-2xl bg-white/5 p-3 border border-white/10 min-h-[92px]">
              <h3 className="font-semibold mb-2">{microGuidance.title}</h3>
              <ul className="text-sm text-white/60 space-y-1">
                {microGuidance.actions.map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm text-white/50">Predictive signals</h3>
              {predictiveSignals.map((s, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3 border ${
                    s.level === "red"
                      ? "border-red-400/30 bg-red-500/10"
                      : s.level === "orange"
                      ? "border-orange-400/30 bg-orange-500/10"
                      : "border-blue-400/30 bg-blue-500/10"
                  }`}
                >
                  <div className="font-medium text-sm">{s.title}</div>
                  <div className="text-xs text-white/60">{s.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 p-4 md:p-5 border border-white/10 w-full min-w-0">
            <h3 className="font-semibold mb-3 text-base md:text-lg">
              Talk to TwinMe
            </h3>

            <div className="w-full rounded-2xl border border-white/10 bg-black/10 p-3 md:p-4 min-h-[220px] max-h-[320px] overflow-y-auto space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl max-w-[88%] md:max-w-[80%] ${
                    m.role === "twin"
                      ? "bg-blue-500/10 border border-blue-400/20"
                      : "bg-white/10 ml-auto"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {m.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-stretch sm:items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tell TwinMe what’s going on..."
                className="w-full min-h-[84px] max-h-[140px] resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none leading-5"
              />
              <button
                onClick={() => handleSend()}
                className="h-[52px] sm:h-[84px] rounded-2xl bg-white px-5 text-sm font-medium text-black transition hover:opacity-90"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}