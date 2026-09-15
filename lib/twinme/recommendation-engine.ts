import type {
  SharedTwinMeRecommendation,
  TwinMeRecommendationConfidence,
} from "@/lib/twinme/recommendation-bridge";

import type { SharedMoveCandidate } from "@/lib/twinme/move-candidate-bridge";
import type { SharedVenueFit } from "@/lib/twinme/venue-fit-bridge";

export type CrewRecommendationInput = {
  available: boolean;
  headline?: string | null;
  message?: string | null;
  actionLabel?: string | null;
  names?: string[];
  safetySensitive?: boolean;
};

export type RecommendationEngineInput = {
  tonight: {
    hasMeaningfulContext: boolean;
  };

  crew: CrewRecommendationInput | null;

  move: Omit<SharedMoveCandidate, "updatedAt"> | null;

  venueFit: Omit<SharedVenueFit, "updatedAt"> | null;
};

export type RecommendationEngineResult = Omit<
  SharedTwinMeRecommendation,
  "updatedAt"
>;

// TWINCORE_RECOMMENDATION_ENGINE_R14_4C

function normalizeConfidence(
  value: "low" | "medium" | "high" | null | undefined,
): TwinMeRecommendationConfidence {
  return value ?? "unknown";
}

function cleanStrings(values: string[] | undefined) {
  return (values ?? []).filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
}

// ======================================================
// TWINCORE_RECOMMENDATION_SAFETY_R14_4C
// Safety retains absolute veto authority.
// ======================================================

function buildSafetyRecommendation(
  move: Omit<SharedMoveCandidate, "updatedAt">,
): RecommendationEngineResult {
  return {
    lane: "SAFETY",
    headline: move.headline,
    message: move.message,
    action: move.decision === "EXIT" ? "EXIT" : "STAY",
    destination: null,
    crewNames: [],
    reasons: cleanStrings(move.reasons),
    sources: ["MOVE_CANDIDATE", "SAFETY"],
    confidence: normalizeConfidence(move.decisionConfidence),
    venueMatchConfidence: move.venueMatchConfidence,
    moveDecisionConfidence: move.decisionConfidence,
    hasMeaningfulVenueFit: false,
    safetyOverride: true,
    actionable: true,
  };
}

// ======================================================
// TWINCORE_RECOMMENDATION_CONTEXT_R14_4C
// Missing Tonight Context blocks false certainty.
// ======================================================

function buildContextRecommendation(): RecommendationEngineResult {
  return {
    lane: "CONTEXT",
    headline: "Give TwinMe tonight's direction.",
    message:
      "TwinMe needs more Tonight Context before turning the available signals into one confident next recommendation.",
    action: "ADD_CONTEXT",
    destination: null,
    crewNames: [],
    reasons: ["Tonight Context is not meaningful enough yet."],
    sources: ["TONIGHT_CONTEXT"],
    confidence: "unknown",
    venueMatchConfidence: null,
    moveDecisionConfidence: null,
    hasMeaningfulVenueFit: false,
    safetyOverride: false,
    actionable: true,
  };
}

// ======================================================
// TWINCORE_RECOMMENDATION_MOVE_R14_4C
// R14.2 remains movement-decision authority.
// ======================================================

function buildMoveRecommendation(
  move: Omit<SharedMoveCandidate, "updatedAt">,
  venueFit: Omit<SharedVenueFit, "updatedAt"> | null,
): RecommendationEngineResult {
  const action =
    move.decision === "MOVE"
      ? "MOVE_TO_SPOT"
      : move.decision === "WAIT"
        ? "WAIT"
        : move.decision === "STAY"
          ? "STAY"
          : "EXIT";

  return {
    lane: "MOVE",
    headline: move.headline,
    message: move.message,
    action,
    destination: move.destination,
    crewNames: [],
    reasons: cleanStrings(move.reasons),
    sources: [
      "MOVE_CANDIDATE",
      ...(venueFit?.hasMeaningfulFit ? (["VENUE_FIT"] as const) : []),
      ...(move.destination ? (["VENUE_RECOMMENDATION"] as const) : []),
    ],
    confidence: normalizeConfidence(move.decisionConfidence),
    venueMatchConfidence: move.venueMatchConfidence,
    moveDecisionConfidence: move.decisionConfidence,
    hasMeaningfulVenueFit: venueFit?.hasMeaningfulFit ?? false,
    safetyOverride: move.safetyOverride,
    actionable: true,
  };
}

// ======================================================
// TWINCORE_RECOMMENDATION_VENUE_R14_4C
// Venue Fit explains; it never replaces Spots ranking.
// ======================================================

