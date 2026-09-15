import type {
  SharedVenueFit,
  VenueFitDimensionRead,
  VenueFitSignalStrength,
} from "@/lib/twinme/venue-fit-bridge";

// TWINCORE_VENUE_FIT_ENGINE_R14_3C

export type VenueFitEngineInput = {
  venue: {
    spotName: string | null;
    matchConfidence: number | null;
    recommendationReasons: string[];

    category: string | null;
    vibe: string | null;

    distanceKm: number | null;
    rating: number | null;
    reviewCount: number | null;
    isOpen: boolean | null;

    liveReportCount: number;
    uniqueReporterCount: number;
    liveSignalStrength: number;
    corroborationLevel: "none" | "single" | "moderate" | "strong";

    crowdLevel: string | null;
    crowdTrend: string | null;
    momentum: string | null;
    heatScore: number | null;
  };

  tonight: {
    vibeLabel: string | null;
    desiredFeeling: string | null;
    destination: string | null;
    dressCode: string | null;
    occasion: string | null;
  };

  crew: {
    partyStatus: string | null;
    needsStability: boolean;
    highEnergy: boolean;
  };

  safety: {
    riskCount: number;
  };
};

type FitDimensionDraft = Omit<VenueFitDimensionRead, "dimension">;

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function hasText(value: string | null | undefined) {
  return normalize(value).length > 0;
}

function strengthFromEvidenceCount(count: number): VenueFitSignalStrength {
  if (count >= 3) return "strong";
  if (count === 2) return "moderate";
  if (count === 1) return "weak";
  return "unknown";
}

function unknownRead(reason: string): FitDimensionDraft {
  return {
    strength: "unknown",
    reason,
    evidence: [],
  };
}

// TWINCORE_VENUE_FIT_INTENT_R14_3C
function explainIntent(input: VenueFitEngineInput): VenueFitDimensionRead {
  const evidence: string[] = [];

  if (hasText(input.tonight.vibeLabel)) {
    evidence.push(`Tonight vibe: ${input.tonight.vibeLabel}`);
  }

  if (hasText(input.tonight.desiredFeeling)) {
    evidence.push(`Desired feeling: ${input.tonight.desiredFeeling}`);
  }

  if (hasText(input.tonight.destination)) {
    evidence.push(`Destination intent: ${input.tonight.destination}`);
  }

  if (hasText(input.tonight.dressCode)) {
    evidence.push(`Dress code: ${input.tonight.dressCode}`);
  }

  if (hasText(input.tonight.occasion)) {
    evidence.push(`Occasion: ${input.tonight.occasion}`);
  }

  if (evidence.length === 0) {
    return {
      dimension: "INTENT",
      ...unknownRead(
        "TwinMe does not have enough Tonight Context to explain intent fit yet.",
      ),
    };
  }

  return {
    dimension: "INTENT",
    strength: strengthFromEvidenceCount(evidence.length),
    reason:
      "This venue is being read against the intent you gave TwinMe for tonight.",
    evidence,
  };
}

// TWINCORE_VENUE_FIT_ENERGY_R14_3C
function explainEnergy(input: VenueFitEngineInput): VenueFitDimensionRead {
  const evidence: string[] = [];

  if (hasText(input.venue.vibe)) {
    evidence.push(`Venue vibe: ${input.venue.vibe}`);
  }

  if (input.crew.highEnergy) {
    evidence.push("Current Crew state is high energy");
  }

  if (hasText(input.venue.crowdLevel)) {
    evidence.push(`Current crowd: ${input.venue.crowdLevel}`);
  }

  if (hasText(input.venue.momentum)) {
    evidence.push(`Venue momentum: ${input.venue.momentum}`);
  }

  if (evidence.length === 0) {
    return {
      dimension: "ENERGY",
      ...unknownRead(
        "TwinMe does not have enough current energy evidence for this venue yet.",
      ),
    };
  }

  return {
    dimension: "ENERGY",
    strength: strengthFromEvidenceCount(evidence.length),
    reason:
      "Current venue and Crew energy provide evidence for how this option fits the night.",
    evidence,
  };
}

// TWINCORE_VENUE_FIT_LIVE_R14_3C
function explainLive(input: VenueFitEngineInput): VenueFitDimensionRead {
  const evidence: string[] = [];

  if (input.venue.liveReportCount > 0) {
    evidence.push(
      `${input.venue.liveReportCount} current live report${
        input.venue.liveReportCount === 1 ? "" : "s"
      }`,
    );
  }

  if (input.venue.uniqueReporterCount > 0) {
    evidence.push(
      `${input.venue.uniqueReporterCount} unique live reporter${
        input.venue.uniqueReporterCount === 1 ? "" : "s"
      }`,
    );
  }

  if (input.venue.corroborationLevel !== "none") {
    evidence.push(`Live corroboration: ${input.venue.corroborationLevel}`);
  }

  if (hasText(input.venue.crowdTrend)) {
    evidence.push(`Crowd trend: ${input.venue.crowdTrend}`);
  }

  if (hasText(input.venue.momentum)) {
    evidence.push(`Momentum: ${input.venue.momentum}`);
  }

  if (input.venue.liveReportCount === 0) {
    return {
      dimension: "LIVE",
      ...unknownRead("No current live reports are available for this venue."),
    };
  }

  const strength: VenueFitSignalStrength =
    input.venue.corroborationLevel === "strong"
      ? "strong"
      : input.venue.corroborationLevel === "moderate"
        ? "moderate"
        : "weak";

  return {
    dimension: "LIVE",
    strength,
    reason:
      "Fresh live activity is contributing real-world evidence about what this venue is like right now.",
    evidence,
  };
}

