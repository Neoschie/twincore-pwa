import { describe, expect, it } from "vitest";

import {
  orchestrateTwinMeRecommendation,
  type RecommendationEngineInput,
} from "@/lib/twinme/recommendation-engine";

function baseInput(): RecommendationEngineInput {
  return {
    tonight: {
      hasMeaningfulContext: true,
    },

    crew: null,

    move: {
      decision: "MOVE",
      headline: "Move to Twin Test Club.",
      message: "Strong nightlife move.",
      reasons: ["Venue intelligence is strong."],
      destination: "Twin Test Club",
      venueMatchConfidence: 95,
      decisionConfidence: "high",
      arrivalRecommendation: null,
      safetyOverride: false,
    },

    venueFit: null,
  };
}

describe("TwinMe Recommendation Safety authority", () => {
  it("uses the normal MOVE lane without a Safety override", () => {
    const result = orchestrateTwinMeRecommendation(baseInput());

    expect(result.lane).toBe("MOVE");
    expect(result.action).toBe("MOVE_TO_SPOT");
    expect(result.safetyOverride).toBe(false);
  });

  it("promotes a Safety-sensitive move above nightlife optimization", () => {
    const input = baseInput();

    input.move = {
      ...input.move!,
      decision: "EXIT",
      destination: null,
      safetyOverride: true,
    };

    const result = orchestrateTwinMeRecommendation(input);

    expect(result.lane).toBe("SAFETY");
    expect(result.action).toBe("EXIT");
    expect(result.destination).toBeNull();
    expect(result.safetyOverride).toBe(true);
    expect(result.sources).toContain("SAFETY");
  });

  it("allows Crew Safety to take the Safety lane", () => {
    const input = baseInput();

    input.crew = {
      available: true,
      headline: "Check your Crew.",
      safetySensitive: true,
      names: ["Test Crew"],
    };

    const result = orchestrateTwinMeRecommendation(input);

    expect(result.lane).toBe("SAFETY");
    expect(result.safetyOverride).toBe(true);
    expect(result.sources).toContain("SAFETY");
    expect(result.sources).toContain("CREW");
  });
});
