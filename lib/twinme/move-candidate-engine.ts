import type {
  MoveCandidateConfidence,
  MoveCandidateDecision,
  SharedMoveCandidate,
} from "@/lib/twinme/move-candidate-bridge";

export type MoveCandidateSafetyState =
  "clear" | "caution" | "elevated" | "critical";

export type MoveCandidateSupportState =
  "unknown" | "supported" | "thin" | "alone";

export type MoveCandidateMovementState =
  "unknown" | "stable" | "moving" | "drifting";

export type MoveCandidateInput = {
  venue: {
    spotName: string | null;
    message?: string | null;
    reasons?: string[];
    matchConfidence: number | null;
    arrivalRecommendation?: {
      label: string;
      colour: string;
      message: string;
    } | null;
  } | null;

  tonight: {
    hasMeaningfulContext: boolean;
    destination?: string | null;
    transportationMode?: string | null;
    needsRideHome?: boolean | null;
  };

  safety: {
    state: MoveCandidateSafetyState;
    riskCount: number;
    helpSensitive: boolean;
  };

  support: {
    state: MoveCandidateSupportState;
  };

  movement: {
    state: MoveCandidateMovementState;
  };
};

export type MoveCandidateEngineResult = Omit<SharedMoveCandidate, "updatedAt">;

