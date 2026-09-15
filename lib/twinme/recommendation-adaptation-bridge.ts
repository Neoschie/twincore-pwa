// TWINCORE_RECOMMENDATION_ADAPTATION_CONTRACT_R14_9B
//
// R14.9 converts verified recommendation-learning evidence into
// bounded advisory input for existing TwinCore intelligence.
//
// This boundary DOES NOT:
// - create a recommendation
// - rank venues
// - make a movement decision
// - score Crew
// - override Safety
// - write TwinMe Memory
// - modify Predictive intelligence
// - modify Autonomy
// - recreate recommendation-learning semantics
//
// Learning may inform existing intelligence.
// It must never seize authority.

import type {
  RecommendationLearningRecord,
  RecommendationLearningSignal,
} from "./recommendation-learning-bridge";

export type RecommendationAdaptationDirection =
  | "NONE"
  | "WEAK_POSITIVE"
  | "POSITIVE"
  | "STRONG_POSITIVE"
  | "WEAK_NEGATIVE"
  | "NEGATIVE";

export type RecommendationAdaptationRecord = {
  recommendationUpdatedAt: string;
  lane: RecommendationLearningRecord["lane"];
  action: RecommendationLearningRecord["action"];
  destination: string | null;

  sourceSignal: RecommendationLearningSignal;
  direction: RecommendationAdaptationDirection;

  /**
   * Whether this signal is permitted to inform future preference-sensitive
   * intelligence. This never grants authority over Safety, Move, Venue,
   * Crew, or recommendation orchestration.
   */
  preferenceEligible: boolean;

  /**
   * Explicit guard proving this record can never override Safety.
   */
  safetyOverrideAllowed: false;

  reason: string;
  observedAt: string;
};

// TWINCORE_RECOMMENDATION_ADAPTATION_SEMANTICS_R14_9B
//
// OBSERVATION
// Exposure alone carries no adaptation.
//
// INTEREST
// Weak positive preference evidence only.
// Engagement is NOT success.
//
// POSITIVE_BEHAVIOR
// Positive behavioral evidence, but NOT completion.
//
// POSITIVE_OUTCOME
// Strongest verified positive adaptation evidence.
//
// NEGATIVE_EXPLICIT
// Bounded explicit negative evidence.
//
// NEGATIVE_PASSIVE
// Weak negative evidence only.
//
// SYSTEM_NEUTRAL
// Lifecycle-only evidence. Never preference eligible.

export function createRecommendationAdaptation(
  learning: RecommendationLearningRecord,
): RecommendationAdaptationRecord {
  const base = {
    recommendationUpdatedAt: learning.recommendationUpdatedAt,
    lane: learning.lane,
    action: learning.action,
    destination: learning.destination,
    sourceSignal: learning.signal,
    safetyOverrideAllowed: false as const,
    observedAt: learning.observedAt,
  };

  switch (learning.signal) {
    case "OBSERVATION":
      return {
        ...base,
        direction: "NONE",
        preferenceEligible: false,
        reason:
          "Presentation alone does not establish a preference and must not adapt future recommendations.",
      };

    case "INTEREST":
      return {
        ...base,
        direction: "WEAK_POSITIVE",
        preferenceEligible: learning.userPreferenceEvidence,
        reason:
          "Engagement provides weak interest evidence only. It is not recommendation success.",
      };

    case "POSITIVE_BEHAVIOR":
      return {
        ...base,
        direction: "POSITIVE",
        preferenceEligible: learning.userPreferenceEvidence,
        reason:
          "Verified user behavior provides positive evidence without implying completion.",
      };

    case "POSITIVE_OUTCOME":
      return {
        ...base,
        direction: "STRONG_POSITIVE",
        preferenceEligible: learning.userPreferenceEvidence,
        reason:
          "Verified completion provides strong positive adaptation evidence.",
      };

    case "NEGATIVE_EXPLICIT":
      return {
        ...base,
        direction: "NEGATIVE",
        preferenceEligible: learning.userPreferenceEvidence,
        reason:
          "Explicit dismissal provides bounded negative preference evidence.",
      };

    case "NEGATIVE_PASSIVE":
      return {
        ...base,
        direction: "WEAK_NEGATIVE",
        preferenceEligible: learning.userPreferenceEvidence,
        reason: "Passive non-engagement provides weak negative evidence only.",
      };

    case "SYSTEM_NEUTRAL":
      return {
        ...base,
        direction: "NONE",
        preferenceEligible: false,
        reason:
          "System lifecycle events are neutral and must never alter user preference.",
      };
  }
}

