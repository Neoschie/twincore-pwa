import type { SharedTwinMeRecommendation } from "@/lib/twinme/recommendation-bridge";

import {
  createRecommendationFreshnessResult,
  type RecommendationFreshnessResult,
  type RecommendationFreshnessSourceState,
} from "@/lib/twinme/recommendation-freshness-bridge";

// TWINCORE_RECOMMENDATION_FRESHNESS_ENGINE_R14_6C

export type RecommendationFreshnessEngineInput = {
  currentRecommendation: SharedTwinMeRecommendation | null;

  nextRecommendation: Omit<SharedTwinMeRecommendation, "updatedAt"> | null;

  sources: RecommendationFreshnessSourceState[];
};

function normalizeString(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function sameStrings(a: string[], b: string[]) {
  const left = [...a].map(normalizeString).sort();
  const right = [...b].map(normalizeString).sort();

  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sameRecommendationIdentity(
  current: SharedTwinMeRecommendation,
  next: Omit<SharedTwinMeRecommendation, "updatedAt">,
) {
  return (
    current.lane === next.lane &&
    current.action === next.action &&
    normalizeString(current.destination) ===
      normalizeString(next.destination) &&
    sameStrings(current.crewNames, next.crewNames)
  );
}

function sameRecommendationPresentation(
  current: SharedTwinMeRecommendation,
  next: Omit<SharedTwinMeRecommendation, "updatedAt">,
) {
  return (
    normalizeString(current.headline) === normalizeString(next.headline) &&
    normalizeString(current.message) === normalizeString(next.message) &&
    sameStrings(current.reasons, next.reasons) &&
    current.confidence === next.confidence &&
    current.venueMatchConfidence === next.venueMatchConfidence &&
    current.moveDecisionConfidence === next.moveDecisionConfidence &&
    current.hasMeaningfulVenueFit === next.hasMeaningfulVenueFit &&
    current.safetyOverride === next.safetyOverride &&
    current.actionable === next.actionable
  );
}

function hasExplicitStaleSource(sources: RecommendationFreshnessSourceState[]) {
  return sources.some((source) => source.stale === true);
}

function hasMissingRequiredSource(
  current: SharedTwinMeRecommendation,
  sources: RecommendationFreshnessSourceState[],
) {
  return current.sources.some((requiredSource) => {
    const mapping =
      requiredSource === "TONIGHT_CONTEXT"
        ? "TONIGHT_CONTEXT"
        : requiredSource === "CREW"
          ? "CREW"
          : requiredSource === "VENUE_RECOMMENDATION"
            ? "VENUE_RECOMMENDATION"
            : requiredSource === "VENUE_FIT"
              ? "VENUE_FIT"
              : requiredSource === "MOVE_CANDIDATE"
                ? "MOVE_CANDIDATE"
                : requiredSource === "SAFETY"
                  ? "SAFETY"
                  : null;

    if (!mapping) return false;

    const source = sources.find((item) => item.source === mapping);

    return source ? !source.available : true;
  });
}

// ======================================================
// TWINCORE_RECOMMENDATION_FRESHNESS_DECIDE_R14_6C
// ======================================================

export function decideRecommendationFreshness(
  input: RecommendationFreshnessEngineInput,
): RecommendationFreshnessResult {
  const { currentRecommendation, nextRecommendation, sources } = input;

  // No current recommendation yet.
  if (!currentRecommendation) {
    if (nextRecommendation) {
      return createRecommendationFreshnessResult({
        decision: "SUPERSEDE",
        trigger: "SOURCE_MISSING",
        reason:
          "No current recommendation exists, and fresh authoritative intelligence is available.",
        sources: ["RECOMMENDATION"],
        currentRecommendation: null,
      });
    }

    return createRecommendationFreshnessResult({
      decision: "HOLD",
      trigger: "SOURCE_MISSING",
      reason:
        "TwinMe does not yet have enough recommendation intelligence to evaluate freshness.",
      sources: [],
      currentRecommendation: null,
    });
  }

  // TWINCORE_RECOMMENDATION_FRESHNESS_STALE_GUARD_R14_6C
  if (hasExplicitStaleSource(sources)) {
    return createRecommendationFreshnessResult({
      decision: "EXPIRE",
      trigger: "SOURCE_STALE",
      reason:
        "At least one supporting source is explicitly stale, so TwinMe should not present the current recommendation as fresh.",
      sources: sources
        .filter((source) => source.stale === true)
        .map((source) => source.source),
      currentRecommendation,
    });
  }

  // TWINCORE_RECOMMENDATION_FRESHNESS_MISSING_GUARD_R14_6C
  if (hasMissingRequiredSource(currentRecommendation, sources)) {
    return createRecommendationFreshnessResult({
      decision: "HOLD",
      trigger: "SOURCE_MISSING",
      reason:
        "One or more sources required by the current recommendation are unavailable.",
      sources: currentRecommendation.sources,
      currentRecommendation,
    });
  }

  if (!nextRecommendation) {
    return createRecommendationFreshnessResult({
      decision: "HOLD",
      trigger: "SOURCE_MISSING",
      reason:
        "TwinMe cannot compare the current recommendation against a fresh authoritative recommendation yet.",
      sources: currentRecommendation.sources,
      currentRecommendation,
    });
  }

  // TWINCORE_RECOMMENDATION_FRESHNESS_SAFETY_R14_6C
  if (
    currentRecommendation.safetyOverride !== nextRecommendation.safetyOverride
  ) {
    return createRecommendationFreshnessResult({
      decision: "SUPERSEDE",
      trigger: "SAFETY_CHANGED",
      reason:
        "Safety state materially changed, so the current recommendation must be replaced.",
      sources: ["SAFETY", "RECOMMENDATION"],
      currentRecommendation,
    });
  }

  // TWINCORE_RECOMMENDATION_FRESHNESS_SUPERSEDE_R14_6C
  if (!sameRecommendationIdentity(currentRecommendation, nextRecommendation)) {
    return createRecommendationFreshnessResult({
      decision: "SUPERSEDE",
      trigger:
        currentRecommendation.destination !== nextRecommendation.destination
          ? "VENUE_RECOMMENDATION_CHANGED"
          : currentRecommendation.action !== nextRecommendation.action
            ? "MOVE_CHANGED"
            : "CREW_CHANGED",
      reason:
        "Authoritative recommendation identity changed, so the current recommendation should be replaced.",
      sources: ["RECOMMENDATION"],
      currentRecommendation,
    });
  }

  // TWINCORE_RECOMMENDATION_FRESHNESS_REFRESH_R14_6C
  if (
    !sameRecommendationPresentation(currentRecommendation, nextRecommendation)
  ) {
    return createRecommendationFreshnessResult({
      decision: "REFRESH",
      trigger: "VENUE_FIT_CHANGED",
      reason:
        "The recommendation remains the same, but supporting evidence or presentation-relevant facts changed.",
      sources: ["RECOMMENDATION", "VENUE_FIT"],
      currentRecommendation,
    });
  }

  // TWINCORE_RECOMMENDATION_FRESHNESS_KEEP_R14_6C
  return createRecommendationFreshnessResult({
    decision: "KEEP",
    trigger: "NONE",
    reason:
      "The current recommendation remains supported and materially unchanged.",
    sources: ["RECOMMENDATION"],
    currentRecommendation,
  });
}
