"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { buildTwinSignals } from "@/lib/twin/buildSignals";
import type {
  TwinContextSnapshot,
  PartyLive,
  CrewStatus,
  SpotSignal,
  ExitState,
  TwinSyncSnapshot,
} from "@/lib/twin/types";
import { buildTwinSyncSnapshot } from "@/lib/twin/buildTwinSyncSnapshot";

/* -------------------------
   TYPES
--------------------------*/

type GuidedState = {
  step: "idle" | "narrow" | "choose" | "confirm";
};

type Message = {
  id: string;
  role: "user" | "twin";
  text: string;
};

type ConversationProfile = {
  prefersShortReplies: boolean;
  needsValidationFirst: boolean;
  respondsToDirectTone: boolean;
  loopTendency: number;
  reassuranceSeeking: number;
  shutdownTendency: number;
  lastMode?: "venting" | "decision" | "shutdown" | "risk" | "reflective" | "neutral";
  updatedAt?: string;
};

type CrewCollapseInsight = {
  level: "stable" | "thinning" | "collapsing";
  summary: string;
  activeNow: number;
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

type TrajectoryState = {
  direction: TrajectoryDirection;
  riskWindow: TrajectoryRiskWindow;
  summary: string;
};

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
  level: TrajectoryLevel;
  reason: string;
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

type TwinMemory = {
  lowEnergyCount: number;
  overwhelmCount: number;
  uncertaintyCount: number;
  lastThemes: string[];
  updatedAt?: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
    __twinLoopCount?: number;
    __twinEmotionalCarry?: number;
    __twinRiskCount?: number;
    __twinUnansweredCount?: number;
    __twinFakeCompliance?: number;
    __twinStallingCount?: number;
    __twinPendingAction?: string;
    __twinPendingActionTurns?: number;
    __twinFollowUpStage?: number;
    __twinUserProfile?: {
      decisiveness: number;
      resistance: number;
      sensitivity: number;
    };
  }
}

type AdaptiveGuidanceProfile = {
  prefersDirect: number;
  prefersGentle: number;
  respondsToShortPrompts: number;
  respondsToValidation: number;
  shutsDownWhenPressed: number;
  followsThroughAfterDirectPrompt: number;
  followsThroughAfterGentlePrompt: number;
  updatedAt?: string;
};

/* -------------------------
   STORAGE KEYS
--------------------------*/

const TWINCORE_BASELINE_KEY = "twincore_internal_baseline";
const TWINCORE_LEARNING_KEY = "twincore_learning_profile";
const TWINCORE_MESSAGES_KEY = "twincore_twinme_messages";
const TWINCORE_POSITION_HISTORY_KEY = "twincore_position_history";
const TWINCORE_PROFILE_KEY = "twincore_profile";
const TWINCORE_MEMORY_KEY = "twincore_twinme_memory";
const TWINCORE_CONVERSATION_PROFILE_KEY = "twincore_conversation_profile";
const TWINCORE_LAST_RESPONSES_KEY = "twincore_last_responses";

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
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

function getTwinMemory(): TwinMemory | null {
  return readJson<TwinMemory | null>(TWINCORE_MEMORY_KEY, null);
}

function getLastResponses(): string[] {
  return readJson<string[]>(TWINCORE_LAST_RESPONSES_KEY, []);
}

function pushLastResponse(text: string) {
  const existing = getLastResponses();
  const next = [...existing, text].slice(-3); // keep last 3
  writeJson(TWINCORE_LAST_RESPONSES_KEY, next);
}

function updateTwinMemory(latestText: string): void {
  const text = latestText.trim().toLowerCase();
  if (!text) return;

  const existing: TwinMemory =
    getTwinMemory() ?? {
      lowEnergyCount: 0,
      overwhelmCount: 0,
      uncertaintyCount: 0,
      lastThemes: [],
    };

  let nextThemes = [...existing.lastThemes];

  const pushTheme = (theme: string) => {
    nextThemes = [...nextThemes.filter((t) => t !== theme), theme].slice(-5);
  };

  let lowEnergyCount = existing.lowEnergyCount;
  let overwhelmCount = existing.overwhelmCount;
  let uncertaintyCount = existing.uncertaintyCount;

  if (
    ["tired", "exhausted", "drained", "burnt out", "low energy"].some((word) =>
      text.includes(word)
    )
  ) {
    lowEnergyCount += 1;
    pushTheme("low_energy");
  }

  if (
    ["overwhelmed", "too much", "pressure", "responsibilities", "heavy"].some(
      (word) => text.includes(word)
    )
  ) {
    overwhelmCount += 1;
    pushTheme("overwhelm");
  }

  if (
    ["i don't know", "i do not know", "unsure", "any suggestions"].some((word) =>
      text.includes(word)
    )
  ) {
    uncertaintyCount += 1;
    pushTheme("uncertainty");
  }

  const nextMemory: TwinMemory = {
    lowEnergyCount,
    overwhelmCount,
    uncertaintyCount,
    lastThemes: nextThemes,
    updatedAt: new Date().toISOString(),
  };

  writeJson(TWINCORE_MEMORY_KEY, nextMemory);
}

function getConversationProfile(): ConversationProfile | null {
  return readJson<ConversationProfile | null>(
    TWINCORE_CONVERSATION_PROFILE_KEY,
    null
  );
}

function updateConversationProfile(latestText: string): void {
  const text = latestText.trim().toLowerCase();
  if (!text) return;

  const existing: ConversationProfile =
    getConversationProfile() ?? {
      prefersShortReplies: false,
      needsValidationFirst: false,
      respondsToDirectTone: false,
      loopTendency: 0,
      reassuranceSeeking: 0,
      shutdownTendency: 0,
      lastMode: "neutral",
    };

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const isShort = wordCount <= 4;
  const isShutdownLike = ["ok", "okay", "fine", "idk", "whatever", "k", "sure"].includes(text);
  const isReassuranceSeeking =
    text.includes("am i okay") ||
    text.includes("am i good") ||
    text.includes("is this okay");

  const isEmotional =
    text.includes("hate") ||
    text.includes("annoy") ||
    text.includes("frustrat") ||
    text.includes("sucks") ||
    text.includes("pissed");

  const isDecision =
    text.includes("should i") ||
    text.includes("what should i do") ||
    text.includes("what do i do");

  let lastMode: ConversationProfile["lastMode"] = "neutral";

  if (isShutdownLike) lastMode = "shutdown";
  else if (isEmotional) lastMode = "venting";
  else if (isDecision) lastMode = "decision";
  else if (text.includes("drive") || text.includes("alone")) lastMode = "risk";
  else if (text.includes("feel") || text.includes("thinking")) lastMode = "reflective";

  const nextProfile: ConversationProfile = {
    prefersShortReplies: existing.prefersShortReplies || isShort,
    needsValidationFirst: existing.needsValidationFirst || isEmotional,
    respondsToDirectTone:
      existing.respondsToDirectTone || isDecision || isShutdownLike,
    loopTendency: existing.loopTendency + (isShutdownLike ? 1 : 0),
    reassuranceSeeking:
      existing.reassuranceSeeking + (isReassuranceSeeking ? 1 : 0),
    shutdownTendency: existing.shutdownTendency + (isShutdownLike ? 1 : 0),
    lastMode,
    updatedAt: new Date().toISOString(),
  };

  writeJson(TWINCORE_CONVERSATION_PROFILE_KEY, nextProfile);
}

/* -------------------------
   ADAPTIVE GUIDANCE 
--------------------------*/
 const TWINCORE_ADAPTIVE_GUIDANCE_KEY = "twincore_adaptive_guidance";

function getAdaptiveGuidanceProfile(): AdaptiveGuidanceProfile {
  return readJson<AdaptiveGuidanceProfile>(TWINCORE_ADAPTIVE_GUIDANCE_KEY, {
    prefersDirect: 0,
    prefersGentle: 0,
    respondsToShortPrompts: 0,
    respondsToValidation: 0,
    shutsDownWhenPressed: 0,
    followsThroughAfterDirectPrompt: 0,
    followsThroughAfterGentlePrompt: 0,
  });
}

function updateAdaptiveGuidanceProfile(update: Partial<AdaptiveGuidanceProfile>) {
  const existing = getAdaptiveGuidanceProfile();

  const next = {
    ...existing,
    ...update,
    updatedAt: new Date().toISOString(),
  };

  writeJson(TWINCORE_ADAPTIVE_GUIDANCE_KEY, next);
}

function getBestGuidanceMode({
  awareness,
  resistance,
  sensitivity,
  adaptiveProfile,
}: {
  awareness: { score: number; level: string };
  resistance: number;
  sensitivity: number;
  adaptiveProfile: AdaptiveGuidanceProfile;
}) {
  // simple v1 logic (you can refine later)
  if (adaptiveProfile.followsThroughAfterDirectPrompt > adaptiveProfile.followsThroughAfterGentlePrompt) {
    return "direct";
  }

  if (sensitivity > 3 || adaptiveProfile.shutsDownWhenPressed > 2) {
    return "gentle";
  }

  if (resistance > 3) {
    return "firm";
  }

  return "balanced";
}


/* -------------------------
   DATA LOADERS
--------------------------*/

