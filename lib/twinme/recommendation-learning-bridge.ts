import type {
  RecommendationOutcomeRecord,
  RecommendationOutcomeState,
} from "@/lib/twinme/recommendation-outcome-bridge";

// TWINCORE_RECOMMENDATION_LEARNING_CONTRACT_R14_8B
//
// R14.8 converts VERIFIED recommendation outcomes into bounded
// learning signals.
//
// This layer does NOT:
// - recreate recommendation intelligence
// - recreate Crew learning
// - write TwinMe Memory
// - modify Predictive intelligence
// - modify Autonomy
// - infer ACTED_ON or COMPLETED
//
// It describes only what an authoritative R14.7 outcome is
// permitted to mean at the recommendation-learning boundary.

export type RecommendationLearningSignal =
  | "OBSERVATION"
  | "INTEREST"
  | "POSITIVE_BEHAVIOR"
  | "POSITIVE_OUTCOME"
  | "NEGATIVE_EXPLICIT"
  | "NEGATIVE_PASSIVE"
  | "SYSTEM_NEUTRAL";

export type RecommendationLearningStrength =
  "none" | "weak" | "moderate" | "strong";

export type RecommendationLearningRecord = {
  recommendationUpdatedAt: string;

  lane: RecommendationOutcomeRecord["lane"];
  action: RecommendationOutcomeRecord["action"];
  destination: string | null;

  outcomeState: RecommendationOutcomeState;

  signal: RecommendationLearningSignal;
  strength: RecommendationLearningStrength;

  userPreferenceEvidence: boolean;
  successEvidence: boolean;

  reason: string;

  observedAt: string;
};

// TWINCORE_RECOMMENDATION_LEARNING_SEMANTICS_R14_8B
//
// PRESENTED
// Exposure only. No preference or success inference.
//
// ENGAGED
// Interaction / interest evidence only.
// Engagement MUST NOT be interpreted as recommendation success.
//
// ACTED_ON
// Authoritative evidence that the user followed the recommendation.
// Positive behavioral evidence, but not completion.
//
// COMPLETED
// Strongest positive outcome evidence available in R14.7.
// Requires explicit or authoritative completion evidence.
//
// DISMISSED
// Explicit negative response to this recommendation.
// This is negative evidence, not a permanent preference.
//
// IGNORED
// Passive negative/non-response evidence established by an
// authoritative observer. Weaker than explicit dismissal.
//
// SUPERSEDED
// System lifecycle event. Neutral for user preference.
//
// EXPIRED
// System lifecycle event. Neutral for user preference.

export function classifyRecommendationLearning(
  outcome: RecommendationOutcomeRecord,
): RecommendationLearningRecord {
  switch (outcome.state) {
    case "PRESENTED":
      return {
        ...baseRecord(outcome),
        signal: "OBSERVATION",
        strength: "none",
        userPreferenceEvidence: false,
        successEvidence: false,
        reason:
          "The recommendation was presented. Exposure alone is not preference or success evidence.",
      };

    case "ENGAGED":
      return {
        ...baseRecord(outcome),
        signal: "INTEREST",
        strength: "weak",
        userPreferenceEvidence: true,
        successEvidence: false,
        reason:
          "The user engaged with the recommendation. This establishes interest, not success.",
      };

    case "ACTED_ON":
      return {
        ...baseRecord(outcome),
        signal: "POSITIVE_BEHAVIOR",
        strength: "moderate",
        userPreferenceEvidence: true,
        successEvidence: false,
        reason:
          "Authoritative evidence indicates the user followed the recommendation, but completion is not established.",
      };

    case "COMPLETED":
      return {
        ...baseRecord(outcome),
        signal: "POSITIVE_OUTCOME",
        strength: "strong",
        userPreferenceEvidence: true,
        successEvidence: true,
        reason:
          "Authoritative evidence establishes completion of the recommended action.",
      };

    case "DISMISSED":
      return {
        ...baseRecord(outcome),
        signal: "NEGATIVE_EXPLICIT",
        strength: "moderate",
        userPreferenceEvidence: true,
        successEvidence: false,
        reason:
          "The user explicitly dismissed this recommendation. This is bounded negative evidence.",
      };

    case "IGNORED":
      return {
        ...baseRecord(outcome),
        signal: "NEGATIVE_PASSIVE",
        strength: "weak",
        userPreferenceEvidence: true,
        successEvidence: false,
        reason:
          "Authoritative observation established no action. This is weak passive negative evidence.",
      };

    case "SUPERSEDED":
      return {
        ...baseRecord(outcome),
        signal: "SYSTEM_NEUTRAL",
        strength: "none",
        userPreferenceEvidence: false,
        successEvidence: false,
        reason:
          "Freshness replaced the recommendation. This is a system lifecycle event, not user preference evidence.",
      };

    case "EXPIRED":
      return {
        ...baseRecord(outcome),
        signal: "SYSTEM_NEUTRAL",
        strength: "none",
        userPreferenceEvidence: false,
        successEvidence: false,
        reason:
          "Freshness expired the recommendation. This is a system lifecycle event, not user preference evidence.",
      };
  }
}