function confidenceFromScore(score: number): MoveCandidateConfidence {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function buildResult(args: {
  decision: MoveCandidateDecision;
  headline: string;
  message: string;
  reasons: string[];
  destination: string | null;
  venueMatchConfidence: number | null;
  decisionScore: number;
  arrivalRecommendation?: {
    label: string;
    colour: string;
    message: string;
  } | null;
  safetyOverride: boolean;
}): MoveCandidateEngineResult {
  return {
    decision: args.decision,
    headline: args.headline,
    message: args.message,
    reasons: args.reasons,
    destination: args.destination,
    venueMatchConfidence: args.venueMatchConfidence,
    decisionConfidence: confidenceFromScore(args.decisionScore),
    arrivalRecommendation: args.arrivalRecommendation ?? null,
    safetyOverride: args.safetyOverride,
  };
}

export function decideMoveCandidate(
  input: MoveCandidateInput,
): MoveCandidateEngineResult {
  const venueName = input.venue?.spotName?.trim() || null;
  const venueConfidence = input.venue?.matchConfidence ?? null;

  const verifiedDestination =
    venueName || input.tonight.destination?.trim() || null;

  const venueReasons = Array.isArray(input.venue?.reasons)
    ? input.venue.reasons.filter(
        (reason): reason is string =>
          typeof reason === "string" && reason.trim().length > 0,
      )
    : [];

  // =====================================================
  // TWINCORE_MOVE_SAFETY_OVERRIDE_R14_2B
  // Safety always outranks nightlife optimization.
  // =====================================================

  if (input.safety.helpSensitive || input.safety.state === "critical") {
    return buildResult({
      decision: "EXIT",
      headline: "Safety comes first.",
      message:
        "TwinMe is holding the nightlife move because current safety signals need attention first.",
      reasons: [
        input.safety.helpSensitive
          ? "A help-sensitive signal is active."
          : "Current safety state is critical.",
      ],
      destination: null,
      venueMatchConfidence: venueConfidence,
      decisionScore: 100,
      arrivalRecommendation: null,
      safetyOverride: true,
    });
  }

  if (
    input.safety.state === "elevated" ||
    input.safety.riskCount > 0 ||
    input.movement.state === "drifting"
  ) {
    const reasons: string[] = [];

    if (input.safety.state === "elevated") {
      reasons.push("Current safety state is elevated.");
    }

    if (input.safety.riskCount > 0) {
      reasons.push("Active risk signals are present.");
    }

    if (input.movement.state === "drifting") {
      reasons.push(
        "Movement currently looks like drift rather than a controlled transition.",
      );
    }

    return buildResult({
      decision: "STAY",
      headline: "Hold the move for now.",
      message:
        "TwinMe sees a possible destination, but current conditions do not support adding more movement yet.",
      reasons,
      destination: null,
      venueMatchConfidence: venueConfidence,
      decisionScore: 90,
      arrivalRecommendation: null,
      safetyOverride: true,
    });
  }

  // =====================================================
  // TWINCORE_MOVE_SUPPORT_GUARD_R14_2B
  // Thin support should constrain unnecessary movement.
  // =====================================================

  if (input.support.state === "alone" && input.movement.state === "moving") {
    return buildResult({
      decision: "STAY",
      headline: "Re-anchor before moving again.",
      message:
        "TwinMe sees that you are moving without a strong support layer. Stabilize the next step before changing venues.",
      reasons: ["You are currently moving without a strong support layer."],
      destination: null,
      venueMatchConfidence: venueConfidence,
      decisionScore: 82,
      arrivalRecommendation: null,
      safetyOverride: true,
    });
  }

  // =====================================================
  // TWINCORE_MOVE_SIGNAL_GUARD_R14_2B
  // Do not fabricate a move without enough real context.
  // =====================================================

  if (!input.tonight.hasMeaningfulContext) {
    return buildResult({
      decision: "WAIT",
      headline: "TwinMe needs tonight's direction.",
      message:
        "There is not enough Tonight Context yet to turn venue intelligence into a confident next move.",
      reasons: ["Tonight Context is not meaningful enough yet."],
      destination: null,
      venueMatchConfidence: venueConfidence,
      decisionScore: 88,
      arrivalRecommendation: null,
      safetyOverride: false,
    });
  }

  if (!venueName || venueConfidence === null) {
    return buildResult({
      decision: "WAIT",
      headline: "The next place is not clear yet.",
      message:
        "TwinMe understands tonight better, but Spots has not produced enough verified venue intelligence for a move.",
      reasons: ["No verified venue recommendation is currently available."],
      destination: null,
      venueMatchConfidence: null,
      decisionScore: 85,
      arrivalRecommendation: null,
      safetyOverride: false,
    });
  }

  // =====================================================
  // TWINCORE_MOVE_CANDIDATE_SCORE_R14_2B
  // Venue confidence informs movement but does not own it.
  // =====================================================

  let moveScore = venueConfidence;
  const reasons = [...venueReasons];

  if (input.support.state === "supported") {
    moveScore += 8;
    reasons.push("Crew/support conditions are currently stable.");
  }

  if (input.movement.state === "stable") {
    moveScore += 5;
    reasons.push("Current movement state is controlled.");
  }

  if (input.safety.state === "clear") {
    moveScore += 7;
    reasons.push("No elevated safety constraint is active.");
  }

  if (input.safety.state === "caution") {
    moveScore -= 10;
    reasons.push("Current conditions call for some caution.");
  }

  if (input.support.state === "thin") {
    moveScore -= 12;
    reasons.push("Support around you currently looks thin.");
  }

  if (input.support.state === "alone") {
    moveScore -= 18;
    reasons.push("You do not currently have a strong support layer.");
  }

  const boundedMoveScore = Math.max(0, Math.min(100, moveScore));

  // =====================================================
  // TWINCORE_MOVE_DECISION_R14_2B
  // =====================================================

  if (boundedMoveScore >= 75) {
    return buildResult({
      decision: "MOVE",
      headline: `The move is ${venueName}.`,
      message:
        input.venue?.message?.trim() ||
        `${venueName} currently has the strongest combination of tonight fit and live venue intelligence.`,
      reasons,
      destination: verifiedDestination,
      venueMatchConfidence: venueConfidence,
      decisionScore: boundedMoveScore,
      arrivalRecommendation: input.venue?.arrivalRecommendation ?? null,
      safetyOverride: false,
    });
  }

  if (boundedMoveScore >= 50) {
    return buildResult({
      decision: "WAIT",
      headline: `${venueName} is possible — not automatic.`,
      message:
        "TwinMe sees a viable venue, but the combined signal is not strong enough to recommend moving yet.",
      reasons,
      destination: venueName,
      venueMatchConfidence: venueConfidence,
      decisionScore: boundedMoveScore,
      arrivalRecommendation: input.venue?.arrivalRecommendation ?? null,
      safetyOverride: false,
    });
  }

  return buildResult({
    decision: "STAY",
    headline: "The current move is stronger than forcing another one.",
    message:
      "TwinMe does not see enough advantage in changing venues right now.",
    reasons:
      reasons.length > 0
        ? reasons
        : ["Current venue intelligence does not justify another move."],
    destination: null,
    venueMatchConfidence: venueConfidence,
    decisionScore: Math.max(75, 100 - boundedMoveScore),
    arrivalRecommendation: null,
    safetyOverride: false,
  });
}
