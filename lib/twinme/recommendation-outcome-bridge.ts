import type {
  SharedTwinMeRecommendation,
  TwinMeRecommendationAction,
  TwinMeRecommendationLane,
} from "@/lib/twinme/recommendation-bridge";

// TWINCORE_RECOMMENDATION_OUTCOME_CONTRACT_R14_7B
//
// R14.7 observes what happens AFTER a canonical recommendation
// is presented. It does not recreate recommendation intelligence,
// Crew learning, Predictive intelligence, Autonomy, or Memory.

export type RecommendationOutcomeState =
  | "PRESENTED"
  | "ENGAGED"
  | "ACTED_ON"
  | "COMPLETED"
  | "DISMISSED"
  | "IGNORED"
  | "SUPERSEDED"
  | "EXPIRED";

export type RecommendationOutcomeEvidence =
  | "RECOMMENDATION_PRESENTED"
  | "RECOMMENDATION_ACTION_CLICKED"
  | "USER_CONFIRMED_ACTION"
  | "USER_CONFIRMED_COMPLETION"
  | "USER_DISMISSED"
  | "OBSERVED_NO_ACTION"
  | "FRESHNESS_SUPERSEDED"
  | "FRESHNESS_EXPIRED";

export type RecommendationOutcomeRecord = {
  /**
   * Identity of the canonical recommendation being observed.
   *
   * R14.7B deliberately uses the recommendation publication
   * timestamp as part of identity because R14.4 currently has
   * no separate recommendation ID.
   */
  recommendationUpdatedAt: string;

  lane: TwinMeRecommendationLane;
  action: TwinMeRecommendationAction;
  destination: string | null;

  /**
   * Outcome state must describe observed user/system behavior.
   *
   * Opening a destination is ENGAGED.
   * It must never be treated as COMPLETED by itself.
   */
  state: RecommendationOutcomeState;

  evidence: RecommendationOutcomeEvidence;

  /**
   * When TwinCore observed this outcome transition.
   */
  observedAt: string;
};

// TWINCORE_RECOMMENDATION_OUTCOME_SEMANTICS_R14_7B
//
// PRESENTED
// Canonical recommendation was made available to the user.
//
// ENGAGED
// User interacted with the recommendation, such as opening the
// recommended destination or Crew surface.
//
// ACTED_ON
// Stronger evidence establishes that the user chose to follow
// the recommendation.
//
// COMPLETED
// Completion is explicitly confirmed or established by a future
// authoritative outcome source.
//
// DISMISSED
// User explicitly rejected/dismissed the recommendation.
//
// IGNORED
// An authoritative future observer establishes no action.
//
// SUPERSEDED
// Freshness intelligence replaced this recommendation.
//
// EXPIRED
// Freshness intelligence invalidated this recommendation.

export const RECOMMENDATION_OUTCOME_STATES: readonly RecommendationOutcomeState[] =
  [
    "PRESENTED",
    "ENGAGED",
    "ACTED_ON",
    "COMPLETED",
    "DISMISSED",
    "IGNORED",
    "SUPERSEDED",
    "EXPIRED",
  ] as const;

export function createRecommendationOutcomeRecord(input: {
  recommendation: SharedTwinMeRecommendation;
  state: RecommendationOutcomeState;
  evidence: RecommendationOutcomeEvidence;
  observedAt?: string;
}): RecommendationOutcomeRecord {
  return {
    recommendationUpdatedAt: input.recommendation.updatedAt,
    lane: input.recommendation.lane,
    action: input.recommendation.action,
    destination: input.recommendation.destination,
    state: input.state,
    evidence: input.evidence,
    observedAt: input.observedAt ?? new Date().toISOString(),
  };
}

// TWINCORE_RECOMMENDATION_OUTCOME_PERSISTENCE_R14_7C
//
// Canonical browser persistence for recommendation outcomes.
//
// This layer records observed recommendation lifecycle events.
// It does NOT decide whether a recommendation was correct,
// score recommendation quality, or perform learning.

const OUTCOME_STORAGE_KEY = "twincore_recommendation_outcome_v1";
const OUTCOME_UPDATE_EVENT = "twincore-recommendation-outcome-updated";

function isOutcomeBrowser() {
  return typeof window !== "undefined";
}

function isRecommendationOutcomeState(
  value: unknown,
): value is RecommendationOutcomeState {
  return (
    typeof value === "string" &&
    RECOMMENDATION_OUTCOME_STATES.includes(value as RecommendationOutcomeState)
  );
}

function isRecommendationOutcomeEvidence(
  value: unknown,
): value is RecommendationOutcomeEvidence {
  return (
    typeof value === "string" &&
    [
      "RECOMMENDATION_PRESENTED",
      "RECOMMENDATION_ACTION_CLICKED",
      "USER_CONFIRMED_ACTION",
      "USER_CONFIRMED_COMPLETION",
      "USER_DISMISSED",
      "OBSERVED_NO_ACTION",
      "FRESHNESS_SUPERSEDED",
      "FRESHNESS_EXPIRED",
    ].includes(value)
  );
}

// TWINCORE_RECOMMENDATION_OUTCOME_READ_R14_7C
export function readRecommendationOutcome(): RecommendationOutcomeRecord | null {
  if (!isOutcomeBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(OUTCOME_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RecommendationOutcomeRecord;

    if (
      !parsed ||
      typeof parsed.recommendationUpdatedAt !== "string" ||
      typeof parsed.lane !== "string" ||
      typeof parsed.action !== "string" ||
      !isRecommendationOutcomeState(parsed.state) ||
      !isRecommendationOutcomeEvidence(parsed.evidence) ||
      typeof parsed.observedAt !== "string"
    ) {
      return null;
    }

    return {
      ...parsed,
      destination:
        typeof parsed.destination === "string" ? parsed.destination : null,
    };
  } catch {
    return null;
  }
}

// TWINCORE_RECOMMENDATION_OUTCOME_PUBLISH_R14_7C
export function publishRecommendationOutcome(
  outcome: RecommendationOutcomeRecord,
) {
  if (!isOutcomeBrowser()) return;

  window.localStorage.setItem(OUTCOME_STORAGE_KEY, JSON.stringify(outcome));

  window.dispatchEvent(
    new CustomEvent(OUTCOME_UPDATE_EVENT, {
      detail: outcome,
    }),
  );
}

// TWINCORE_RECOMMENDATION_OUTCOME_SUBSCRIPTION_R14_7C
export function subscribeToRecommendationOutcome(listener: () => void) {
  if (!isOutcomeBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === OUTCOME_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(OUTCOME_UPDATE_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(OUTCOME_UPDATE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}