function baseRecord(
  outcome: RecommendationOutcomeRecord,
): Pick<
  RecommendationLearningRecord,
  | "recommendationUpdatedAt"
  | "lane"
  | "action"
  | "destination"
  | "outcomeState"
  | "observedAt"
> {
  return {
    recommendationUpdatedAt: outcome.recommendationUpdatedAt,
    lane: outcome.lane,
    action: outcome.action,
    destination: outcome.destination,
    outcomeState: outcome.state,
    observedAt: outcome.observedAt,
  };
}

// ======================================================
// TWINCORE_RECOMMENDATION_LEARNING_PERSISTENCE_R14_8C
// ======================================================
//
// Canonical browser persistence for recommendation-learning signals.
//
// This persistence layer stores the semantic interpretation produced
// by R14.8B. It does not apply adaptation, update Memory, modify
// Predictive intelligence, modify Autonomy, or change recommendation
// ranking.

const RECOMMENDATION_LEARNING_STORAGE_KEY =
  "twincore_recommendation_learning_v1";

const RECOMMENDATION_LEARNING_UPDATE_EVENT =
  "twincore-recommendation-learning-updated";

function isRecommendationLearningBrowser() {
  return typeof window !== "undefined";
}

const RECOMMENDATION_LEARNING_SIGNALS: readonly RecommendationLearningSignal[] =
  [
    "OBSERVATION",
    "INTEREST",
    "POSITIVE_BEHAVIOR",
    "POSITIVE_OUTCOME",
    "NEGATIVE_EXPLICIT",
    "NEGATIVE_PASSIVE",
    "SYSTEM_NEUTRAL",
  ] as const;

const RECOMMENDATION_LEARNING_STRENGTHS: readonly RecommendationLearningStrength[] =
  ["none", "weak", "moderate", "strong"] as const;

function isRecommendationLearningSignal(
  value: unknown,
): value is RecommendationLearningSignal {
  return (
    typeof value === "string" &&
    RECOMMENDATION_LEARNING_SIGNALS.includes(
      value as RecommendationLearningSignal,
    )
  );
}

function isRecommendationLearningStrength(
  value: unknown,
): value is RecommendationLearningStrength {
  return (
    typeof value === "string" &&
    RECOMMENDATION_LEARNING_STRENGTHS.includes(
      value as RecommendationLearningStrength,
    )
  );
}

// TWINCORE_RECOMMENDATION_LEARNING_READ_R14_8C
export function readRecommendationLearning(): RecommendationLearningRecord | null {
  if (!isRecommendationLearningBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(
      RECOMMENDATION_LEARNING_STORAGE_KEY,
    );

    if (!raw) return null;

    const parsed = JSON.parse(raw) as RecommendationLearningRecord;

    if (
      !parsed ||
      typeof parsed.recommendationUpdatedAt !== "string" ||
      typeof parsed.lane !== "string" ||
      typeof parsed.action !== "string" ||
      typeof parsed.outcomeState !== "string" ||
      !isRecommendationLearningSignal(parsed.signal) ||
      !isRecommendationLearningStrength(parsed.strength) ||
      typeof parsed.userPreferenceEvidence !== "boolean" ||
      typeof parsed.successEvidence !== "boolean" ||
      typeof parsed.reason !== "string" ||
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

// TWINCORE_RECOMMENDATION_LEARNING_PUBLISH_R14_8C
export function publishRecommendationLearning(
  learning: RecommendationLearningRecord,
) {
  if (!isRecommendationLearningBrowser()) return;

  window.localStorage.setItem(
    RECOMMENDATION_LEARNING_STORAGE_KEY,
    JSON.stringify(learning),
  );

  window.dispatchEvent(
    new CustomEvent(RECOMMENDATION_LEARNING_UPDATE_EVENT, {
      detail: learning,
    }),
  );
}

// TWINCORE_RECOMMENDATION_LEARNING_SUBSCRIPTION_R14_8C
export function subscribeToRecommendationLearning(listener: () => void) {
  if (!isRecommendationLearningBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === RECOMMENDATION_LEARNING_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(RECOMMENDATION_LEARNING_UPDATE_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(RECOMMENDATION_LEARNING_UPDATE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}