// TWINCORE_VENUE_FIT_PRACTICAL_R14_3C
function explainPractical(input: VenueFitEngineInput): VenueFitDimensionRead {
  const evidence: string[] = [];

  if (
    typeof input.venue.distanceKm === "number" &&
    Number.isFinite(input.venue.distanceKm)
  ) {
    evidence.push(`Distance: ${input.venue.distanceKm.toFixed(1)} km`);
  }

  if (
    typeof input.venue.rating === "number" &&
    Number.isFinite(input.venue.rating)
  ) {
    evidence.push(`Google rating: ${input.venue.rating.toFixed(1)}★`);
  }

  if (
    typeof input.venue.reviewCount === "number" &&
    Number.isFinite(input.venue.reviewCount)
  ) {
    evidence.push(`Google reviews: ${input.venue.reviewCount}`);
  }

  if (input.venue.isOpen === true) {
    evidence.push("Venue is open right now");
  } else if (input.venue.isOpen === false) {
    evidence.push("Venue is currently closed");
  }

  if (evidence.length === 0) {
    return {
      dimension: "PRACTICAL",
      ...unknownRead(
        "TwinMe does not have enough practical venue information yet.",
      ),
    };
  }

  return {
    dimension: "PRACTICAL",
    strength: strengthFromEvidenceCount(evidence.length),
    reason:
      "Distance, availability and venue quality provide practical evidence for this recommendation.",
    evidence,
  };
}

// TWINCORE_VENUE_FIT_STABILITY_R14_3C
function explainStability(input: VenueFitEngineInput): VenueFitDimensionRead {
  const evidence: string[] = [];

  if (input.safety.riskCount > 0) {
    evidence.push(
      `${input.safety.riskCount} current risk signal${
        input.safety.riskCount === 1 ? "" : "s"
      }`,
    );
  }

  if (input.crew.needsStability) {
    evidence.push("Current Crew state calls for greater stability");
  }

  if (hasText(input.venue.crowdLevel)) {
    evidence.push(`Current crowd: ${input.venue.crowdLevel}`);
  }

  if (hasText(input.venue.crowdTrend)) {
    evidence.push(`Crowd trend: ${input.venue.crowdTrend}`);
  }

  if (
    input.safety.riskCount === 0 &&
    !input.crew.needsStability &&
    !hasText(input.venue.crowdLevel) &&
    !hasText(input.venue.crowdTrend)
  ) {
    return {
      dimension: "STABILITY",
      ...unknownRead(
        "TwinMe does not have enough stability evidence for this venue yet.",
      ),
    };
  }

  return {
    dimension: "STABILITY",
    strength: strengthFromEvidenceCount(evidence.length),
    reason: input.crew.needsStability
      ? "TwinMe is weighing current venue conditions against the Crew's need for a steadier environment."
      : "Current risk and crowd conditions provide evidence about how stable this venue looks right now.",
    evidence,
  };
}

export function explainVenueFit(
  input: VenueFitEngineInput,
): Omit<SharedVenueFit, "updatedAt"> {
  // TWINCORE_VENUE_FIT_NO_VENUE_GUARD_R14_3C
  if (!input.venue.spotName) {
    return {
      spotName: null,
      matchConfidence: null,
      recommendationReasons: [],
      hasMeaningfulFit: false,
      dimensions: [
        {
          dimension: "INTENT",
          ...unknownRead("No venue has been selected yet."),
        },
        {
          dimension: "ENERGY",
          ...unknownRead("No venue has been selected yet."),
        },
        {
          dimension: "LIVE",
          ...unknownRead("No venue has been selected yet."),
        },
        {
          dimension: "PRACTICAL",
          ...unknownRead("No venue has been selected yet."),
        },
        {
          dimension: "STABILITY",
          ...unknownRead("No venue has been selected yet."),
        },
      ],
    };
  }

  const dimensions: VenueFitDimensionRead[] = [
    explainIntent(input),
    explainEnergy(input),
    explainLive(input),
    explainPractical(input),
    explainStability(input),
  ];

  // TWINCORE_VENUE_FIT_MEANINGFUL_GUARD_R14_3C
  const hasMeaningfulFit = dimensions.some(
    (dimension) => dimension.strength !== "unknown",
  );

  return {
    spotName: input.venue.spotName,
    matchConfidence: input.venue.matchConfidence,
    recommendationReasons: input.venue.recommendationReasons.filter(
      (reason) => typeof reason === "string" && reason.trim(),
    ),
    dimensions,
    hasMeaningfulFit,
  };
}
