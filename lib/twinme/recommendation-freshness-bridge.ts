import type { SharedTwinMeRecommendation } from "@/lib/twinme/recommendation-bridge";

// TWINCORE_RECOMMENDATION_FRESHNESS_CONTRACT_R14_6B

/**
 * Canonical lifecycle vocabulary for an already-issued
 * TwinMe recommendation.
 *
 * R14.6 does not rank venues, score Crew, make movement
 * decisions, or replace safety intelligence.
 *
 * It decides what should happen to the CURRENT canonical
 * recommendation when its supporting intelligence changes.
 */
export type RecommendationFreshnessDecision =
  "KEEP" | "REFRESH" | "SUPERSEDE" | "EXPIRE" | "HOLD";

export type RecommendationFreshnessTrigger =
  | "NONE"
  | "TONIGHT_CONTEXT_CHANGED"
  | "CREW_CHANGED"
  | "VENUE_RECOMMENDATION_CHANGED"
  | "VENUE_FIT_CHANGED"
  | "MOVE_CHANGED"
  | "SAFETY_CHANGED"
  | "SOURCE_STALE"
  | "SOURCE_MISSING";

export type RecommendationFreshnessSource =
  | "RECOMMENDATION"
  | "TONIGHT_CONTEXT"
  | "CREW"
  | "VENUE_RECOMMENDATION"
  | "VENUE_FIT"
  | "MOVE_CANDIDATE"
  | "SAFETY";

export type RecommendationFreshnessSourceState = {
  source: RecommendationFreshnessSource;

  /**
   * Timestamp supplied by the source itself when one exists.
   *
   * null means freshness is unknown rather than fabricated.
   */
  updatedAt: string | number | null;

  /**
   * True only when the source explicitly exposes stale state.
   * null means the source does not currently establish it.
   */
  stale: boolean | null;

  /**
   * True when the source currently provides meaningful evidence
   * required by the recommendation.
   */
  available: boolean;
};

export type RecommendationFreshnessResult = {
  /**
   * Lifecycle decision for the recommendation currently
   * being delivered by TwinMe.
   */
  decision: RecommendationFreshnessDecision;

  /**
   * Primary reason the lifecycle decision was made.
   */
  trigger: RecommendationFreshnessTrigger;

  /**
   * Human-readable explanation derived from real evidence.
   */
  reason: string;

  /**
   * Sources materially involved in the freshness decision.
   */
  sources: RecommendationFreshnessSource[];

  /**
   * Existing recommendation before freshness evaluation.
   *
   * The freshness layer does not mutate or recreate its
   * recommendation intelligence.
   */
  currentRecommendation: SharedTwinMeRecommendation | null;

  /**
   * Timestamp of this lifecycle evaluation.
   */
  evaluatedAt: string;
};

/**
 * TWINCORE_RECOMMENDATION_FRESHNESS_SEMANTICS_R14_6B
 *
 * KEEP
 * Current recommendation remains supported and materially unchanged.
 *
 * REFRESH
 * Same recommendation remains appropriate, but supporting evidence
 * or presentation-relevant facts have changed.
 *
 * SUPERSEDE
 * New authoritative intelligence establishes a materially different
 * recommendation that should replace the current one.
 *
 * EXPIRE
 * Required supporting intelligence is no longer trustworthy or
 * available and the recommendation should no longer be presented
 * as current.
 *
 * HOLD
 * TwinCore does not currently have enough trustworthy evidence to
 * confidently keep, refresh, or supersede the recommendation.
 */
export const RECOMMENDATION_FRESHNESS_DECISIONS: readonly RecommendationFreshnessDecision[] =
  ["KEEP", "REFRESH", "SUPERSEDE", "EXPIRE", "HOLD"] as const;

export function createRecommendationFreshnessResult(input: {
  decision: RecommendationFreshnessDecision;
  trigger: RecommendationFreshnessTrigger;
  reason: string;
  sources: RecommendationFreshnessSource[];
  currentRecommendation: SharedTwinMeRecommendation | null;
}): RecommendationFreshnessResult {
  return {
    ...input,
    evaluatedAt: new Date().toISOString(),
  };
}

// TWINCORE_RECOMMENDATION_FRESHNESS_OBSERVABILITY_R14_6F1

const FRESHNESS_STORAGE_KEY = "twincore_recommendation_freshness_v1";

const FRESHNESS_UPDATE_EVENT = "twincore-recommendation-freshness-updated";

function freshnessIsBrowser() {
  return typeof window !== "undefined";
}

export function publishRecommendationFreshness(
  result: RecommendationFreshnessResult,
) {
  if (!freshnessIsBrowser()) return;

  window.localStorage.setItem(FRESHNESS_STORAGE_KEY, JSON.stringify(result));

  window.dispatchEvent(
    new CustomEvent(FRESHNESS_UPDATE_EVENT, {
      detail: result,
    }),
  );
}

export function readRecommendationFreshness(): RecommendationFreshnessResult | null {
  if (!freshnessIsBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(FRESHNESS_STORAGE_KEY);

    if (!raw) return null;

    return JSON.parse(raw) as RecommendationFreshnessResult;
  } catch {
    return null;
  }
}
