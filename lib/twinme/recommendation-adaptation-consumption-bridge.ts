// TWINCORE_RECOMMENDATION_ADAPTATION_CONSUMPTION_CONTRACT_R14_10B
//
// R14.10 establishes a bounded advisory boundary between
// recommendation adaptation and existing authoritative intelligence.
//
// Adaptation may INFORM.
// Adaptation must never COMMAND.
//
// This contract does NOT:
// - rank venues
// - create venue scores
// - create Move decisions
// - score Crew
// - override Safety
// - publish recommendations
// - write TwinMe Memory
// - modify Predictive intelligence
// - modify Autonomy intelligence

import type {
  RecommendationAdaptationDirection,
  RecommendationAdaptationRecord,
} from "@/lib/twinme/recommendation-adaptation-bridge";

export type RecommendationAdaptationConsumptionInfluence =
  "NONE" | "WEAK" | "BOUNDED";

export type RecommendationAdaptationConsumptionHint = {
  recommendationUpdatedAt: string;
  lane: string;
  action: string;
  destination: string | null;

  sourceDirection: RecommendationAdaptationDirection;

  /**
   * Advisory influence only.
   *
   * NONE:
   * No preference influence is permitted.
   *
   * WEAK:
   * A weak preference hint may be considered by an existing
   * authoritative intelligence layer, but can never determine
   * an outcome by itself.
   *
   * BOUNDED:
   * Verified preference evidence may inform an existing
   * authoritative intelligence layer, but remains subordinate
   * to that layer's own evidence and rules.
   */
  influence: RecommendationAdaptationConsumptionInfluence;

  preferenceEligible: boolean;

  /**
   * Structural authority guards.
   *
   * These remain false at the consumption boundary.
   */
  mayCreateVenueScore: false;
  mayCreateMoveDecision: false;
  mayScoreCrew: false;
  mayOverrideSafety: false;

  reason: string;
  observedAt: string;
};

// TWINCORE_RECOMMENDATION_ADAPTATION_CONSUMPTION_SEMANTICS_R14_10B
//
// R14.9 direction → R14.10 bounded consumption:
//
// NONE
//   → NONE
//   → zero preference influence
//
// WEAK_POSITIVE
//   → WEAK
//   → weak advisory preference evidence only
//
// POSITIVE
//   → BOUNDED
//   → advisory positive evidence
//
// STRONG_POSITIVE
//   → BOUNDED
//   → stronger evidence, still not authority
//
// WEAK_NEGATIVE
//   → WEAK
//   → weak advisory negative evidence only
//
// NEGATIVE
//   → BOUNDED
//   → advisory negative evidence
//
// No direction may independently:
// - create a venue score
// - select a venue
// - create a Move decision
// - score Crew
// - override Safety

export function createRecommendationAdaptationConsumptionHint(
  adaptation: RecommendationAdaptationRecord,
): RecommendationAdaptationConsumptionHint {
  let influence: RecommendationAdaptationConsumptionInfluence = "NONE";
  let preferenceEligible = adaptation.preferenceEligible;
  let reason = adaptation.reason;

  switch (adaptation.direction) {
    case "NONE":
      influence = "NONE";
      preferenceEligible = false;
      reason =
        "Neutral adaptation has zero preference influence at the consumption boundary.";
      break;

    case "WEAK_POSITIVE":
      influence = "WEAK";
      reason =
        "Weak positive adaptation is advisory preference evidence only and cannot determine an intelligence outcome.";
      break;

    case "POSITIVE":
      influence = "BOUNDED";
      reason =
        "Positive adaptation may inform existing intelligence but cannot determine an outcome independently.";
      break;

    case "STRONG_POSITIVE":
      influence = "BOUNDED";
      reason =
        "Strong positive adaptation remains bounded evidence and does not acquire recommendation authority.";
      break;

    case "WEAK_NEGATIVE":
      influence = "WEAK";
      reason =
        "Weak negative adaptation is advisory preference evidence only and cannot determine an intelligence outcome.";
      break;

    case "NEGATIVE":
      influence = "BOUNDED";
      reason =
        "Negative adaptation may inform existing intelligence but cannot determine an outcome independently.";
      break;
  }

  // Defense in depth:
  // an adaptation record that is not preference-eligible cannot
  // regain preference influence at this downstream boundary.
  if (!adaptation.preferenceEligible) {
    influence = "NONE";
    preferenceEligible = false;
  }

  return {
    recommendationUpdatedAt: adaptation.recommendationUpdatedAt,
    lane: adaptation.lane,
    action: adaptation.action,
    destination: adaptation.destination,

    sourceDirection: adaptation.direction,

    influence,
    preferenceEligible,

    mayCreateVenueScore: false,
    mayCreateMoveDecision: false,
    mayScoreCrew: false,
    mayOverrideSafety: false,

    reason,
    observedAt: adaptation.observedAt,
  };
}