async function getRealCrewContext(displayName: string): Promise<CrewStatus[]> {
  if (!displayName || !supabase) return [];

  try {
    const joinedRaw = window.localStorage.getItem("twincore_joined_crew");
    const joined = joinedRaw ? (JSON.parse(joinedRaw) as { crewOwner?: string }) : {};
    const owner = joined.crewOwner?.trim() || displayName;

    const { data: members, error: memberError } = await supabase
      .from("crew_members")
      .select("crew_owner, member_name")
      .eq("crew_owner", owner);

    if (memberError) return [];

    const names = new Set<string>();
    names.add(owner);

    (members || []).forEach((member: { member_name?: string | null }) => {
      const memberName = member.member_name?.trim();
      if (memberName) names.add(memberName);
    });

    const list = Array.from(names);

    if (!list.length) return [];

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
  return getRealCrewContext(displayName);
}

function getSpotsContext(): SpotsSnapshot | null {
  return readJson<SpotsSnapshot | null>("twincore_spots_snapshot", null);
}

function getPositionHistory(): PositionPoint[] {
  return readJson<PositionPoint[]>(TWINCORE_POSITION_HISTORY_KEY, []);
}

function updatePositionHistory(live: PartyLive | null): void {
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

function getDisplayName(): string {
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

function updateBaselineSnapshot(currentBpm: number): void {
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
  trajectory.level !== "low"
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

function getTrajectoryLevel(
  live: PartyLive | null,
  minutes: number,
  movementLevel: string,
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel
): TrajectoryState {
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
  trajectory: TrajectoryState
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
      title: "Slow It Down",
      tone: "protective",
      actions: [
        "Pause before making another move.",
        "Stay visible and keep your next step simple.",
        "Reconnect with someone you trust.",
      ],
    };
  }

  if (noSupportActive || desyncLevel === "separated") {
    return {
      title: "Re-Anchor",
      tone: "protective",
      actions: [
        "Get back near support.",
        "Avoid leaving alone.",
        "Send a quick check-in to someone you trust.",
      ],
    };
  }

  if (driftLevel === "prolonged" || movementLevel === "drifting") {
    return {
      title: "Reset Your Pace",
      tone: "steady",
      actions: [
        "Slow down before deciding anything.",
        "Choose one clear next step.",
        "Avoid adding more stimulation right now.",
      ],
    };
  }

  if (environmentLevel === "unsafe" || environmentLevel === "volatile") {
    return {
      title: "Stay Aware",
      tone: "protective",
      actions: [
        "Move toward a safer, more visible area.",
        "Keep your phone accessible.",
        "Do not separate from trusted people.",
      ],
    };
  }

  return {
    title: "Stay Steady",
    tone: "steady",
    actions: [
      "Check what your body is telling you.",
      "Keep your next move intentional.",
      "Stay connected to your surroundings.",
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
  trajectory: TrajectoryState
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
  trajectory: TrajectoryState
) {
  if (!live?.active) {
    return "TwinMe is standing by. Turn Party Mode on when your night starts moving.";
  }

  if (trajectory.riskWindow === "imminent") {
    return "If you continue at this pace, you're about to enter a high-risk state. Slow down now and stabilize your position.";
  }

  if (trajectory.riskWindow === "approaching") {
    return "You're trending toward a higher-risk state. Stay intentional with your next few moves.";
  }

  if (noSupportActive && driftLevel === "prolonged") {
    return "You have been elevated for a while and you do not have active support around you. Let's slow this moment down and keep your next move simple.";
  }

  if (noSupportActive && environmentLevel === "unsafe") {
    return "You do not have crew or visible support around you right now. Stay grounded, reduce movement, and choose the safest nearby option.";
  }

  if (noSupportActive) {
    return "I'm staying closer with you right now. Keep your movement simple, stay aware of your surroundings, and do not let the moment rush you.";
  }

  if (desyncLevel === "separated") {
    return "You are clearly out of sync with your crew. Slow down, reduce movement, and reconnect before you go deeper into the night.";
  }

  if (desyncLevel === "drifting") {
    return "You're drifting away from your crew's pace or position. Regroup before the gap gets wider.";
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
    return "You're drifting across positions. Pause and re-orient before your next move.";
  }

  if (
    movementLevel === "moving" &&
    (live.status === "Drinking" || live.status === "At club")
  ) {
    return "You're moving while in a high-energy state. Slow the pace down and stay with your people.";
  }

  if (movementLevel === "moving") {
    return "You're actively moving. Keep your next stop intentional, not random.";
  }

  if (live.status === "Drinking" || live.status === "At club") {
    if (minutes < 10) return "Energy is rising. Stay close to your people.";
    if (minutes < 25) return "You've been active for a while. Check your crew position.";
    if (minutes < 45) return "High-risk window. Stay with your group and slow decisions.";
    return "You've been out for a while. Start shifting toward a steadier pace now.";
  }

  return "You look fairly steady right now. Protect that by keeping your next move simple.";
}
// ==========================
// VOICE STATE ENGINE
// ==========================

type VoiceState = "calm" | "reflective" | "direct" | "protective";

function getVoiceState({
  awareness,
  loopCount,
  unanswered,
  profileMode,
}: {
  awareness: number;
  loopCount: number;
  unanswered: number;
  profileMode: ConversationProfile["lastMode"];
}): VoiceState {
  if (awareness >= 75) return "protective";
  if (loopCount >= 3) return "direct";
  if (unanswered >= 2) return "direct";
  if (profileMode === "venting") return "reflective";
  return "calm";
}

function compressForCritical(
  message: string,
  awareness: { score: number; level: AwarenessLevel }
) {
  if (awareness.level !== "critical") return message;

  const sentences = message.split(".").map((s) => s.trim()).filter(Boolean);

  let short = sentences[0] || message;

  short = short
    .replace("You are", "")
    .replace("You're", "")
    .replace("You have been", "")
    .replace("Try to", "")
    .replace("Let's", "")
    .trim();

  if (!short.endsWith(".")) short += ".";

  return short;
}


/* -------------------------
   RISK OVERRIDE
--------------------------*/

function handleRiskOverride({
  soundsRisky,
  isDriveRisk,
  contextRiskScore,
  riskReasonText,
  live,
  shapeTone,
}: {
  soundsRisky: boolean;
  isDriveRisk: boolean;
  contextRiskScore: number;
  riskReasonText: string;
  live: PartyLive | null;
  shapeTone: (msg: string) => string;
}) {
  if (!soundsRisky) return null;

  if (isDriveRisk && live?.status === "Drinking") {
    return shapeTone(
      `Stop. Do not drive in this state. You're ${riskReasonText} right now.`
    );
  }

  if (contextRiskScore >= 10) {
    return shapeTone(
      `Stop. This is a high-risk move because you're ${riskReasonText}. Do not do it.`
    );
  }

  if (contextRiskScore >= 7) {
    return shapeTone(
      `No. That move carries too much risk because you're ${riskReasonText}.`
    );
  }

  return shapeTone(
    `Pause. That could add risk right now because you're ${riskReasonText}.`
  );
}

/* -------------------------
   ACTION FLOW
--------------------------*/

function handleActionFlow({
  pendingAction,
  pendingActionTurns,
  followUpStage,
  latestText,
  toneByAwareness,
  shapeTone,
}: {
  pendingAction: string;
  pendingActionTurns: number;
  followUpStage: number;
  latestText: string;
  toneByAwareness: (
    low: string[],
    guarded?: string[],
    elevated?: string[],
    critical?: string[]
  ) => string;
  shapeTone: (message: string) => string;
}) {
  const completedAction =
    latestText.includes("i did") ||
    latestText.includes("done") ||
    latestText.includes("i'm home") ||
    latestText.includes("im home") ||
    latestText.includes("i left") ||
    latestText.includes("i called") ||
    latestText.includes("i texted") ||
    latestText.includes("on my way") ||
    latestText.includes("heading now");

  if (pendingAction && completedAction) {
    window.__twinPendingAction = "";
    window.__twinPendingActionTurns = 0;
    window.__twinFollowUpStage = 0;

    return shapeTone(
      toneByAwareness([
        "Good. Stay with that.",
        "That works. Keep it steady.",
        "Good move. Hold it.",
        "Nice. Keep it clean.",
      ])
    );
  }

  const contradictionTriggered =
    !!pendingAction &&
    pendingActionTurns <= 3 &&
    (
      latestText.includes("actually") ||
      latestText.startsWith("maybe") ||
      latestText.includes("never mind") ||
      latestText.includes("not sure") ||
      latestText.includes("i don't know")
    );

  if (contradictionTriggered) {
    return shapeTone(
      toneByAwareness(
        ["You already chose a direction. What changed?"],
        ["You're stepping off a clean move. Why?"],
        ["Don't drift now. What changed?"],
        ["No. You already chose. What changed?"]
      )
    );
  }

  if (pendingAction && pendingActionTurns <= 3) {
    if (followUpStage === 1) {
      return shapeTone(
        toneByAwareness(["You said you'd do it. What's next?"])
      );
    }

    if (followUpStage === 2) {
      return shapeTone(
        toneByAwareness(["You're hesitating. What's blocking it?"])
      );
    }

    if (followUpStage >= 3) {
      return shapeTone(
        toneByAwareness(["Enough circling. Act."])
      );
    }
  }

  return null;
}

/* -------------------------
   GENERATE RESPONSE (partial safety fixes)
--------------------------*/

function generateTwinResponse({
  input,
  messages,
  displayName,
  twinSignals,
  twinSyncSnapshot,
  environmentLevel,
  movementLevel,
  live,
  awareness,
  desync,
  noSupport,
  crewCollapse,
  spots,
}: {
  input: string;
  messages: Message[];
  displayName: string;
  twinSignals: TwinSignals;
  twinSyncSnapshot: TwinSyncSnapshot;
  environmentLevel: string;
  movementLevel: string;
  live: PartyLive | null;
  awareness: { score: number; level: AwarenessLevel };
  desync: { level: DesyncLevel };
  noSupport: { active: boolean };
  crewCollapse: CrewCollapseInsight;
  spots: SpotsSnapshot | null;
}) {

  function safeNumber(val: number | undefined) {
    return typeof val === "number" && !isNaN(val) ? val : 0;
  }

  function getWindowNumber(key: keyof Window, fallback = 0) {
    const val = window[key] as number | undefined;
    return safeNumber(val ?? fallback);
  }

  const latestText = input.toLowerCase();
  const contextText = input.toLowerCase();

  const normalizedText = latestText
  .replace(/[^\w\s]/g, "")
  .replace(/\s+/g, " ")
  .trim();

// INTENT: SPOTS / WHERE TO GO
const isSpotRequest =
  latestText.includes("spot") ||
  latestText.includes("where") ||
  latestText.includes("go") ||
  latestText.includes("place");

if (isSpotRequest) {
  if (awareness.level === "critical") {
    return shapeTone(
      "Not the time to explore. Move toward a safe, known place first."
    );
  }

  if (awareness.level === "elevated") {
    return shapeTone(
      "Keep it simple—pick a familiar, low-pressure spot. Somewhere visible, not crowded."
    );
  }

  return shapeTone(
    "Look for somewhere steady—good lighting, people around, nothing chaotic."
  );
}

  const awarenessSignal = twinSignals.awareness;
  const trajectory = twinSignals.trajectory;
  const drift = twinSignals.drift;

  const learnMe = twinSignals.learnMe ?? {
    label: "learning",
    summary: "TwinMe is still learning your rhythm.",
  };

  const partySync = twinSyncSnapshot.party;
  const crewSync = twinSyncSnapshot.crew;
  const spotSync = twinSyncSnapshot.spots;
  const exitSync = twinSyncSnapshot.exit;
 
  const userProfile = window.__twinUserProfile || {
    decisiveness: 0,
    resistance: 0,
    sensitivity: 0,
  };

  const conversationProfile = getConversationProfile();
  const profileMode = conversationProfile?.lastMode ?? "neutral";

const adaptiveProfile = getAdaptiveGuidanceProfile();

const guidanceMode = getBestGuidanceMode({
  awareness,
  resistance: userProfile.resistance,
  sensitivity: userProfile.sensitivity,
  adaptiveProfile,
});

  const memory = getTwinMemory();

 
  const userLines = input
    .split("\n")
    .filter((line) => line.toLowerCase().startsWith("user:"))
    .map((line) => line.replace(/^user:\s*/i, "").toLowerCase());

  const recentUserText = userLines.slice(-4).join(" ");

  const emotionalCarry = getWindowNumber("__twinEmotionalCarry", 0);
  const unanswered = getWindowNumber("__twinUnansweredCount", 0);

  const hasRecentEmotionalPressure =
    emotionalCarry > 0 ||
    recentUserText.includes("stress") ||
    recentUserText.includes("stressed") ||
    recentUserText.includes("tired") ||
    recentUserText.includes("overwhelmed") ||
    recentUserText.includes("frustrat") ||
    recentUserText.includes("annoy") ||
    recentUserText.includes("pissed") ||
    recentUserText.includes("hate");

  const isMaskingEmotion =
    latestText.includes("i'm fine") ||
    latestText.includes("im fine") ||
    latestText.includes("i am fine") ||
    latestText.includes("it's whatever") ||
    latestText.includes("its whatever") ||
    latestText.includes("i'm good") ||
    latestText.includes("im good") ||
    latestText.includes("i am good") ||
    latestText.includes("doesn't matter") ||
    latestText.includes("doesnt matter") ||
    latestText.includes("it's nothing") ||
    latestText.includes("its nothing") ||
    latestText.trim() === "whatever";

  const maskingSeverity =
    isMaskingEmotion && hasRecentEmotionalPressure
      ? awarenessSignal?.level === "critical"
        ? "high"
        : awareness.level === "elevated"
          ? "medium"
          : "low"
      : null;

  const isActionCommitment =
    latestText.includes("i will") ||
    latestText.includes("i'm going to") ||
    latestText.includes("i am going to") ||
    latestText.includes("i'll") ||
    latestText.includes("heading") ||
    latestText.includes("going now");

 const isLooping =
  normalizedText === "maybe" ||
  matches("uncertain");

  function matches(type: "uncertain" | "decision" | "emotion" | "stall") {
  const map = {
    uncertain: [
      "i dont know",
      "idk",
      "not sure",
      "unsure",
      "any suggestions",
    ],
    decision: [
      "should i",
      "what should i do",
      "what do i do",
    ],
    emotion: [
      "tired",
      "overwhelmed",
      "stressed",
      "frustrated",
      "pissed",
      "annoyed",
    ],
    stall: [
      "ok",
      "okay",
      "fine",
      "k",
      "whatever",
      "sure",
    ],
  };

  return map[type].some((phrase) =>
    normalizedText.includes(phrase)
  );
}

  const isCompliance =
    ["ok", "okay", "got it", "alright", "fine", "k"].includes(
      latestText.trim()
    );

  const loopCount = (() => {
    const lastFew = userLines.slice(-3);
    let repeats = 0;

    for (let i = 1; i < lastFew.length; i++) {
      if (lastFew[i] === lastFew[i - 1]) {
        repeats++;
      }
    }

    return repeats;
  })();

  let adjustedLoopCount = loopCount;
  let adjustedUnanswered = unanswered;

  if (isCompliance) {
    adjustedLoopCount = 0;
    adjustedUnanswered = 0;
  }

  let fakeComplianceCount = getWindowNumber("__twinFakeCompliance", 0);

  if (isCompliance && !isActionCommitment) {
    fakeComplianceCount += 1;
  } else {
    fakeComplianceCount = 0;
  }

  window.__twinFakeCompliance = fakeComplianceCount;

  const isStalling =
    isCompliance ||
    latestText.startsWith("maybe") ||
    latestText.includes("maybe i'll") ||
    latestText.includes("i don't know") ||
    latestText.includes("i do not know") ||
    latestText.includes("any suggestions") ||
    latestText.includes("what do you think") ||
    latestText.includes("not sure");

  let stallingCount = getWindowNumber("__twinStallingCount", 0);

  if (isStalling && !isActionCommitment) {
    stallingCount += 1;
  } else {
    stallingCount = 0;
  }

  window.__twinStallingCount = stallingCount;

  let pendingAction = window.__twinPendingAction || "";
  let pendingActionTurns = getWindowNumber("__twinPendingActionTurns", 0);

  const actionCommitmentPhrases = [
    "i will",
    "i'm going to",
    "i am going to",
    "i'll",
    "heading",
    "going now",
    "i'm leaving",
    "i am leaving",
    "i'm going home",
    "i am going home",
    "i'll go home",
    "i will go home",
    "i'll stay",
    "i will stay",
    "i'll call",
    "i will call",
    "i'll text",
    "i will text",
  ];

  const committedAction =
    actionCommitmentPhrases.find((phrase) => latestText.includes(phrase)) || null;

  if (committedAction) {
    pendingAction = latestText;
    pendingActionTurns = 0;
  } else if (pendingAction) {
    pendingActionTurns += 1;
  }

  const contradictionTriggered =
    !!pendingAction &&
    pendingActionTurns <= 3 &&
    (
      latestText.includes("actually") ||
      latestText.startsWith("maybe") ||
      latestText.includes("maybe i'll") ||
      latestText.includes("never mind") ||
      latestText.includes("maybe not") ||
      latestText.includes("still here") ||
      latestText.includes("i don't know") ||
      latestText.includes("not sure")
    );

  const hesitationSignals =
    latestText.includes("hold on") ||
    latestText.includes("wait") ||
    latestText.includes("one sec") ||
    latestText.includes("just a sec") ||
    latestText.includes("give me a second") ||
    latestText.includes("thinking") ||
    latestText.includes("lemme think");

  const indecisionSignals =
    latestText === "maybe" ||
    latestText.includes("i don't know") ||
    latestText.includes("not sure") ||
    latestText.includes("unsure");

  const isHesitating = hesitationSignals && !!pendingAction;
  const isIndecisive = indecisionSignals && !pendingAction;

  let followUpStage = getWindowNumber("__twinFollowUpStage", 0);

  if (pendingAction) {
    followUpStage += 1;
  } else {
    followUpStage = 0;
  }

  const voiceState = getVoiceState({
   awareness: awarenessSignal?.score ?? 0,
    loopCount: adjustedLoopCount,
    unanswered: adjustedUnanswered,
    profileMode,
  });

// ==========================
  // PROFILE ADJUSTMENTS
  // ==========================

  if (isActionCommitment) {
    userProfile.decisiveness += 1;
  }

  if (isLooping) {
  userProfile.decisiveness -= 1;
}

  if (contradictionTriggered) {
    userProfile.resistance += 1;
  }

  if (hasRecentEmotionalPressure) {
    userProfile.sensitivity += 1;
  }

// LEARNING SIGNALS

// If user commits to action → direct worked
if (isActionCommitment) {
  updateAdaptiveGuidanceProfile({
    prefersDirect: (adaptiveProfile.prefersDirect || 0) + 1,
    followsThroughAfterDirectPrompt:
      (adaptiveProfile.followsThroughAfterDirectPrompt || 0) + 1,
  });
}

// If user keeps looping → current tone didn't break it
if (isLooping) {
  updateAdaptiveGuidanceProfile({
    shutsDownWhenPressed:
      (adaptiveProfile.shutsDownWhenPressed || 0) + 1,
  });
}

// If emotional pressure + user continues talking → gentle worked
if (hasRecentEmotionalPressure && !isLooping) {
  updateAdaptiveGuidanceProfile({
    prefersGentle: (adaptiveProfile.prefersGentle || 0) + 1,
    respondsToValidation:
      (adaptiveProfile.respondsToValidation || 0) + 1,
  });
}

  userProfile.decisiveness = Math.max(-5, Math.min(5, userProfile.decisiveness));
  userProfile.resistance = Math.max(-5, Math.min(5, userProfile.resistance));
  userProfile.sensitivity = Math.max(-5, Math.min(5, userProfile.sensitivity));

  window.__twinUserProfile = userProfile;
  window.__twinPendingAction = pendingAction;
  window.__twinPendingActionTurns = pendingActionTurns;
  window.__twinFollowUpStage = followUpStage;

  const lastTwinMessage =
    input
      .split("\n")
      .reverse()
      .find((line) => line.toLowerCase().startsWith("twinme:")) || "";

  const lastTwinLower = lastTwinMessage.toLowerCase();

  function shapeTone(base: string, awareness: { level: AwarenessLevel }) {
  if (awareness.level === "critical") {
    return base.replace(/\.$/, "") + ". Keep it tight.";
  }

    if (trajectory.riskWindow === "imminent") {
      return base.replace(/\.$/, "") + ". Stay controlled.";
    }

    if (twinSyncSnapshot.desync?.level === "separated") {
      return base.replace(/\.$/, "") + ". Don’t drift further.";
    }

    return base;
  }

  function pickNonRepeating(options: string[]) {
  const lastResponses = getLastResponses();

  const filtered = options.filter(
    (opt) =>
      !lastResponses.some((prev) =>
        prev.toLowerCase().includes(opt.slice(0, 15).toLowerCase())
      )
  );

  const choice =
    filtered.length > 0
      ? filtered[Math.floor(Math.random() * filtered.length)]
      : options[Math.floor(Math.random() * options.length)];

  pushLastResponse(choice);

  return choice;
}

function avoidRepeat(base: string) {
  const last = lastTwinLower || "";
  if (last.includes(base.slice(0, 15).toLowerCase())) {
    return null;
  }
  return base;
}

  function toneByAwareness(
    lowOptions: string[],
    guardedOptions?: string[],
    elevatedOptions?: string[],
    criticalOptions?: string[]
  ) {
    if (awarenessSignal?.level === "critical" && criticalOptions?.length) {
      return pickNonRepeating(criticalOptions);
    }

     if (awarenessSignal?.level === "elevated" && elevatedOptions?.length) {
      return pickNonRepeating(elevatedOptions);
    }

    if (awarenessSignal?.level === "guarded" && guardedOptions?.length) {
      return pickNonRepeating(guardedOptions);
    }

    return pickNonRepeating(lowOptions);
  }

  function getConfidenceLevel() {
  if (userProfile.decisiveness > 2) return "high";
  if (userProfile.resistance > 3) return "force";
  return "normal";
}

const intentMap = {
  tired: ["tired", "exhausted", "drained", "low energy", "burnt out"],
  uncertain:  [ "i dont know", "i don't know","i do not know", "idk", "any suggestions", "unsure"],
  help: ["help", "need help", "assist"],
  reassurance: ["am i good", "am i okay"],
  direction: ["what should i do", "what now", "next move"],
  existential: ["life", "everything feels off", "what's the point"],
  decision: [ "should i", "what should i do", "what do i do", ],
};

let intent = "default";

for (const [key, keywords] of Object.entries(intentMap)) {
  if (keywords.some((word) => latestText.includes(word))) {
    intent = key;
    break;
  }
}

// HIGH RISK OVERRIDE
if (trajectory.riskWindow === "imminent") {
  return shapeTone(
    "Stay with me for a second. Things are stacking right now. Slow your next move down on purpose."
  );
}

if (twinSyncSnapshot.crewCollapse?.level === "collapsing") {
  return shapeTone(
    "Your support layer is dropping. Don't move like you still have coverage—re-anchor first."
  );
}

if (twinSyncSnapshot.desync?.level === "separated") {
  return shapeTone(
    "You're out of sync right now. Before anything else, reconnect."
  );
}

if (twinSyncSnapshot.noSupport?.active) {
  return shapeTone(
    "You don't have strong support around you right now. Keep your next move simple and visible."
  );
}

// DRINKING
if (live?.status === "Drinking" && (awarenessSignal?.score ?? 0) > 65) {
  return shapeTone(
    "Your awareness is dropping while you're drinking. Slow this down before it compounds."
  );
}

if (environmentLevel === "unsafe" || spots?.selectedTone === "risk") {
  return shapeTone(
    "This environment isn't stable. Shift to a safer, more visible area."
  );
}

if (drift?.level === "prolonged") {
  return shapeTone(
    "You've been elevated for a while. This is where things usually start slipping. Slow this moment down."
  );
}

// EMOTIONAL OVERRIDE
const emotionalTriggers = [
  "hate",
  "annoy",
  "annoying",
  "frustrat",
  "this sucks",
  "sucks",
  "irritat",
  "pissed",
  "over it",
];

const isEmotional = emotionalTriggers.some((word) =>
  latestText.includes(word)
);

if (isEmotional) {
  return toneByAwareness(
    [
      "Yeah… that feeling matters. What's making it hit like this right now?",
      "I hear that. What part of this is getting to you the most?",
    ],
    [
      "That frustration is real. What's underneath it right now?",
      "Something about this is off. What's bothering you most?",
    ],
    [
      "Pause. That reaction matters. What's actually hitting you right now?",
      "Don't ignore that feeling. What's causing it?",
    ],
    [
      "Stop. That feeling is important. What's driving it right now?",
      "Hold on. That reaction means something. What's triggering it?",
    ]
  );
}

if (intent === "uncertain") {
  const options = [
    "Let's narrow it down. Do you need rest, clarity, or movement right now?",
    "We don't need the full answer yet. What feels most off — your energy, your direction, or your environment?",
    "Start smaller. What's the one thing that feels unclear right now?",
  ].filter((opt) => !lastTwinLower.includes(opt.slice(0, 20).toLowerCase()));

  return options[Math.floor(Math.random() * options.length)] || options[0];
}

if (intent === "tired" && !pendingAction) {
  return "Then don't force direction. Your next move is recovery, not pressure.";
}

if (intent === "existential") {
  return "Life feels heavy when it's unclear. What part of it feels most off right now?";
}

const actionWords = [
  "go",
  "walk",
  "rest",
  "sleep",
  "pause",
  "call",
  "text",
  "eat",
  "drink water",
  "shower",
  "leave",
  "stay in",
  "go outside",
  "take a break",
];

const soundsLikeAction = actionWords.some((word) =>
  latestText.includes(word)
);

const soundsRisky =
  latestText.includes("drive") ||
  latestText.includes("driving") ||
  latestText.includes("drunk") ||
  latestText.includes("drive home") ||
  latestText.includes("driving home") ||
  latestText.includes("go alone") ||
  latestText.includes("leave alone") ||
  latestText.includes("walk alone") ||
  latestText.includes("go with him") ||
  latestText.includes("go with them") ||
  latestText.includes("stranger") ||
  latestText.includes("drink more") ||
  latestText.includes("another drink") ||
  latestText.includes("keep drinking") ||
  latestText.includes("keep partying");

let contextRiskScore = 0;

if (live?.active) contextRiskScore += 1;

if (live?.status === "Drinking") contextRiskScore += 3;
else if (live?.status === "At club") contextRiskScore += 2;

if (awarenessSignal?.level === "critical") contextRiskScore += 3;
else if (awarenessSignal?.level === "elevated") contextRiskScore += 2;
else if (awarenessSignal?.level === "guarded") contextRiskScore += 1;

if (trajectory.riskWindow === "imminent") contextRiskScore += 3;
else if (trajectory.riskWindow === "approaching") contextRiskScore += 1;

if (twinSyncSnapshot.desync?.level === "separated") contextRiskScore += 2;
else if (twinSyncSnapshot.desync?.level === "drifting") contextRiskScore += 1;

if (drift?.level === "prolonged") contextRiskScore += 2;
else if (drift.level === "elevated") contextRiskScore += 1;

if (twinSyncSnapshot.noSupport?.active) contextRiskScore += 2;

const isDriveRisk =
  latestText.includes("drive") ||
  latestText.includes("driving") ||
  latestText.includes("drive home") ||
  latestText.includes("driving home");

const isAloneRisk =
  latestText.includes("go alone") ||
  latestText.includes("leave alone") ||
  latestText.includes("walk alone");

const isStrangerRisk =
  latestText.includes("stranger") ||
  latestText.includes("go with him") ||
  latestText.includes("go with them");

if (isDriveRisk && live?.status === "Drinking") contextRiskScore += 4;
if (isDriveRisk && awarenessSignal?.level === "critical") contextRiskScore += 2;

if (isAloneRisk && twinSyncSnapshot.noSupport?.active) contextRiskScore += 3;
if (isAloneRisk && twinSyncSnapshot.desync?.level === "separated") contextRiskScore += 2;

if (isStrangerRisk && awarenessSignal?.level !== "low") contextRiskScore += 3;

const riskReasons: string[] = [];

if (live?.active) riskReasons.push("active");
if (live?.status === "Drinking") riskReasons.push("drinking");
if (live?.status === "At club") riskReasons.push("in a high-energy setting");

if (awarenessSignal?.level === "critical") riskReasons.push("already in a critical state");
else if (awarenessSignal?.level === "elevated") riskReasons.push("already elevated");
else if (awarenessSignal?.level === "guarded") riskReasons.push("already under pressure");

if (twinSyncSnapshot.noSupport?.active) riskReasons.push("low on support");
if (twinSyncSnapshot.desync?.level === "separated") riskReasons.push("out of sync");
else if (twinSyncSnapshot.desync?.level === "drifting") riskReasons.push("drifting");

if (drift?.level === "prolonged") riskReasons.push("elevated for a while");
else if (drift.level === "elevated") riskReasons.push("running above baseline");

const uniqueRiskReasons = Array.from(new Set(riskReasons));

const riskReasonText =
  uniqueRiskReasons.length >= 3
    ? `${uniqueRiskReasons[0]}, ${uniqueRiskReasons[1]}, and ${uniqueRiskReasons[2]}`
    : uniqueRiskReasons.length === 2
      ? `${uniqueRiskReasons[0]} and ${uniqueRiskReasons[1]}`
      : uniqueRiskReasons.length === 1
        ? uniqueRiskReasons[0]
        : "in your current state";

// HARD SAFETY OVERRIDE
if (
  latestText.includes("drunk") &&
  (latestText.includes("drive") || latestText.includes("driving"))
) {
  return "Stop. Do not drive. You're not in a safe state to be on the road. Stay where you are and find a safe way home.";
}

// RISK OVERRIDE
const riskResponse = handleRiskOverride({
  soundsRisky,
  isDriveRisk,
  contextRiskScore,
  riskReasonText,
  live,
  shapeTone,
});

if (riskResponse) return riskResponse;

const actionFlowResponse = handleActionFlow({
  pendingAction,
  pendingActionTurns,
  followUpStage,
  latestText,
  toneByAwareness,
  shapeTone,
});

if (actionFlowResponse) return actionFlowResponse;

if (exitSync?.active && exitSync.alone) {
  return shapeTone(
    "You're in exit mode and alone right now. Keep this move simple and close to safety."
  );
}

if (crewSync.staleCount >= 2 || crewSync.allSeparated) {
  return shapeTone(
    "Your support around you looks thin right now. Re-anchor before you drift further."
  );
}

if (
  partySync?.active &&
  partySync.status === "Drinking" &&
  spotSync.environmentLevel === "unsafe"
) {
  return shapeTone(
    "Your environment is adding pressure right now. Slow the next move down and stay closer to control."
  );
}

// ========================
// 🟡 EMOTIONAL + INTENT
// ========================

// EMOTIONAL MASKING
if (maskingSeverity === "low") {
  return shapeTone(
    toneByAwareness([
      "Maybe. But you're not fully settled.",
      "That doesn't sound finished yet.",
      "You're smoothing it out a bit. What's still there?",
      "Something's still active. What is it?",
    ])
  );
}

if (maskingSeverity === "medium") {
  return shapeTone(
    toneByAwareness([
      "You're saying you're fine, but something's still there.",
      "That sounds like a cover. What's underneath?",
      "You're closing it too early. What's still bothering you?",
      "Don't flatten it. What's actually there?",
    ])
  );
}

if (maskingSeverity === "high") {
  return shapeTone(
    toneByAwareness([
      "No. You're not settled yet. What is it?",
      "Don't hide behind 'fine'. Say it.",
      "That's not the real answer. What's going on?",
      "Stop. Something's still off. What is it?",
    ])
  );
}

// USER INTENT DETECTION
if (intent === "direction") {
  if (guidanceMode === "gentle") {
    return shapeTone(
      "Keep it simple. What's the smallest move that helps you feel steadier?"
    );
  }

  if (guidanceMode === "direct") {
    return shapeTone(
      "Choose the move that keeps you steady. Don't pick the one that pulls you deeper."
    );
  }

  if (guidanceMode === "firm") {
    return shapeTone(
      "Pick the steadier option. Don't feed the spiral."
    );
  }

  return shapeTone(
    "Keep it simple. Choose the option that keeps you steady, not the one that pulls you deeper in."
  );
}

if (intent === "reassurance") {
  if (guidanceMode === "gentle") {
    if (awarenessSignal?.level === "low") {
      return shapeTone("You seem okay right now. Stay aware, but don't pressure yourself.");
    }

    return shapeTone("You're not off track. Just stay intentional with your next move.");
  }

  if (guidanceMode === "direct") {
    if (awarenessSignal?.level === "low") {
      return shapeTone("You're okay right now. Stay aware and don't drift.");
    }

    return shapeTone("You're not off track, but this isn't passive. Stay intentional.");
  }

  if (awarenessSignal?.level === "low") {
    return shapeTone("You're okay right now. Just stay aware and don't drift.");
  }

  return shapeTone(
    "You're not off track, but you're not in a passive state either. Stay intentional."
  );
}

if (intent === "help") {
  if (guidanceMode === "gentle") {
    return shapeTone(
      "I'm with you. What feels heaviest right now?"
    );
  }

  if (guidanceMode === "direct") {
    return shapeTone(
      "Tell me the main thing pulling at you right now."
    );
  }

  if (guidanceMode === "firm") {
    return shapeTone(
      "Name the problem clearly. We'll simplify from there."
    );
  }

  return shapeTone(
    "Tell me what's pulling at you right now. We'll simplify it."
  );
}

// LEARNING-BASED RESPONSE
if (learnMe.label === "recurring pattern") {
  return shapeTone(
    "This feels familiar. You've been here before. Catching it earlier this time is the advantage."
  );
}

// CONTEXTUAL FOLLOW-UP
if (intent === "default") {
  if (contextText.includes("life") && contextText.includes("responsibilities")) {
    return shapeTone(
      "That sounds like weight, not confusion. Are your responsibilities feeling overwhelming or just constant?"
    );
  }

  if (contextText.includes("tired") && contextText.includes("responsibilities")) {
    return shapeTone(
      "That combination matters. You're carrying responsibility while low on energy. You don't need more pressure right now."
    );
  }
}

// ========================
// 🔵 BEHAVIORAL PATTERNS
// ========================

// 1. FAKE COMPLIANCE (repeated “ok” without action)
if (fakeComplianceCount >= 2) {
  return shapeTone(
    toneByAwareness([
      "You're saying it, not doing it. What's the step?",
      "Agreement isn't action. What's next?",
      "You're still sitting in it. Move.",
      "No more passive. What's the move?",
    ])
  );
}

// 2. STALLING (general circling / indecision)
if (stallingCount >= 3) {
  return shapeTone(
    toneByAwareness([
      "You're circling. What's the move?",
      "Still looping. Pick one step.",
      "No more thinking. What's next?",
      "Stop. Choose and move.",
    ])
  );
}

// 3. SOFT CONFIRMATION (first “ok”)
if (
  ["ok", "okay", "yeah", "sure"].includes(latestText.trim()) &&
  fakeComplianceCount < 2 &&
  !isLooping
) {
  return compressForCritical(
    shapeTone(
      toneByAwareness(
        [
          "Good. Stay with that.",
          "Alright. Keep it simple.",
          "That works. Don't add more.",
          "Nice. Hold it there.",
        ],
        [
          "Good. Stay intentional.",
          "Keep it steady.",
          "Stay with the clearer option.",
        ],
        [
          "Good. Don't add more to it.",
          "Keep your next move simple.",
          "Stay focused and keep it clean.",
        ],
        [
          "Stop there.",
          "That's enough.",
          "Hold that.",
        ]
      )
    ),
    awareness
  );
}

// SAFETY LAYER
if (
  soundsRisky ||
  (live?.active &&
    (live.status === "Drinking" || live.status === "At club") &&
    (
      latestText.includes("drive") ||
      latestText.includes("go alone") ||
      latestText.includes("leave alone")
    ))
) {
  return compressForCritical(
    shapeTone(
      "Pause there. That choice could add risk right now. Pick the safer version of the move — slower, simpler, and closer to support."
    ),
    awareness
  );
}

// CONFIDENCE REINFORCEMENT
if (soundsLikeAction && latestText.length < 40) {
  return compressForCritical(
    toneByAwareness(
      [
        "That's enough. Trust that choice and let it be simple.",
        "Good. That's a clear step — don't second-guess it.",
      ],
      [
        "Stay with that. Keep it steady.",
        "That works. Stay intentional with it.",
      ],
      [
        "That's enough. Don't add more to it.",
        "Keep it simple and follow through.",
      ],
      [
        "Stop there. That's the move.",
        "That's enough. Don't complicate it.",
      ]
    ),
    awareness
  );
}

// ACTION LOCK
if (contextText.includes("decision") || contextText.includes("decisions")) {
  return shapeTone(
    "Let's make this concrete. What's one small decision you can make right now — not perfect, just clear?"
  );
}

// HESITATION (you already chose—move)
if (isHesitating) {
  return shapeTone(
    toneByAwareness(
      [
        "You're holding on a step you already chose. Start it.",
        "You know the move. Begin.",
      ],
      [
        "Pause is fine—but don't stall. Take the first step.",
        "Keep it moving. What's the first action?",
      ],
      [
        "Don't drag this. Act on what you decided.",
        "Start now. Keep it clean.",
      ],
      [
        "No waiting. Move now.",
        "Stop. Act.",
      ]
    )
  );
}
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
  trajectory: TrajectoryState
): string | null {
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
  trajectory: TrajectoryState,
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
      body: "You are clearly out of sync with your crew's pace or position.",
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

  if (awarenessSignal?.level === "critical") {
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
  trajectory: TrajectoryState,
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

  if (trajectory.riskWindow=== "approaching") {
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

I'm here with you — keep this moment steady.`;
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

  const actionText =
  microGuidance?.actions?.slice(0, 2).join(". ") ||
  "Keep your next move simple.";

  return `TwinMe state check. Awareness score ${awareness.score}. Current state ${awareness.level}. ${nudge} ${learnMe.summary} ${
    noSupportActive ? "Support around you looks thin right now." : ""
  } Next best moves: ${actionText}.`;
}

function applyConfidenceTone(
  message: string,
  awareness: { score: number; level: AwarenessLevel },
  trajectory: TrajectoryState,
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  crewCollapse: CrewCollapseInsight
) {
  const isProtective =
    trajectory.riskWindow === "imminent" ||
    desyncLevel === "separated" ||
    driftLevel === "prolonged" ||
    noSupportActive ||
    crewCollapse.level === "collapsing" ||
    awarenessSignal?.level === "critical";

  const isFirm =
    trajectory.riskWindow === "approaching" ||
    desyncLevel === "drifting" ||
    driftLevel === "elevated" ||
    driftLevel === "rising" ||
    awareness.level === "elevated" ||
    crewCollapse.level === "thinning";

  if (isProtective) return message;

  if (isFirm) {
    if (message.endsWith(".")) return message;
    return `${message}.`;
  }

  if (message.startsWith("Pause") || message.startsWith("Stop")) {
    return message;
  }

  return `Just a check-in: ${message}`;
}


function getEmotionalIntensity(input: string) {
  const text = input.toLowerCase().trim();

  let score = 0;

  const intenseWords = [
    "help",
    "panic",
    "scared",
    "afraid",
    "unsafe",
    "overwhelmed",
    "i can't",
    "stuck",
    "lost",
    "alone",
    "anxious",
    "freaking out",
    "too much",
    "don't know what to do",
  ];

  const reflectiveWords = [
    "thinking",
    "feel like",
    "not sure",
    "wondering",
    "maybe",
    "i think",
    "i feel",
  ];

  const urgentActionWords = [
    "now",
    "right now",
    "immediately",
    "leave",
    "go",
    "drive",
    "come",
  ];

  for (const word of intenseWords) {
    if (text.includes(word)) score += 2;
  }

  for (const word of reflectiveWords) {
    if (text.includes(word)) score += 1;
  }

  for (const word of urgentActionWords) {
    if (text.includes(word)) score += 1;
  }

  if (text.length <= 8) score += 1;
  if (text.includes("!")) score += 1;
  if (text.split(" ").length >= 20) score += 1;

  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function rephraseMessage(message: string) {
  if (message.includes("one clear next step")) {
    return "Keep it simple. Choose one clear next move.";
  }

  if (message.includes("slow down")) {
    return "Take it slower. Give yourself a moment before acting.";
  }

  if (message.includes("stay visible")) {
    return "Stay where you can be seen and keep control of your space.";
  }

  if (message.includes("pause")) {
    return "Pause for a second. Let things settle before deciding.";
  }

    return message; // or "Got it. Stay steady." if you prefer
}

function makeMessageId() {
  return crypto.randomUUID();
}

function getEscalationLevel(
  awareness: { score: number; level: AwarenessLevel },
  trajectory: TrajectoryState,
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  crewCollapse: CrewCollapseInsight,
  environmentLevel: string,
  movementLevel: string
)
{
  let score = 0;

  if (trajectory.riskWindow === "imminent") score += 3;
else if (trajectory.riskWindow === "approaching") score += 2;

  if (desyncLevel === "separated") score += 3;
  else if (desyncLevel === "drifting") score += 2;

  if (driftLevel === "prolonged") score += 3;
  else if (driftLevel === "elevated") score += 2;

  if (noSupportActive) score += 2;

  if (crewCollapse.level === "collapsing") score += 3;
  else if (crewCollapse.level === "thinning") score += 1;

  if (environmentLevel === "unsafe") score += 2;
  else if (environmentLevel === "volatile") score += 1;

  if (movementLevel === "drifting") score += 1;

 if (awareness.level === "critical") score += 3;
  else if (awareness.level === "elevated") score += 2;
  else if (awareness.level === "guarded") score += 1;

  if (score >= 8) return 3;
  if (score >= 4) return 2;
  return 1;
}

function speakText(
  text: string,
  options?: {
    awarenessLevel?: AwarenessLevel;
    trajectoryRiskWindow?: TrajectoryRiskWindow;
    desyncLevel?: DesyncLevel;
    driftLevel?: DriftLevel;
    noSupportActive?: boolean;
  }
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  const isProtective =
    options?.trajectoryRiskWindow === "imminent" ||
    options?.desyncLevel === "separated" ||
    options?.driftLevel === "prolonged" ||
    options?.noSupportActive ||
    options?.awarenessLevel === "critical";

  const isFirm =
    options?.trajectoryRiskWindow === "approaching" ||
    options?.desyncLevel === "drifting" ||
    options?.driftLevel === "elevated" ||
    options?.driftLevel === "rising" ||
    options?.awarenessLevel === "elevated";

  if (isProtective) {
    utterance.rate = 0.94;
    utterance.pitch = 0.82;
    utterance.volume = 1;
  } else if (isFirm) {
    utterance.rate = 0.98;
    utterance.pitch = 0.9;
    utterance.volume = 1;
  } else {
    utterance.rate = 1.02;
    utterance.pitch = 0.98;
    utterance.volume = 0.98;
  }

  window.speechSynthesis.speak(utterance);
}

function getPredictiveInterruption(
  awareness: { score: number; level: AwarenessLevel },
  trajectory: TrajectoryState,
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  crewCollapse: CrewCollapseInsight,
  environmentLevel: string,
  movementLevel: string
): string | null {
 
  const escalation = getEscalationLevel(
    awareness,
    trajectory,
    desyncLevel,
    driftLevel,
    noSupportActive,
    crewCollapse,
    environmentLevel,
    movementLevel
  );

if (
  trajectory.riskWindow === "imminent" &&
  (desyncLevel === "separated" || driftLevel === "prolonged")
) {
    return "Interrupting here: your pattern is compounding. Stop and stabilize before you make another move.";
  }

  if (
    noSupportActive &&
    (environmentLevel === "unsafe" || environmentLevel === "volatile")
  ) {
    return "Interrupting here: support is thin and the environment is unstable. Stay visible and simplify your next move.";
  }

  if (
    crewCollapse.level === "collapsing" &&
    movementLevel === "drifting"
  ) {
    return "Interrupting here: your support layer is dropping while you are still drifting. Re-anchor now.";
  }

  if (escalation === 3 && awareness.level === "critical") {
    return "Interrupting here: multiple signals are stacking at once. Pause and choose the safest next step.";
  }

  return null;
}

function getInputType(input: string) {
  const text = input.toLowerCase().trim();

  if (text.length <= 3) return "minimal";

  if (
    ["ok", "okay", "k", "idk", "meh", "hmm", "fine"].includes(text)
  ) {
    return "minimal";
  }

  if (text.split(" ").length <= 5) return "short";

  return "normal";
}

  function getStateGuidance(
  live: PartyLive | null,
  awareness: { score: number; level: AwarenessLevel },
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryState,
  microGuidance: MicroGuidance,
  crewCollapse: CrewCollapseInsight,
  environmentLevel: string,
  movementLevel: string
) {
  if (!live?.active) return null;

  const escalation = getEscalationLevel(
    awareness,
    trajectory,
    desyncLevel,
    driftLevel,
    noSupportActive,
    crewCollapse,
    environmentLevel,
    movementLevel
  );

  let message: string | null = null;

  if (trajectory.riskWindow === "imminent") {
    message =
      escalation >= 3
        ? "Pause. Do not add anything right now. Stabilize first."
        : "Your pace is turning risky. Slow this moment down.";
  } else if (noSupportActive) {
    message =
      escalation >= 3
        ? "You do not have support around you right now. Stay visible and keep control of your next move."
        : "Support looks thin right now. Keep your next move simple.";
  } else if (crewCollapse.level === "collapsing") {
    message =
      escalation >= 3
        ? "Your support layer has dropped away. Do not move like you still have coverage."
        : "Your group is slipping. Stay anchored before you move again.";
  } else if (desyncLevel === "separated") {
    message =
      escalation >= 3
        ? "You're out of sync. Reconnect before making another move."
        : "You're drifting away from alignment. Correct it now.";
  } else if (desyncLevel === "drifting") {
    message =
      escalation >= 2
        ? "You're starting to drift. Correct it now while it's small."
        : "Small drift is building. Re-align early.";
  } else if (driftLevel === "prolonged") {
    message =
      escalation >= 3
        ? "You've been off pace for a while. Reset before deciding anything."
        : "Your pace has been elevated longer than usual. Slow it down.";
  } else if (driftLevel === "elevated" || driftLevel === "rising") {
    message =
      escalation >= 2
        ? "Your pace is rising. Slow it down before it compounds."
        : "Your pace is picking up. Stay deliberate.";
  } else if (environmentLevel === "unsafe" || environmentLevel === "volatile") {
    message =
      escalation >= 2
        ? "This environment is shifting. Reduce unnecessary movement."
        : "Stay sharp. The environment is changing.";
  } else if (movementLevel === "drifting") {
    message =
      escalation >= 2
        ? "You're moving without a clear direction. Decide your next step before continuing."
        : "Your movement is getting loose. Tighten it up.";
  } else if (awareness.score < 50) {
    message =
      escalation >= 2
        ? "Your awareness is slipping. Stay simple and intentional."
        : "Stay present. Don't let this moment speed up.";
  } else {
   const firstAction = microGuidance?.actions?.[0];
    message = firstAction || null;
  }

 if (!message) return null;

      return applyConfidenceTone(
  message,
  awareness,
  trajectory,
  desyncLevel,
  driftLevel,
  noSupportActive,
  crewCollapse
);
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
  trajectory: TrajectoryState
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

function getDefaultTwinMessage(): Message {
  return {
    id: makeMessageId(),
    role: "twin",
    text: "TwinMe is here. Ask for a state check, help thinking something through, or say what tonight feels like.",
  };
}

function normalizeStoredMessages(input: unknown): Message[] {
  if (!Array.isArray(input)) {
    return [getDefaultTwinMessage()];
  }

  const seen = new Set<string>();
  const cleaned: Message[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") continue;

    const role =
      (item as { role?: unknown }).role === "user" ? "user" : "twin";

    const text = String((item as { text?: unknown }).text ?? "").trim();
    if (!text) continue;

    const rawId = String((item as { id?: unknown }).id ?? "").trim();
    let id = rawId || makeMessageId();

    if (seen.has(id)) {
      id = makeMessageId();
    }

    seen.add(id);
    cleaned.push({ id, role, text });
  }

  return cleaned.length ? cleaned.slice(-20) : [getDefaultTwinMessage()];
}

/* -------------------------
   PAGE
--------------------------*/


function getAutoVoiceMessage(
  live: PartyLive | null,
  awareness: { score: number; level: AwarenessLevel },
  desyncLevel: DesyncLevel,
  driftLevel: DriftLevel,
  noSupportActive: boolean,
  trajectory: TrajectoryState,
  microGuidance: MicroGuidance,
  crewCollapse: CrewCollapseInsight
) {
  const firstAction =
  microGuidance?.actions?.[0] ?? "Keep your next move simple.";

  if (trajectory.riskWindow === "imminent") {
    return "Pause. Things are stacking. Slow your next move down.";
  }

  if (noSupportActive) {
    return "Support is thin right now. Stay visible and keep it simple.";
  }

  if (desyncLevel === "separated") {
    return "You're out of sync. Reconnect before moving.";
  }

  if (driftLevel === "prolonged") {
    return "You've been elevated for a while. Slow this down.";
  }

  if (crewCollapse.level === "collapsing") {
    return "Your support layer is dropping. Stay anchored.";
  }

  return firstAction;
}

/* -------------------------
   COMPONENT
--------------------------*/
export default function TwinMePage() {
  const [displayName, setDisplayName] = useState("Neo");
  const [live, setLive] = useState<PartyLive | null>(null);
  const [crew, setCrew] = useState<CrewStatus[]>([]);
  const [spots, setSpots] = useState<SpotsSnapshot | null>(null);
  const [history, setHistory] = useState<PositionPoint[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [guidedState, setGuidedState] = useState<GuidedState>({
    step: "idle",
  });
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const autoVoiceCooldownRef = useRef<number>(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastTwinReplyRef = useRef<string | null>(null);
  const lastAutoMessageRef = useRef<string | null>(null);
  const lastAutoStateRef = useRef<string | null>(null);
  const autoMessageTimeoutRef = useRef<number | null>(null);
  const lastInterruptionRef = useRef<string | null>(null);

  const twinSnapshot: TwinContextSnapshot = useMemo(
    () => ({
      party: live,
      crew,
      spots: [],
      exitState: null,
    }),
    [live, crew]
  );

  const twinSignals = useMemo(
    () => buildTwinSignals(twinSnapshot),
    [twinSnapshot]
  );

  useEffect(() => {
    if (!chatScrollRef.current) return;

    chatScrollRef.current.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    setHasHydrated(true);

    const stored = readJson<unknown>(TWINCORE_MESSAGES_KEY, null);
    const normalized = normalizeStoredMessages(stored);

    setMessages(normalized);
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

  const exitState: ExitState | null = null;

  const twinSyncSnapshot: TwinSyncSnapshot = useMemo(
    () =>
      buildTwinSyncSnapshot({
        live,
        crew,
        environmentLevel,
        exitState,
      }),
    [live, crew, environmentLevel, exitState]
  );

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
      getTrajectoryLevel(
        live,
        minutes,
        movementLevel,
        twinSyncSnapshot.desync?.level,
        drift.level
      ),
    [live, minutes, movementLevel, twinSyncSnapshot.desync?.level, drift.level]
  );

  const noSupport = useMemo(
    () => getNoSupportMode(live, crew, spots),
    [live, crew, spots]
  );

  useEffect(() => {
    if (!hasHydrated) return;
    updateLearningProfile(live, minutes, drift.level, twinSyncSnapshot.noSupport?.active);
  }, [hasHydrated, live, minutes, drift.level, twinSyncSnapshot.noSupport?.active]);

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
        twinSyncSnapshot.desync?.level,
        drift.level,
        twinSyncSnapshot.noSupport?.active,
        trajectory
      ),
    [
      live,
      movementLevel,
      environmentLevel,
      twinSyncSnapshot.desync?.level,
      drift.level,
      twinSyncSnapshot.noSupport?.active,
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
        twinSyncSnapshot.desync?.level,
        drift.level,
        twinSyncSnapshot.noSupport?.active,
        trajectory
      ),
    [
      live,
      minutes,
      crewLevel,
      movementLevel,
      environmentLevel,
      spots,
      twinSyncSnapshot.desync?.level,
      drift.level,
      twinSyncSnapshot.noSupport?.active,
      trajectory,
    ]
  );

  useEffect(() => {
    if (!live?.active) {
      if (autoMessageTimeoutRef.current) {
        clearTimeout(autoMessageTimeoutRef.current);
        autoMessageTimeoutRef.current = null;
      }
      lastAutoStateRef.current = null;
      return;
    }

    const stateKey = [
      awareness.level,
      twinSyncSnapshot.desync?.level,
      drift.level,
      trajectory.riskWindow,
      twinSyncSnapshot.noSupport?.active ? "nosupport" : "support",
      crewCollapse.level,
      environmentLevel,
      movementLevel,
      microGuidance?.actions?.[0] ?? "none",
    ].join("|");

    if (stateKey === lastAutoStateRef.current) return;
    lastAutoStateRef.current = stateKey;

    const message = getAutoVoiceMessage(
      live,
      awareness,
      twinSyncSnapshot.desync?.level,
      drift.level,
      twinSyncSnapshot.noSupport?.active,
      trajectory,
      microGuidance,
      crewCollapse,
      environmentLevel,
      movementLevel
    );

    if (!message) return;

    const finalAutoMessage = message;
    const isUrgent =
      trajectory.riskWindow === "imminent" ||
      twinSyncSnapshot.desync?.level === "separated" ||
      drift.level === "prolonged" ||
      crewCollapse.level === "collapsing";

    const timeoutDelay = isUrgent ? 1200 : 3500;

    if (autoMessageTimeoutRef.current) {
      clearTimeout(autoMessageTimeoutRef.current);
    }

    autoMessageTimeoutRef.current = window.setTimeout(() => {
    
      if (finalAutoMessage === lastAutoMessageRef.current) return;
      setMessages((prev) =>
        [
          ...prev,
          {
            id: makeMessageId(),
            role: "twin",
            text: finalAutoMessage,
          },
        ].slice(-20)
      );

      lastAutoMessageRef.current = finalAutoMessage;
      autoMessageTimeoutRef.current = null;
    }, timeoutDelay);

    return () => {
      if (autoMessageTimeoutRef.current) {
        clearTimeout(autoMessageTimeoutRef.current);
        autoMessageTimeoutRef.current = null;
      }
    };
  }, [
    live,
    awareness,
    twinSyncSnapshot.desync?.level,
    drift.level,
    twinSyncSnapshot.noSupport?.active,
    trajectory,
    microGuidance,
    crewCollapse,
    environmentLevel,
    movementLevel,
  ]);

  useEffect(() => {
    if (!live?.active) {
      lastInterruptionRef.current = null;
      return;
    }

    const interruption = getPredictiveInterruption(
      awareness,
      trajectory,
      twinSyncSnapshot.desync?.level,
      drift.level,
      twinSyncSnapshot.noSupport?.active,
      crewCollapse,
      environmentLevel,
      movementLevel
    );

    if (!interruption) return;
    if (interruption === lastInterruptionRef.current) return;

    lastInterruptionRef.current = interruption;

    const interruptionMessage: Message = {
      id: makeMessageId(),
      role: "twin",
      text: interruption,
    };

    setMessages((prev) => [...prev, interruptionMessage].slice(-20));

    if (voiceEnabled) {
      speakText(interruption, {
        awarenessLevel: awareness.level,
        trajectoryRiskWindow: trajectory.riskWindow,
        desyncLevel: twinSyncSnapshot.desync?.level,
        driftLevel: drift.level,
        noSupportActive: twinSyncSnapshot.noSupport?.active,
      });
    }
  }, [
    live,
    awareness,
    trajectory,
    twinSyncSnapshot.desync?.level,
    drift.level,
    twinSyncSnapshot.noSupport?.active,
    crewCollapse,
    environmentLevel,
    movementLevel,
    voiceEnabled,
  ]);

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
        twinSyncSnapshot.desync?.level,
        drift.level,
        twinSyncSnapshot.noSupport?.active,
        trajectory
      ),
    [
      live,
      minutes,
      crewLevel,
      movementLevel,
      environmentLevel,
      spots,
      twinSyncSnapshot.desync?.level,
      drift.level,
      twinSyncSnapshot.noSupport?.active,
      trajectory,
    ]
  );

  const stateCheckSpeech = useMemo(
    () =>
      getStateCheckSpeech(
        awareness,
        nudge,
        microGuidance,
        twinSyncSnapshot.noSupport?.active,
        learnMe
      ),
    [awareness, nudge, microGuidance, twinSyncSnapshot.noSupport?.active, learnMe]
  );

  const autoVoiceMessage = useMemo(
    () =>
      getAutoVoiceMessage(
        live,
        awareness,
        twinSyncSnapshot.desync?.level,
        drift.level,
        twinSyncSnapshot.noSupport?.active,
        trajectory,
        microGuidance,
        crewCollapse,
        environmentLevel,
        movementLevel
      ),
    [
      live,
      awareness,
      twinSyncSnapshot.desync?.level,
      drift.level,
      twinSyncSnapshot.noSupport?.active,
      trajectory,
      microGuidance,
      crewCollapse,
      environmentLevel,
      movementLevel,
    ]
  );

  useEffect(() => {
    if (!voiceEnabled || !autoVoiceMessage) return;

    const now = Date.now();
    if (now - autoVoiceCooldownRef.current < 30000) return;

    autoVoiceCooldownRef.current = now;

    speakText(autoVoiceMessage, {
      awarenessLevel: awareness.level,
      trajectoryRiskWindow: trajectory.riskWindow,
      desyncLevel: twinSyncSnapshot.desync?.level,
      driftLevel: drift.level,
      noSupportActive: twinSyncSnapshot.noSupport?.active,
    });
  }, [
    voiceEnabled,
    autoVoiceMessage,
    awareness.level,
    trajectory.riskWindow,
    twinSyncSnapshot.desync?.level,
    drift.level,
    twinSyncSnapshot.noSupport?.active,
  ]);

  const handleSend = async (overrideInput?: string) => {
    const trimmed = (overrideInput ?? input).trim();
    if (!trimmed || isThinking) return;

    const userMessage: Message = {
      id: makeMessageId(),
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage].slice(-20));
    setInput("");
    setIsThinking(true);

    try {
      const twinText = generateTwinResponse({
  input: trimmed,
  messages: [...messages, userMessage],
  displayName,
  twinSignals,
  twinSyncSnapshot,
  environmentLevel,
  movementLevel,
  live,
  awareness,
  spots,
});

      const twinMessage: Message = {
        id: makeMessageId(),
        role: "twin",
        text: twinText,
      };

      setMessages((prev) => [...prev, twinMessage].slice(-20));
      lastTwinReplyRef.current = twinText;
    } catch (err) {
      console.error("TwinMe response error:", err);

      setMessages((prev) =>
        [
          ...prev,
          {
            id: makeMessageId(),
            role: "twin",
            text: "Something glitched. Try that again.",
          },
        ].slice(-20)
      );
    } finally {
      setIsThinking(false);
    }
  };

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
  }, [input, isThinking, messages, displayName, twinSignals, twinSyncSnapshot, environmentLevel, movementLevel]);

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

  const alert = useMemo(
    () =>
      getAlert(
        live,
        minutes,
        crewLevel,
        movementLevel,
        environmentLevel,
        spots,
        twinSyncSnapshot.desync?.level,
        twinSyncSnapshot.noSupport?.active,
        trajectory
      ),
    [
      live,
      minutes,
      crewLevel,
      movementLevel,
      environmentLevel,
      spots,
      twinSyncSnapshot.desync?.level,
      twinSyncSnapshot.noSupport?.active,
      trajectory,
    ]
  );

  const theme = useMemo(
    () =>
      getAmbientTheme(
        awareness.level,
        environmentLevel,
        twinSyncSnapshot.desync?.level,
        drift.level,
        twinSyncSnapshot.noSupport?.active,
        trajectory
      ),
    [
      awareness.level,
      environmentLevel,
      twinSyncSnapshot.desync?.level,
      drift.level,
      twinSyncSnapshot.noSupport?.active,
      trajectory,
    ]
  );

  return (
    <main
      className="min-h-screen flex justify-center items-start px-4 pt-6 text-white"
      style={{ background: theme.pageBg }}
    >
      <div className="w-full max-w-md space-y-6 px-4 pt-6 pb-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">TwinMe</h1>
          <p className="text-white/50 text-sm">
            Predictive support for {displayName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: "Awareness", value: awareness.score, sub: awareness.level },
            {
              label: "Heartbeat",
              value: live?.heartbeatBpm || 0,
              sub: `${minutes} min`,
            },
            { label: "Desync", value: twinSyncSnapshot.desync?.level, sub: "sync status" },
            { label: "LearnMe", value: learnMe.label, sub: "pattern memory" },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl p-3 min-h-[72px] border ${theme.border} bg-white/5`}
            >
              <div className="text-xs text-white/50">{item.label}</div>
              <div className="text-base md:text-xl font-semibold leading-tight">
                {item.value}
              </div>
              <div className="text-[11px] leading-4 text-white/45 mt-1">
                {item.sub}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-4 order-1">
            <div className={`rounded-2xl p-4 border bg-white/5 ${theme.border}`}>
              <h3 className="font-semibold mb-2">State</h3>
              <p className={`text-sm ${levelClass(awareness.level)}`}>{nudge}</p>

              <div className="mt-3 text-xs text-white/40">
                Next: {microGuidance.actions[0] || "Stay present."}
              </div>
            </div>

            {alert && (
              <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4">
                <h3 className="font-semibold mb-2 text-red-100">Alert</h3>
                <p className="text-sm text-red-50/90">{alert}</p>
              </div>
            )}
          </div>

          <div
            className={`rounded-3xl p-5 border w-full min-w-0 flex flex-col mt-2 order-2 bg-white/5 ${theme.border} ${theme.glow}`}
          >
            <h3 className="font-semibold mb-3 text-base">Talk to TwinMe</h3>

            <div
              ref={chatScrollRef}
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 pt-4 min-h-[280px] max-h-[380px] overflow-y-auto space-y-3"
            >
              {messages.map((m, i) => {
                const isLatest = i === messages.length - 1;

                return (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.role === "twin"
                        ? "animate-[fadeIn_0.45s_ease-out]"
                        : "animate-[fadeIn_0.25s_ease-out]"
                    } ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`p-3 rounded-xl max-w-[75%] ${
                        m.role === "twin"
                          ? getEscalationLevel(
                              awareness,
                              trajectory,
                              twinSyncSnapshot.desync?.level,
                              drift.level,
                              twinSyncSnapshot.noSupport?.active,
                              crewCollapse,
                              environmentLevel,
                              movementLevel
                            ) === 3 && isLatest
                            ? "bg-red-500/15 border border-red-400/30 animate-pulse"
                            : awareness.level === "critical"
                              ? "bg-red-500/10 border border-red-400/20"
                              : "bg-blue-500/10 border border-blue-400/20"
                          : "bg-white/10"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {m.text}
                      </p>
                    </div>
                  </div>
                );
              })}

              {isThinking && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-xl max-w-[75%] bg-blue-500/10 border border-blue-400/20">
                    <div className="flex gap-1 items-center">
                      <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                      <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 left-0 right-0 pt-3 pb-2 mt-3 bg-gradient-to-t from-[#0A0A0B] to-transparent">
              <div className="flex flex-col gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Tell TwinMe what's going on..."
                  className="w-full min-h-[80px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-white/20 transition"
                />

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSend()}
                    className="w-full h-[52px] rounded-2xl bg-white text-black font-medium shadow-lg hover:opacity-90 transition"
                  >
                    Send
                  </button>

                  <button
                    onClick={toggleListening}
                    className={`w-full h-[52px] rounded-2xl border font-medium transition ${
                      isListening
                        ? "border-red-400/40 bg-red-500/10 text-red-100"
                        : "border-white/10 bg-white/5 text-white"
                    }`}
                  >
                    {isListening ? "Listening..." : "Voice"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(16px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </main>
  );
}