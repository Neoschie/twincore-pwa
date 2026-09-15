import { describe, expect, it } from "vitest";

import {
  decideRecommendationFreshness,
} from "@/lib/twinme/recommendation-freshness-engine";

import type {
  SharedTwinMeRecommendation,
} from "@/lib/twinme/recommendation-bridge";

function currentRecommendation(): SharedTwinMeRecommendation {
  return {
    lane: "MOVE",
    headline: "Move to Twin Test Club.",
    message: "Strong nightlife move.",
    action: "MOVE_TO_SPOT",
    destination: "Twin Test Club",
    crewNames: [],
    reasons: ["Strong venue intelligence."],
    sources: ["MOVE_CANDIDATE"],
    confidence: "high",
    venueMatchConfidence: 95,
    moveDecisionConfidence: "high",
    hasMeaningfulVenueFit: true,
    safetyOverride: false,
    actionable: true,
    updatedAt: "2026-08-29T16:00:00.000Z",
  };
}

describe("Recommendation freshness Safety contract", () => {
  it("supersedes the current recommendation when Safety changes", () => {
    const current = currentRecommendation();

    const next = {
      ...current,
      lane: "SAFETY" as const,
      action: "EXIT" as const,
      destination: null,
      safetyOverride: true,
      updatedAt: undefined,
    };

    const {
      updatedAt: _ignored,
      ...nextWithoutUpdatedAt
    } = next;

    const result = decideRecommendationFreshness({
      currentRecommendation: current,
      nextRecommendation: nextWithoutUpdatedAt,
      sources: [
        {
          source: "MOVE_CANDIDATE",
          available: true,
          stale: false,
          updatedAt: "2026-08-29T16:00:00.000Z",
        },
        {
          source: "SAFETY",
          available: true,
          stale: false,
          updatedAt: "2026-08-29T16:00:00.000Z",
        },
      ],
    });

    expect(result.decision).toBe("SUPERSEDE");
    expect(result.trigger).toBe("SAFETY_CHANGED");
  });
});
