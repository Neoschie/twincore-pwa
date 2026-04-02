"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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

type CrewStatus = {
  id: string;
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

const STARTER_PROMPTS = [
  "What should I do tonight?",
  "Help me think this through",
  "Give me a state check",
  "Am I getting off track?",
];

/* -------------------------
   DATA LOADERS
--------------------------*/

function getLiveContext(): PartyLive | null {
  try {
    const raw = localStorage.getItem("twincore_party_live");
    if (!raw) return null;
    return JSON.parse(raw) as PartyLive;
  } catch {
    return null;
  }
}

function getCrewContext(): CrewStatus[] {
  try {
    const raw = localStorage.getItem("twincore_crew_snapshot");
    if (!raw) return [];
    return JSON.parse(raw) as CrewStatus[];
  } catch {
    return [];
  }
}

function getSpotsContext(): SpotsSnapshot | null {
  try {
    const raw = localStorage.getItem("twincore_spots_snapshot");
    if (!raw) return null;
    return JSON.parse(raw) as SpotsSnapshot;
  } catch {
    return null;
  }
}

/* -------------------------
   BASELINE / INTERNAL DRIFT
--------------------------*/

function getBaselineSnapshot(): BaselineSnapshot | null {
  try {
    const raw = localStorage.getItem(TWINCORE_BASELINE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BaselineSnapshot;
  } catch {
    return null;
  }
}

function updateBaselineSnapshot(currentBpm: number) {
  if (!Number.isFinite(currentBpm) || currentBpm <= 0) return;

  const existing = getBaselineSnapshot();

  if (!existing) {
    localStorage.setItem(
      TWINCORE_BASELINE_KEY,
      JSON.stringify({
        avgBpm: Math.round(currentBpm),
        samples: 1,
      })
    );
    return;
  }

  const nextSamples = existing.samples + 1;
  const nextAvg =
    (existing.avgBpm * existing.samples + currentBpm) / nextSamples;

  localStorage.setItem(
    TWINCORE_BASELINE_KEY,
    JSON.stringify({
      avgBpm: Math.round(nextAvg),
      samples: nextSamples,
    })
  );
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
  try {
    const raw = localStorage.getItem(TWINCORE_LEARNING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LearningProfile;
  } catch {
    return null;
  }
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

  localStorage.setItem(TWINCORE_LEARNING_KEY, JSON.stringify(nextProfile));
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
  return Math.floor((Date.now() - new Date(live.timestamp).getTime()) / 60000);
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
    return "You’ve been out too long. Start thinking about your exit.";
  }

  if (live.status === "Heading home") {
    return "You’re heading home. Stay focused until you're fully safe.";
  }

  if (spots?.selectedTone === "safe") {
    return "Your current environment looks more stable. Keep it simple and do not trade a safe zone for noise.";
  }

  return "Stay aware and move intentionally.";
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
  learnMe: LearnMeInsight
): PredictiveSignal[] {
  const signals: PredictiveSignal[] = [];

  if (!live?.active) {
    signals.push({
      level: "blue",
      title: "Standby state",
      body: "TwinMe is calm right now, but your pattern memory is still ready the moment activity starts.",
    });
    return signals;
  }

  if (trajectory.riskWindow === "imminent") {
    signals.push({
      level: "red",
      title: "High-risk window opening",
      body: "Your current pace, position, and state are compounding. The next few minutes matter most.",
    });
  }

  if (desyncLevel === "separated") {
    signals.push({
      level: "red",
      title: "Crew separation detected",
      body: "You are no longer moving in line with your crew’s rhythm or position.",
    });
  } else if (desyncLevel === "drifting") {
    signals.push({
      level: "orange",
      title: "Crew drift building",
      body: "You are starting to move outside your group’s pace. Correcting early keeps the night cleaner.",
    });
  }

  if (driftLevel === "prolonged") {
    signals.push({
      level: "red",
      title: "Prolonged activation",
      body: "Your internal pace has stayed elevated longer than usual. This is where nights start choosing for people.",
    });
  } else if (driftLevel === "elevated" || driftLevel === "rising") {
    signals.push({
      level: "orange",
      title: "Internal pace rising",
      body: "Your current state is running above baseline. Slow corrections now are stronger than late ones.",
    });
  }

  if (noSupportActive) {
    signals.push({
      level: "orange",
      title: "Support coverage thin",
      body: "TwinMe is seeing low human or environmental support around you right now.",
    });
  }

  if (environmentLevel === "unsafe" || environmentLevel === "volatile") {
    signals.push({
      level: environmentLevel === "unsafe" ? "red" : "orange",
      title: "Environment pressure",
      body: "Your surroundings are not giving you a stable layer right now. Safer positioning would lower risk fast.",
    });
  }

  if (
    movementLevel === "moving" &&
    (live.status === "Drinking" || live.status === "At club")
  ) {
    signals.push({
      level: "orange",
      title: "Movement + energy mix",
      body: "You are moving while already in a high-energy state. That usually reduces control before people notice it.",
    });
  }

  if (awareness.level === "critical" || awareness.score >= 80) {
    signals.push({
      level: "red",
      title: "Pressure stacking",
      body: "Multiple signals are stacking at once. This is the moment to simplify, not add more stimulation.",
    });
  }

  if (minutes >= 25 && trajectory.riskWindow === "approaching") {
    signals.push({
      level: "orange",
      title: "Escalation window approaching",
      body: "You have been active long enough that your next decisions matter more than your last ones.",
    });
  }

  if (learnMe.label === "pattern seen" || learnMe.label === "above normal") {
    signals.push({
      level: "blue",
      title: "Pattern memory engaged",
      body: learnMe.summary,
    });
  }

  if (signals.length === 0) {
    signals.push({
      level: "blue",
      title: "System steady",
      body: "No major predictive concerns are stacking right now. Stay intentional and keep the next move clean.",
    });
  }

  return signals.slice(0, 3);
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
    return `You are clearly out of sync with your crew right now.

• Slow your pace down
• Reduce random movement
• Reconnect before making your next decision

Alignment matters more than momentum right now.`;
  }

  if (desyncLevel === "drifting") {
    return `You are starting to drift out of sync with your crew.

• Pause before changing position again
• Re-align with your group
• Do not let distance or pace grow casually

The earlier you correct drift, the easier the night stays.`;
  }

  if (environmentLevel === "unsafe") {
    return `Your environment does not look supportive right now.

• Prioritize safer ground over momentum
• Do not drift deeper into weak-support areas
• Make your next move about stability, not excitement

Safer options matter more than vibe right now.`;
  }

  if (environmentLevel === "volatile") {
    return `This area looks unstable.

• Hotspots and risk are mixing
• Slow down before changing locations
• Pick the safer option even if it feels less exciting

You do not need more stimulation right now — you need control.`;
  }

  if (movementLevel === "drifting") {
    return `You’ve been drifting across positions.

• Pause before making your next move
• Re-orient to where you actually want to be
• Avoid letting the night move you more than you move the night

Stability matters more than momentum right now.`;
  }

  if (movementLevel === "moving" && live?.active) {
    return `You are moving right now.

• Keep your direction clear
• Slow your pace enough to stay aware
• Make sure your next move is chosen, not drifted into

Control matters more than motion.`;
  }

  if (
    live?.active &&
    (live.status === "Drinking" || live.status === "At club")
  ) {
    return `You are in a high-energy environment.

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

  return `TwinMe state check. Awareness score ${awareness.score}. Current state ${awareness.level}. ${nudge} ${learnMe.summary} ${noSupportActive ? "Support around you looks thin right now." : ""} Next best moves: ${actionText}.`;
}

function getAutoVoiceMessage(
  live: PartyLive | null,
  awareness: { score: number; level: AwarenessLevel },
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryInsight,
  microGuidance: MicroGuidance
) {
  const firstAction = microGuidance.actions[0] ?? "Keep your next move simple.";

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
      pulse: "shadow-[0_0_26px_rgba(248,113,113,0.16)]",
      beam: "from-red-400/30 via-orange-300/20 to-transparent",
    };
  }

  if (
    awarenessLevel === "elevated" ||
    environmentLevel === "volatile" ||
    desyncLevel === "drifting" ||
    driftLevel === "elevated"
  ) {
    return {
      pageBg:
        "radial-gradient(circle at top, rgba(249,115,22,0.16), rgba(10,10,11,1) 58%)",
      orbA: "rgba(249,115,22,0.15)",
      orbB: "rgba(251,191,36,0.08)",
      card: "linear-gradient(180deg,#18120d,#0a0b0e)",
      badge: "bg-orange-500/15 text-orange-100 border-orange-400/25",
      border: "border-orange-500/20",
      pulse: "shadow-[0_0_24px_rgba(251,146,60,0.14)]",
      beam: "from-orange-400/25 via-amber-300/15 to-transparent",
    };
  }

  if (
    noSupportActive ||
    environmentLevel === "thin" ||
    awarenessLevel === "guarded" ||
    desyncLevel === "watch" ||
    driftLevel === "rising"
  ) {
    return {
      pageBg:
        "radial-gradient(circle at top, rgba(59,130,246,0.16), rgba(10,10,11,1) 58%)",
      orbA: "rgba(59,130,246,0.14)",
      orbB: "rgba(6,182,212,0.08)",
      card: "linear-gradient(180deg,#101722,#090c11)",
      badge: "bg-sky-500/15 text-sky-100 border-sky-400/25",
      border: "border-sky-500/20",
      pulse: "shadow-[0_0_24px_rgba(96,165,250,0.12)]",
      beam: "from-sky-400/25 via-cyan-300/12 to-transparent",
    };
  }

  return {
    pageBg:
      "radial-gradient(circle at top, rgba(148,163,184,0.12), rgba(10,10,11,1) 58%)",
    orbA: "rgba(148,163,184,0.10)",
    orbB: "rgba(59,130,246,0.06)",
    card: "linear-gradient(180deg,#12141a,#0a0b0e)",
    badge: "bg-white/10 text-white/85 border-white/15",
    border: "border-white/10",
    pulse: "shadow-[0_0_20px_rgba(255,255,255,0.06)]",
    beam: "from-white/10 via-slate-300/6 to-transparent",
  };
}

function getPulseDurationMs(
  heartbeatBpm: number | undefined,
  awarenessLevel: AwarenessLevel,
  environmentLevel: string,
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryInsight
) {
  if (
    desyncLevel === "separated" ||
    driftLevel === "prolonged" ||
    trajectory.riskWindow === "imminent"
  ) {
    return 800;
  }
  if (awarenessLevel === "critical") return 900;
  if (
    desyncLevel === "drifting" ||
    awarenessLevel === "elevated" ||
    driftLevel === "elevated" ||
    trajectory.riskWindow === "approaching"
  ) {
    return 1100;
  }
  if (noSupportActive) return 1700;
  if ((heartbeatBpm || 0) >= 115) return 1000;
  if ((heartbeatBpm || 0) >= 100) return 1250;
  if (environmentLevel === "supported") return 2200;
  return 1800;
}

function badgeTone(tone: MicroGuidance["tone"]) {
  if (tone === "protective")
    return "border-red-400/25 bg-red-500/10 text-red-100";
  if (tone === "supportive")
    return "border-sky-400/25 bg-sky-500/10 text-sky-100";
  return "border-white/15 bg-white/5 text-white/85";
}

function predictiveToneClasses(level: PredictiveSignal["level"]) {
  if (level === "red") {
    return "border-red-400/20 bg-red-500/10 text-red-50";
  }
  if (level === "orange") {
    return "border-orange-400/20 bg-orange-500/10 text-orange-50";
  }
  return "border-sky-400/20 bg-sky-500/10 text-sky-50";
}

/* -------------------------
   COMPONENT
--------------------------*/

export default function TwinMePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "twin",
      text: "TwinMe is now crew-aware, movement-aware, environment-aware, sync-aware, learning your rhythm over time, and able to speak up when risk rises.",
    },
  ]);

  const [input, setInput] = useState("");
  const [live, setLive] = useState<PartyLive | null>(null);
  const [crew, setCrew] = useState<CrewStatus[]>([]);
  const [spots, setSpots] = useState<SpotsSnapshot | null>(null);
  const [minutes, setMinutes] = useState(0);
  const [positionHistory, setPositionHistory] = useState<PositionPoint[]>([]);
  const [scanTick, setScanTick] = useState(false);

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Voice mode ready when you are.");
  const [speakReplies, setSpeakReplies] = useState(false);
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(true);
  const [autoVoiceLastLabel, setAutoVoiceLastLabel] = useState("idle");
  const [autoVoiceLastSpokenAt, setAutoVoiceLastSpokenAt] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const nextMessageId = useRef(2);
  const autoVoiceInitialPassRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported = !!(
      window.SpeechRecognition || window.webkitSpeechRecognition
    );
    setVoiceSupported(supported);

    const readSnapshots = () => {
      const nextLive = getLiveContext();
      const nextCrew = getCrewContext();
      const nextSpots = getSpotsContext();

      setLive(nextLive);
      setCrew(nextCrew);
      setSpots(nextSpots);
      setMinutes(getMinutesActive(nextLive));
      setScanTick((prev) => !prev);

      if (
        nextLive?.active &&
        typeof nextLive.heartbeatBpm === "number" &&
        nextLive.heartbeatBpm > 0 &&
        nextLive.heartbeatBpm < 105
      ) {
        updateBaselineSnapshot(nextLive.heartbeatBpm);
      }

      if (
        nextLive?.active &&
        typeof nextLive.latitude === "number" &&
        typeof nextLive.longitude === "number" &&
        typeof nextLive.timestamp === "string"
      ) {
        const nextPoint: PositionPoint = {
          latitude: nextLive.latitude,
          longitude: nextLive.longitude,
          timestamp: nextLive.timestamp,
        };

        setPositionHistory((prev) => {
          const last = prev[prev.length - 1];
          const isDuplicate =
            !!last &&
            last.latitude === nextPoint.latitude &&
            last.longitude === nextPoint.longitude &&
            last.timestamp === nextPoint.timestamp;

          if (isDuplicate) return prev;
          return [...prev.slice(-7), nextPoint];
        });
      }

      if (!nextLive?.active) {
        setPositionHistory([]);
      }
    };

    readSnapshots();

    const interval = window.setInterval(readSnapshots, 3000);

    return () => window.clearInterval(interval);
  }, []);

  const movementLevel = useMemo(
    () => getMovementInsight(positionHistory),
    [positionHistory]
  );

  const crewLevel = useMemo(() => getCrewInsight(crew), [crew]);
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
    updateLearningProfile(live, minutes, drift.level, noSupport.active);
  }, [live?.active, live?.heartbeatBpm, minutes, drift.level, noSupport.active]);

  const learningProfile = useMemo(() => getLearningProfile(), [scanTick, minutes]);

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

  const liveNudge = useMemo(
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

  const theme = useMemo(
    () =>
      getAmbientTheme(
        awareness.level,
        environmentLevel,
        desync.level,
        drift.level,
        noSupport.active,
        trajectory
      ),
    [
      awareness.level,
      environmentLevel,
      desync.level,
      drift.level,
      noSupport.active,
      trajectory,
    ]
  );

  const pulseMs = useMemo(
    () =>
      getPulseDurationMs(
        live?.heartbeatBpm,
        awareness.level,
        environmentLevel,
        desync.level,
        drift.level,
        noSupport.active,
        trajectory
      ),
    [
      live?.heartbeatBpm,
      awareness.level,
      environmentLevel,
      desync.level,
      drift.level,
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
        learnMe
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
    ]
  );

  const autoVoiceLabel = useMemo(() => {
    if (!live?.active) return "idle";
    if (trajectory.riskWindow === "imminent") return "imminent";
    if (desync.level === "separated") return "separated";
    if (drift.level === "prolonged") return "prolonged";
    if (awareness.level === "critical") return "critical";
    if (trajectory.riskWindow === "approaching") return "approaching";
    if (desync.level === "drifting") return "drifting";
    if (drift.level === "elevated") return "elevated";
    if (drift.level === "rising") return "rising";
    if (noSupport.active) return "no_support";
    if (awareness.level === "guarded") return "guarded";
    return "stable";
  }, [
    live,
    trajectory.riskWindow,
    desync.level,
    drift.level,
    awareness.level,
    noSupport.active,
  ]);

  useEffect(() => {
    if (!autoVoiceEnabled || typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    const message = getAutoVoiceMessage(
      live,
      awareness,
      desync.level,
      drift.level,
      noSupport.active,
      trajectory,
      microGuidance
    );

    if (!autoVoiceInitialPassRef.current) {
      autoVoiceInitialPassRef.current = true;
      setAutoVoiceLastLabel(autoVoiceLabel);
      return;
    }

    if (!message) {
      setAutoVoiceLastLabel(autoVoiceLabel);
      return;
    }

    const now = Date.now();
    const cooldownMs =
      autoVoiceLabel === "imminent" ||
      autoVoiceLabel === "separated" ||
      autoVoiceLabel === "critical"
        ? 12000
        : 20000;

    const labelChanged = autoVoiceLabel !== autoVoiceLastLabel;
    const cooldownPassed = now - autoVoiceLastSpokenAt > cooldownMs;

    if (!labelChanged && !cooldownPassed) {
      return;
    }

    speakText(message);
    setVoiceStatus(`Auto voice: ${autoVoiceLabel.replaceAll("_", " ")}`);
    setAutoVoiceLastLabel(autoVoiceLabel);
    setAutoVoiceLastSpokenAt(now);

    setMessages((prev) => {
      const nextMessage: Message = {
        id: nextMessageId.current++,
        role: "twin",
        text: message,
      };

      const last = prev[prev.length - 1];
      if (last?.role === "twin" && last.text === message) {
        return prev;
      }

      return [...prev, nextMessage];
    });
  }, [
    autoVoiceEnabled,
    autoVoiceLabel,
    autoVoiceLastLabel,
    autoVoiceLastSpokenAt,
    live,
    awareness,
    desync.level,
    drift.level,
    noSupport.active,
    trajectory,
    microGuidance,
  ]);

  const sendMessage = (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    const userMessage: Message = {
      id: nextMessageId.current++,
      role: "user",
      text: clean,
    };

    const twinReply: Message = {
      id: nextMessageId.current++,
      role: "twin",
      text: buildReply(
        clean,
        live,
        movementLevel,
        environmentLevel,
        spots,
        desync.level,
        noSupport.active,
        trajectory,
        learnMe
      ),
    };

    setMessages((prev) => [...prev, userMessage, twinReply]);
    setInput("");

    if (speakReplies) {
      speakText(twinReply.text.replace(/\n/g, " "));
    }
  };

  const startListening = () => {
    if (!voiceSupported || typeof window === "undefined") return;

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus("Listening...");
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceStatus(
        event?.error
          ? `Voice error: ${event.error}`
          : "Voice recognition ran into an issue."
      );
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus("Voice mode ready when you are.");
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }

      setInput(transcript);

      const lastIndex = event.results.length - 1;
      const lastResult = event.results[lastIndex];
      const isFinal = !!lastResult?.isFinal;

      if (isFinal && transcript.trim()) {
        sendMessage(transcript.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setVoiceStatus("Voice mode stopped.");
  };

  const speakStateCheck = () => {
    const speech = getStateCheckSpeech(
      awareness,
      liveNudge,
      microGuidance,
      noSupport.active,
      learnMe
    );
    speakText(speech);
  };

  return (
    <main
      className="min-h-screen overflow-x-hidden text-white"
      style={{ background: theme.pageBg }}
    >
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 blur-3xl"
          style={{
            background: `radial-gradient(circle at 30% 20%, ${theme.orbA}, transparent 55%), radial-gradient(circle at 70% 20%, ${theme.orbB}, transparent 50%)`,
          }}
        />
        <div
          className={`pointer-events-none absolute inset-x-[-10%] top-16 h-24 bg-gradient-to-r ${theme.beam} blur-2xl`}
          style={{
            animation:
              awareness.level === "critical"
                ? "twincoreSweep 2.6s linear infinite"
                : awareness.level === "elevated"
                ? "twincoreSweep 4.8s linear infinite"
                : "twincoreSweep 9s linear infinite",
          }}
        />

        <header className="relative mb-6">
          <div className="mb-2 text-xs tracking-[0.3em] text-white/50">
            TWINCORE
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">TwinMe</h1>
          <p className="mt-2 text-sm text-white/60">
            Crew-aware, movement-aware, environment-aware, sync-aware, learning
            your rhythm, and speaking up when pressure rises.
          </p>
        </header>

        <section
          className={`relative mb-4 overflow-hidden rounded-3xl border p-4 ${theme.border} ${theme.pulse}`}
          style={{ background: theme.card }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white/70 via-white/40 to-white/10 transition-all duration-500"
              style={{ width: `${awareness.score}%` }}
            />
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                Awareness Score
              </div>
              <div className="mt-1 text-3xl font-semibold">
                {awareness.score}
              </div>
            </div>

            <div className="text-right">
              <div
                className={`inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${theme.badge}`}
              >
                {awareness.level}
              </div>
              <div className="mt-2 text-xs text-white/50">
                {getAwarenessSummary(awareness.level)}
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-center">
            <div
              className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/5"
              style={{
                boxShadow: `0 0 0 0 rgba(255,255,255,0.08)`,
                animation: `twincorePulse ${pulseMs}ms ease-in-out infinite`,
              }}
            >
              <div
                className="absolute inset-[-10px] rounded-full border border-white/10"
                style={{
                  animation:
                    awareness.level === "critical" ||
                    trajectory.riskWindow === "imminent"
                      ? "twincoreHalo 1.5s ease-out infinite"
                      : awareness.level === "elevated"
                      ? "twincoreHalo 2.4s ease-out infinite"
                      : "twincoreHalo 4.2s ease-out infinite",
                }}
              />
              <div className="absolute inset-2 rounded-full border border-white/10" />
              <div className="text-center">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                  {live?.active ? "live" : "idle"}
                </div>
                <div className="mt-1 text-3xl font-semibold">
                  {live?.heartbeatBpm ?? "--"}
                </div>
                <div className="text-xs text-white/50">bpm</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Sync Status
              </div>
              <div className="mt-1 font-medium">{desync.level}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Internal Drift
              </div>
              <div className="mt-1 font-medium">{drift.level}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Trajectory
              </div>
              <div className="mt-1 font-medium">{trajectory.riskWindow}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Minutes Active
              </div>
              <div className="mt-1 font-medium">{minutes}</div>
            </div>
          </div>
        </section>

        <section className="mb-4 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#11141a,#0b0d11)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                Predictive Layer
              </div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {trajectory.riskWindow === "imminent"
                  ? "intervene now"
                  : trajectory.riskWindow === "approaching"
                  ? "watch closely"
                  : "stable read"}
              </div>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${theme.badge}`}
            >
              {trajectory.direction}
            </span>
          </div>

          <div className="space-y-2">
            {predictiveSignals.map((signal) => (
              <div
                key={`${signal.level}-${signal.title}`}
                className={`rounded-2xl border p-3 ${predictiveToneClasses(signal.level)}`}
              >
                <div className="text-[11px] uppercase tracking-[0.16em] opacity-80">
                  {signal.level}
                </div>
                <div className="mt-1 font-medium">{signal.title}</div>
                <p className="mt-1 text-sm leading-6 opacity-90">
                  {signal.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#11141a,#0b0d11)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                Voice Mode
              </div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {voiceSupported ? "ready" : "unsupported"}
              </div>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white/80">
              {isListening ? "listening" : "idle"}
            </span>
          </div>

          <p className="text-sm leading-6 text-white/75">{voiceStatus}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={startListening}
              disabled={!voiceSupported || isListening}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-40"
            >
              Start Listening
            </button>

            <button
              onClick={stopListening}
              disabled={!voiceSupported || !isListening}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-40"
            >
              Stop
            </button>

            <button
              onClick={speakStateCheck}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Speak State Check
            </button>

            <button
              onClick={() => setSpeakReplies((prev) => !prev)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {speakReplies ? "Speak TwinMe: On" : "Speak TwinMe: Off"}
            </button>

            <button
              onClick={() => setAutoVoiceEnabled((prev) => !prev)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {autoVoiceEnabled ? "Auto Voice: On" : "Auto Voice: Off"}
            </button>
          </div>
        </section>

        <section className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/55">
            Live Nudge
          </div>
          <p className="text-sm leading-6 text-white/80">{liveNudge}</p>
          {alert ? (
            <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-3 text-sm text-red-100">
              {alert}
            </div>
          ) : null}
        </section>

        <section className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
              Learn Me
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/80">
              {learnMe.label}
            </span>
          </div>

          <p className="text-sm leading-6 text-white/80">{learnMe.summary}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Observations
              </div>
              <div className="mt-1 font-medium">
                {learningProfile?.observations ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Avg Active BPM
              </div>
              <div className="mt-1 font-medium">
                {learningProfile?.avgActiveBpm ?? "--"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Avg Active Min
              </div>
              <div className="mt-1 font-medium">
                {learningProfile?.avgActiveMinutes ?? "--"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Escalation Minute
              </div>
              <div className="mt-1 font-medium">
                {learningProfile?.typicalEscalationMinute ?? "--"}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
              Micro-Guidance
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${badgeTone(
                microGuidance.tone
              )}`}
            >
              {microGuidance.tone}
            </span>
          </div>

          <div className="text-lg font-semibold">{microGuidance.title}</div>

          <ul className="mt-3 space-y-2 text-sm text-white/80">
            {microGuidance.actions.map((action) => (
              <li
                key={action}
                className="rounded-2xl border border-white/10 bg-black/10 px-3 py-3"
              >
                {action}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
              Crew
            </div>
            <div className="mt-1 text-lg font-semibold">{crewLevel}</div>
            <div className="mt-2 text-sm text-white/60">
              {crew.length} connected
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
              Movement
            </div>
            <div className="mt-1 text-lg font-semibold">{movementLevel}</div>
            <div className="mt-2 text-sm text-white/60">position-aware</div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
              Environment
            </div>
            <div className="mt-1 text-lg font-semibold">{environmentLevel}</div>
            <div className="mt-2 text-sm text-white/60">
              safe {spots?.safeCount ?? 0} · risk {spots?.riskCount ?? 0}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
              Support Mode
            </div>
            <div className="mt-1 text-lg font-semibold">
              {noSupport.active ? "closer" : "guided"}
            </div>
            <div className="mt-2 text-sm text-white/60">
              {noSupport.summary}
            </div>
          </div>
        </section>

        <section className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/55">
            Quick Prompts
          </div>

          <div className="flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 transition hover:bg-white/10"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-4 flex-1 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#11141a,#0b0d11)] p-4">
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/55">
            Conversation
          </div>

          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 ${
                  message.role === "twin"
                    ? "border border-white/10 bg-white/8 text-white"
                    : "ml-auto border border-sky-400/20 bg-sky-500/10 text-sky-50"
                }`}
              >
                <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                  {message.role === "twin" ? "TwinMe" : "You"}
                </div>
                <div className="whitespace-pre-wrap">{message.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="sticky bottom-0 mt-2 rounded-3xl border border-white/10 bg-[rgba(10,10,11,0.88)] p-3 backdrop-blur">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Talk to TwinMe..."
              rows={2}
              className="min-h-[56px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
            />
            <button
              onClick={() => sendMessage(input)}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Send
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-white/45">
            <Link href="/" className="transition hover:text-white/75">
              Dashboard
            </Link>
            <Link href="/party" className="transition hover:text-white/75">
              Party Mode
            </Link>
            <Link href="/crew" className="transition hover:text-white/75">
              Crew
            </Link>
            <Link href="/spots" className="transition hover:text-white/75">
              Spots
            </Link>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes twincorePulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.1);
          }
          50% {
            transform: scale(1.038);
            box-shadow: 0 0 0 18px rgba(255, 255, 255, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
        }

        @keyframes twincoreHalo {
          0% {
            opacity: 0.55;
            transform: scale(0.96);
          }
          100% {
            opacity: 0;
            transform: scale(1.22);
          }
        }

        @keyframes twincoreSweep {
          0% {
            transform: translateX(-12%);
            opacity: 0.2;
          }
          50% {
            opacity: 0.55;
          }
          100% {
            transform: translateX(12%);
            opacity: 0.2;
          }
        }
      `}</style>
    </main>
  );
}
