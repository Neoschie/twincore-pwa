import type {
  CrewStatus,
  TwinContextSnapshot,
  TwinSignals,
  DesyncLevel,
  DriftLevel,
} from "./types";

function getMinutesSince(timestamp?: string | null): number | null {
  if (!timestamp) return null;
  const value = new Date(timestamp).getTime();
  if (Number.isNaN(value)) return null;
  return Math.max(0, Math.floor((Date.now() - value) / 60000));
}

function summarizeCrew(crew: CrewStatus[]) {
  let activeCount = 0;
  let staleCount = 0;

  for (const member of crew) {
    const minutes = getMinutesSince(member.updatedAt);

    if (minutes === null || minutes > 20) {
      staleCount += 1;
      continue;
    }

    activeCount += 1;
  }

  return { activeCount, staleCount };
}

function getCrewCollapse(activeCount: number, staleCount: number) {
  if (activeCount <= 1 && staleCount >= 2) {
    return {
      level: "collapsing" as const,
      activeCount,
      staleCount,
    };
  }

  if (activeCount <= 2 || staleCount >= 1) {
    return {
      level: "thinning" as const,
      activeCount,
      staleCount,
    };
  }

  return {
    level: "stable" as const,
    activeCount,
    staleCount,
  };
}

function getDesync(snapshot: TwinContextSnapshot): DesyncLevel {
  const { crew, exitState } = snapshot;
  const { activeCount } = summarizeCrew(crew);

  if (exitState?.active && exitState.alone) return "separated";
  if (activeCount <= 1 && crew.length >= 2) return "drifting";
  return "synced";
}

function getDrift(snapshot: TwinContextSnapshot): DriftLevel {
  const partyEnergy = snapshot.party?.energy ?? 0;
  const exitActive = snapshot.exitState?.active ?? false;
  const nearbyRiskySpot = snapshot.spots.some(
    (spot) => spot.isNearby && spot.safetyTone === "risky"
  );

  if ((partyEnergy >= 80 && nearbyRiskySpot) || (exitActive && snapshot.exitState?.alone)) {
    return "prolonged";
  }

  if (partyEnergy >= 65 || nearbyRiskySpot || exitActive) {
    return "elevated";
  }

  return "none";
}

function getAwareness(snapshot: TwinContextSnapshot) {
  let score = 18;

  const partyEnergy = snapshot.party?.energy ?? 0;
  const partyIntensity = snapshot.party?.intensity ?? "low";
  const nearbyRiskySpot = snapshot.spots.some(
    (spot) => spot.isNearby && spot.safetyTone === "risky"
  );
  const exitAlone = snapshot.exitState?.active && snapshot.exitState?.alone;
  const headingHome = snapshot.exitState?.headingHome ?? false;

  const { activeCount, staleCount } = summarizeCrew(snapshot.crew);

  score += Math.min(30, Math.floor(partyEnergy / 4));

  if (partyIntensity === "high") score += 18;
  if (nearbyRiskySpot) score += 16;
  if (exitAlone) score += 20;
  if (headingHome) score += 6;
  if (activeCount <= 1) score += 12;
  if (staleCount >= 2) score += 10;

  score = Math.max(0, Math.min(100, score));

  if (score >= 80) return { score, level: "critical" as const };
  if (score >= 60) return { score, level: "elevated" as const };
  if (score >= 35) return { score, level: "guarded" as const };
  return { score, level: "low" as const };
}

function getTrajectory(snapshot: TwinContextSnapshot, awarenessScore: number) {
  const exitActive = snapshot.exitState?.active ?? false;
  const exitAlone = snapshot.exitState?.alone ?? false;
  const nearbyRiskySpot = snapshot.spots.some(
    (spot) => spot.isNearby && spot.safetyTone === "risky"
  );

  if (awarenessScore >= 80 || (exitActive && exitAlone && nearbyRiskySpot)) {
    return {
      level: "imminent" as const,
      reason: "Multiple live signals suggest immediate decision risk.",
    };
  }

  if (awarenessScore >= 60 || exitActive || nearbyRiskySpot) {
    return {
      level: "approaching" as const,
      reason: "Context is tightening and support may be thinning.",
    };
  }

  return {
    level: "steady" as const,
    reason: "No strong escalation pattern detected right now.",
  };
}

export function buildTwinSignals(snapshot: TwinContextSnapshot): TwinSignals {
  const crewSummary = summarizeCrew(snapshot.crew);
  const awareness = getAwareness(snapshot);
  const crewCollapse = getCrewCollapse(
    crewSummary.activeCount,
    crewSummary.staleCount
  );
  const desync = getDesync(snapshot);
  const drift = getDrift(snapshot);
  const noSupportActive =
    crewCollapse.level === "collapsing" || crewSummary.activeCount === 0;
  const trajectory = getTrajectory(snapshot, awareness.score);

  return {
    awareness,
    desync,
    drift,
    noSupportActive,
    crewCollapse,
    trajectory,
  };
}