// TWINCORE_RECOMMENDATION_ADAPTATION_PERSISTENCE_R14_9C
//
// Canonical browser persistence for bounded recommendation adaptation.
//
// This layer stores and exposes the adaptation record created by R14.9B.
// It DOES NOT:
// - apply adaptation to recommendation ranking
// - modify Move intelligence
// - modify Venue intelligence
// - modify Crew intelligence
// - override Safety
// - write TwinMe Memory
// - modify Predictive intelligence
// - modify Autonomy

const RECOMMENDATION_ADAPTATION_STORAGE_KEY =
  "twincore_recommendation_adaptation_v1";

const RECOMMENDATION_ADAPTATION_UPDATE_EVENT =
  "twincore-recommendation-adaptation-updated";

function isRecommendationAdaptationBrowser() {
  return typeof window !== "undefined";
}

const RECOMMENDATION_ADAPTATION_DIRECTIONS: readonly RecommendationAdaptationDirection[] =
  [
    "NONE",
    "WEAK_POSITIVE",
    "POSITIVE",
    "STRONG_POSITIVE",
    "WEAK_NEGATIVE",
    "NEGATIVE",
  ];

function isRecommendationAdaptationDirection(
  value: unknown,
): value is RecommendationAdaptationDirection {
  return (
    typeof value === "string" &&
    RECOMMENDATION_ADAPTATION_DIRECTIONS.includes(
      value as RecommendationAdaptationDirection,
    )
  );
}

const RECOMMENDATION_ADAPTATION_SOURCE_SIGNALS: readonly RecommendationLearningSignal[] =
  [
    "OBSERVATION",
    "INTEREST",
    "POSITIVE_BEHAVIOR",
    "POSITIVE_OUTCOME",
    "NEGATIVE_EXPLICIT",
    "NEGATIVE_PASSIVE",
    "SYSTEM_NEUTRAL",
  ];

function isRecommendationAdaptationSourceSignal(
  value: unknown,
): value is RecommendationLearningSignal {
  return (
    typeof value === "string" &&
    RECOMMENDATION_ADAPTATION_SOURCE_SIGNALS.includes(
      value as RecommendationLearningSignal,
    )
  );
}

// TWINCORE_RECOMMENDATION_ADAPTATION_READ_R14_9C
export function readRecommendationAdaptation(): RecommendationAdaptationRecord | null {
  if (!isRecommendationAdaptationBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(
      RECOMMENDATION_ADAPTATION_STORAGE_KEY,
    );

    if (!raw) return null;

    const parsed = JSON.parse(raw) as RecommendationAdaptationRecord;

    if (
      !parsed ||
      typeof parsed.recommendationUpdatedAt !== "string" ||
      typeof parsed.lane !== "string" ||
      typeof parsed.action !== "string" ||
      !isRecommendationAdaptationSourceSignal(parsed.sourceSignal) ||
      !isRecommendationAdaptationDirection(parsed.direction) ||
      typeof parsed.preferenceEligible !== "boolean" ||
      parsed.safetyOverrideAllowed !== false ||
      typeof parsed.reason !== "string" ||
      typeof parsed.observedAt !== "string"
    ) {
      return null;
    }

    return {
      ...parsed,
      destination:
        typeof parsed.destination === "string" ? parsed.destination : null,
      safetyOverrideAllowed: false,
    };
  } catch {
    return null;
  }
}

// TWINCORE_RECOMMENDATION_ADAPTATION_PUBLISH_R14_9C
export function publishRecommendationAdaptation(
  adaptation: RecommendationAdaptationRecord,
) {
  if (!isRecommendationAdaptationBrowser()) return;

  const safeAdaptation: RecommendationAdaptationRecord = {
    ...adaptation,
    safetyOverrideAllowed: false,
  };

  window.localStorage.setItem(
    RECOMMENDATION_ADAPTATION_STORAGE_KEY,
    JSON.stringify(safeAdaptation),
  );

  window.dispatchEvent(
    new CustomEvent(RECOMMENDATION_ADAPTATION_UPDATE_EVENT, {
      detail: safeAdaptation,
    }),
  );
}

// TWINCORE_RECOMMENDATION_ADAPTATION_SUBSCRIPTION_R14_9C
export function subscribeToRecommendationAdaptation(listener: () => void) {
  if (!isRecommendationAdaptationBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === RECOMMENDATION_ADAPTATION_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(RECOMMENDATION_ADAPTATION_UPDATE_EVENT, listener);

  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(
      RECOMMENDATION_ADAPTATION_UPDATE_EVENT,
      listener,
    );

    window.removeEventListener("storage", handleStorage);
  };
}