// TWINCORE_RECOMMENDATION_ADAPTATION_CONSUMPTION_PERSISTENCE_R14_10C
//
// Canonical browser persistence for the latest bounded adaptation
// consumption hint.
//
// Persistence does not increase adaptation authority.
// A persisted hint remains advisory and retains all R14.10B guards.

const RECOMMENDATION_ADAPTATION_CONSUMPTION_STORAGE_KEY =
  "twincore_recommendation_adaptation_consumption_v1";

const RECOMMENDATION_ADAPTATION_CONSUMPTION_UPDATE_EVENT =
  "twincore-recommendation-adaptation-consumption-updated";

const RECOMMENDATION_ADAPTATION_CONSUMPTION_INFLUENCES: readonly RecommendationAdaptationConsumptionInfluence[] =
  ["NONE", "WEAK", "BOUNDED"];

function isRecommendationAdaptationConsumptionBrowser() {
  return typeof window !== "undefined";
}

function isRecommendationAdaptationConsumptionInfluence(
  value: unknown,
): value is RecommendationAdaptationConsumptionInfluence {
  return (
    typeof value === "string" &&
    RECOMMENDATION_ADAPTATION_CONSUMPTION_INFLUENCES.includes(
      value as RecommendationAdaptationConsumptionInfluence,
    )
  );
}

// TWINCORE_RECOMMENDATION_ADAPTATION_CONSUMPTION_READ_R14_10C
export function readRecommendationAdaptationConsumption(): RecommendationAdaptationConsumptionHint | null {
  if (!isRecommendationAdaptationConsumptionBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(
      RECOMMENDATION_ADAPTATION_CONSUMPTION_STORAGE_KEY,
    );

    if (!raw) return null;

    const parsed = JSON.parse(raw) as RecommendationAdaptationConsumptionHint;

    if (
      !parsed ||
      typeof parsed.recommendationUpdatedAt !== "string" ||
      typeof parsed.lane !== "string" ||
      typeof parsed.action !== "string" ||
      !isRecommendationAdaptationConsumptionInfluence(parsed.influence) ||
      typeof parsed.preferenceEligible !== "boolean" ||
      parsed.mayCreateVenueScore !== false ||
      parsed.mayCreateMoveDecision !== false ||
      parsed.mayScoreCrew !== false ||
      parsed.mayOverrideSafety !== false ||
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

// TWINCORE_RECOMMENDATION_ADAPTATION_CONSUMPTION_PUBLISH_R14_10C
export function publishRecommendationAdaptationConsumption(
  hint: RecommendationAdaptationConsumptionHint,
) {
  if (!isRecommendationAdaptationConsumptionBrowser()) return;

  // Defense in depth:
  // never persist a hint that claims authority forbidden by R14.10B.
  if (
    hint.mayCreateVenueScore !== false ||
    hint.mayCreateMoveDecision !== false ||
    hint.mayScoreCrew !== false ||
    hint.mayOverrideSafety !== false
  ) {
    return;
  }

  window.localStorage.setItem(
    RECOMMENDATION_ADAPTATION_CONSUMPTION_STORAGE_KEY,
    JSON.stringify(hint),
  );

  window.dispatchEvent(
    new CustomEvent(RECOMMENDATION_ADAPTATION_CONSUMPTION_UPDATE_EVENT, {
      detail: hint,
    }),
  );
}

// TWINCORE_RECOMMENDATION_ADAPTATION_CONSUMPTION_SUBSCRIPTION_R14_10C
export function subscribeToRecommendationAdaptationConsumption(
  listener: () => void,
) {
  if (!isRecommendationAdaptationConsumptionBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === RECOMMENDATION_ADAPTATION_CONSUMPTION_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(
    RECOMMENDATION_ADAPTATION_CONSUMPTION_UPDATE_EVENT,
    listener,
  );
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(
      RECOMMENDATION_ADAPTATION_CONSUMPTION_UPDATE_EVENT,
      listener,
    );
    window.removeEventListener("storage", handleStorage);
  };
}
