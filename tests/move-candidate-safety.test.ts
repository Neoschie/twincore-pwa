import { describe, expect, it } from "vitest";

import {
  decideMoveCandidate,
  type MoveCandidateInput,
} from "@/lib/twinme/move-candidate-engine";

function baseInput(): MoveCandidateInput {
  return {
    venue: {
      spotName: "Twin Test Club",
      message: "Strong venue fit.",
      reasons: ["Venue intelligence is strong."],
      matchConfidence: 95,
      arrivalRecommendation: null,
    },

    tonight: {
      hasMeaningfulContext: true,
      destination: "Twin Test Club",
      transportationMode: "rideshare",
      needsRideHome: false,
    },

    safety: {
      state: "clear",
      riskCount: 0,
      helpSensitive: false,
    },

    support: {
      state: "supported",
    },

    movement: {
      state: "stable",
    },
  };
}

describe("Move Candidate Safety authority", () => {
  it("allows a strong nightlife move when Safety is clear", () => {
    const result = decideMoveCandidate(baseInput());

    expect(result.decision).toBe("MOVE");
    expect(result.safetyOverride).toBe(false);
    expect(result.destination).toBe("Twin Test Club");
  });

  it("forces EXIT when Safety becomes critical even with a 95 venue score", () => {
    const input = baseInput();

    input.safety.state = "critical";

    const result = decideMoveCandidate(input);

    expect(result.decision).toBe("EXIT");
    expect(result.safetyOverride).toBe(true);
    expect(result.destination).toBeNull();
  });

  it("forces EXIT for a help-sensitive signal", () => {
    const input = baseInput();

    input.safety.helpSensitive = true;

    const result = decideMoveCandidate(input);

    expect(result.decision).toBe("EXIT");
    expect(result.safetyOverride).toBe(true);
    expect(result.destination).toBeNull();
  });

  it("holds movement when elevated risk exists", () => {
    const input = baseInput();

    input.safety.state = "elevated";
    input.safety.riskCount = 1;

    const result = decideMoveCandidate(input);

    expect(result.decision).toBe("STAY");
    expect(result.safetyOverride).toBe(true);
    expect(result.destination).toBeNull();
  });
});