function buildVenueRecommendation(
  venueFit: Omit<SharedVenueFit, "updatedAt">,
): RecommendationEngineResult {
  const meaningfulDimensions = venueFit.dimensions.filter(
    (dimension) => dimension.strength !== "unknown",
  );

  const strongest =
    meaningfulDimensions.find((dimension) => dimension.strength === "strong") ??
    meaningfulDimensions.find(
      (dimension) => dimension.strength === "moderate",
    ) ??
    meaningfulDimensions[0];

  return {
    lane: "VENUE",
    headline: venueFit.spotName
      ? `${venueFit.spotName} fits the night.`
      : "TwinMe has a venue read.",
    message:
      strongest?.reason ??
      "TwinMe has meaningful venue-fit evidence, but the next movement decision is not strong enough yet.",
    action: "REVIEW_SPOT",
    destination: venueFit.spotName,
    crewNames: [],
    reasons: [
      ...cleanStrings(venueFit.recommendationReasons),
      ...(strongest?.evidence ?? []),
    ],
    sources: ["VENUE_RECOMMENDATION", "VENUE_FIT"],
    confidence:
      venueFit.matchConfidence !== null && venueFit.matchConfidence >= 80
        ? "high"
        : venueFit.matchConfidence !== null && venueFit.matchConfidence >= 60
          ? "medium"
          : venueFit.hasMeaningfulFit
            ? "low"
            : "unknown",
    venueMatchConfidence: venueFit.matchConfidence,
    moveDecisionConfidence: null,
    hasMeaningfulVenueFit: venueFit.hasMeaningfulFit,
    safetyOverride: false,
    actionable: venueFit.hasMeaningfulFit,
  };
}

// ======================================================
// TWINCORE_RECOMMENDATION_CREW_R14_4C
// Existing Crew recommendation remains Crew authority.
// ======================================================

function buildCrewRecommendation(
  crew: CrewRecommendationInput,
): RecommendationEngineResult {
  return {
    lane: "CREW",
    headline: crew.headline?.trim() || "Review your Crew before the next move.",
    message:
      crew.message?.trim() ||
      "TwinMe has a Crew recommendation that should be resolved before widening the night.",
    action: "REVIEW_CREW",
    destination: null,
    crewNames: cleanStrings(crew.names),
    reasons: [],
    sources: ["CREW"],
    confidence: "medium",
    venueMatchConfidence: null,
    moveDecisionConfidence: null,
    hasMeaningfulVenueFit: false,
    safetyOverride: Boolean(crew.safetySensitive),
    actionable: true,
  };
}

// ======================================================
// TWINCORE_RECOMMENDATION_HOLD_R14_4C
// UNKNOWN stays UNKNOWN instead of creating false advice.
// ======================================================

function buildHoldRecommendation(): RecommendationEngineResult {
  return {
    lane: "HOLD",
    headline: "TwinMe is still reading the night.",
    message:
      "There is not enough combined intelligence yet to recommend another action with confidence.",
    action: "NONE",
    destination: null,
    crewNames: [],
    reasons: [],
    sources: [],
    confidence: "unknown",
    venueMatchConfidence: null,
    moveDecisionConfidence: null,
    hasMeaningfulVenueFit: false,
    safetyOverride: false,
    actionable: false,
  };
}

export function orchestrateTwinMeRecommendation(
  input: RecommendationEngineInput,
): RecommendationEngineResult {
  // 1. SAFETY OVERRIDE
  if (input.move?.safetyOverride) {
    return buildSafetyRecommendation(input.move);
  }

  if (input.crew?.safetySensitive) {
    return {
      ...buildCrewRecommendation(input.crew),
      lane: "SAFETY",
      headline: input.crew.headline?.trim() || "Check your Crew first.",
      sources: ["CREW", "SAFETY"],
      safetyOverride: true,
    };
  }

  // 2. TONIGHT CONTEXT
  if (!input.tonight.hasMeaningfulContext) {
    return buildContextRecommendation();
  }

  // 3. MOVEMENT DECISION
  if (input.move) {
    return buildMoveRecommendation(input.move, input.venueFit);
  }

  // 4. VENUE FIT
  if (input.venueFit?.hasMeaningfulFit) {
    return buildVenueRecommendation(input.venueFit);
  }

  // 5. CREW RECOMMENDATION
  if (input.crew?.available) {
    return buildCrewRecommendation(input.crew);
  }

  // 6. HOLD
  return buildHoldRecommendation();
}
