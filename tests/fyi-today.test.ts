import { describe, expect, it } from "vitest";

import {
  createLifeContext,
  type LifeContextSignal,
} from "@/lib/twinme/life-context";

import {
  evaluateLifeContextPriority,
} from "@/lib/twinme/life-context-priority";

import {
  buildFyiTodaySnapshot,
} from "@/lib/twinme/fyi-today";

describe("FYI Today verified-context contract", () => {
  it("surfaces stronger verified evidence first", () => {
    const now = 1_700_000_000_000;

    const weak = {
      id: "weak-routine",
      domain: "ROUTINE",
      strength: "WEAK",
      source: "USER",
      summary: "Routine evidence",
      observedAt: now,
      expiresAt: now + 60_000,
    } as LifeContextSignal;

    const strong = {
      id: "strong-goal",
      domain: "GOALS",
      strength: "STRONG",
      source: "USER",
      summary: "Goal evidence",
      observedAt: now,
      expiresAt: now + 60_000,
    } as LifeContextSignal;

    const context = {
      ...createLifeContext(now),
      signals: [weak, strong],
    };

    const priority =
      evaluateLifeContextPriority(context, now);

    const fyi =
      buildFyiTodaySnapshot(priority, now);

    expect(priority.priority).toBe("HIGH");
    expect(priority.leadSignal?.signal.id).toBe("strong-goal");

    expect(fyi.hasBriefing).toBe(true);
    expect(fyi.leadCandidate?.signal.id).toBe("strong-goal");
    expect(fyi.leadCandidate?.category).toBe("GOALS");
  });

  it("does not turn UNKNOWN evidence into an FYI briefing", () => {
    const now = 1_700_000_000_000;

    const unknown = {
      id: "unknown",
      domain: "GOALS",
      strength: "UNKNOWN",
      source: "SYSTEM",
      summary: "Unknown evidence",
      observedAt: now,
      expiresAt: now + 60_000,
    } as LifeContextSignal;

    const context = {
      ...createLifeContext(now),
      signals: [unknown],
    };

    const priority =
      evaluateLifeContextPriority(context, now);

    const fyi =
      buildFyiTodaySnapshot(priority, now);

    expect(fyi.hasBriefing).toBe(false);
    expect(fyi.candidates).toEqual([]);
    expect(fyi.leadCandidate).toBeNull();
  });
});
