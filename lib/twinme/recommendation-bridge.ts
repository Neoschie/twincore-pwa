export type TwinMeRecommendationLane =
  "SAFETY" | "CONTEXT" | "CREW" | "VENUE" | "MOVE" | "HOLD";

export type TwinMeRecommendationConfidence =
  "unknown" | "low" | "medium" | "high";

export type TwinMeRecommendationSource =
  | "TONIGHT_CONTEXT"
  | "CREW"
  | "VENUE_RECOMMENDATION"
  | "VENUE_FIT"
  | "MOVE_CANDIDATE"
  | "SAFETY";

export type TwinMeRecommendationAction =
  | "CHECK_CREW"
  | "ADD_CONTEXT"
  | "REVIEW_CREW"
  | "REVIEW_SPOT"
  | "MOVE_TO_SPOT"
  | "STAY"
  | "WAIT"
  | "EXIT"
  | "NONE";

export type SharedTwinMeRecommendation = {
  /**
   * R14.4 — Canonical recommendation orchestration contract.
   *
   * This contract DOES NOT independently:
   * - rank venues
   * - score Crew members
   * - make movement decisions
   * - replace safety intelligence
   *
   * It carries the strongest trustworthy next recommendation
   * produced by existing TwinCore intelligence.
   */
  lane: TwinMeRecommendationLane;

  /**
   * Primary user-facing recommendation.
   */
  headline: string;
  message: string;

  /**
   * Canonical action represented by the recommendation.
   */
  action: TwinMeRecommendationAction;

  /**
   * Verified destination only when an existing intelligence
   * source has already established one.
   */
  destination: string | null;

  /**
   * Crew names only when existing Crew intelligence
   * has already established them.
   */
  crewNames: string[];

  /**
   * Explainability evidence inherited from real intelligence.
   * Never fabricate reasons to make a recommendation look stronger.
   */
  reasons: string[];

  /**
   * Which existing TwinCore systems materially support
   * this recommendation.
   */
  sources: TwinMeRecommendationSource[];

  /**
   * Confidence in the orchestrated recommendation itself.
   *
   * UNKNOWN must remain possible when evidence is incomplete.
   */
  confidence: TwinMeRecommendationConfidence;

  /**
   * Existing authoritative confidence values may pass through
   * for explainability. They must not be silently blended into
   * a new competing score.
   */
  venueMatchConfidence: number | null;
  moveDecisionConfidence: "low" | "medium" | "high" | null;

  /**
   * True when current Venue Fit has meaningful evidence.
   */
  hasMeaningfulVenueFit: boolean;

  /**
   * Safety always retains veto authority.
   *
   * When true, downstream presentation must not turn the
   * recommendation into an ordinary nightlife suggestion.
   */
  safetyOverride: boolean;

  /**
   * True only when the recommendation is supported strongly
   * enough to present as an actionable next move.
   *
   * UNKNOWN / incomplete evidence may keep this false.
   */
  actionable: boolean;

  /**
   * Cross-module freshness.
   */
  updatedAt: string;
};

const STORAGE_KEY = "twincore_recommendation_v1";
const UPDATE_EVENT = "twincore-recommendation-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

function isValidLane(value: unknown): value is TwinMeRecommendationLane {
  return (
    typeof value === "string" &&
    ["SAFETY", "CONTEXT", "CREW", "VENUE", "MOVE", "HOLD"].includes(value)
  );
}

function isValidConfidence(
  value: unknown,
): value is TwinMeRecommendationConfidence {
  return (
    typeof value === "string" &&
    ["unknown", "low", "medium", "high"].includes(value)
  );
}

function isValidAction(value: unknown): value is TwinMeRecommendationAction {
  return (
    typeof value === "string" &&
    [
      "CHECK_CREW",
      "ADD_CONTEXT",
      "REVIEW_CREW",
      "REVIEW_SPOT",
      "MOVE_TO_SPOT",
      "STAY",
      "WAIT",
      "EXIT",
      "NONE",
    ].includes(value)
  );
}

function isValidSource(value: unknown): value is TwinMeRecommendationSource {
  return (
    typeof value === "string" &&
    [
      "TONIGHT_CONTEXT",
      "CREW",
      "VENUE_RECOMMENDATION",
      "VENUE_FIT",
      "MOVE_CANDIDATE",
      "SAFETY",
    ].includes(value)
  );
}

export function readTwinMeRecommendation(): SharedTwinMeRecommendation | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SharedTwinMeRecommendation;

    if (
      !parsed ||
      !isValidLane(parsed.lane) ||
      typeof parsed.headline !== "string" ||
      typeof parsed.message !== "string" ||
      !isValidAction(parsed.action) ||
      !Array.isArray(parsed.crewNames) ||
      !Array.isArray(parsed.reasons) ||
      !Array.isArray(parsed.sources) ||
      !isValidConfidence(parsed.confidence) ||
      typeof parsed.hasMeaningfulVenueFit !== "boolean" ||
      typeof parsed.safetyOverride !== "boolean" ||
      typeof parsed.actionable !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return {
      ...parsed,

      destination:
        typeof parsed.destination === "string" ? parsed.destination : null,

      crewNames: parsed.crewNames.filter(
        (name): name is string => typeof name === "string",
      ),

      reasons: parsed.reasons.filter(
        (reason): reason is string => typeof reason === "string",
      ),

      sources: parsed.sources.filter(isValidSource),

      venueMatchConfidence:
        typeof parsed.venueMatchConfidence === "number" &&
        Number.isFinite(parsed.venueMatchConfidence)
          ? parsed.venueMatchConfidence
          : null,

      moveDecisionConfidence:
        parsed.moveDecisionConfidence === "low" ||
        parsed.moveDecisionConfidence === "medium" ||
        parsed.moveDecisionConfidence === "high"
          ? parsed.moveDecisionConfidence
          : null,
    };
  } catch {
    return null;
  }
}

export function publishTwinMeRecommendation(
  recommendation: Omit<SharedTwinMeRecommendation, "updatedAt">,
) {
  if (!isBrowser()) return;

  const payload: SharedTwinMeRecommendation = {
    ...recommendation,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  window.dispatchEvent(
    new CustomEvent(UPDATE_EVENT, {
      detail: payload,
    }),
  );
}

export function subscribeToTwinMeRecommendation(listener: () => void) {
  if (!isBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(UPDATE_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(UPDATE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}
