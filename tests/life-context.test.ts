import { describe, expect, it } from "vitest";

import {
  createLifeContext,
  getActiveLifeContextSignals,
  getLifeContextSignalsByDomain,
  isLifeContextSignalActive,
  type LifeContextSignal,
} from "@/lib/twinme/life-context";

describe("Life Context contract", () => {
  it("creates an empty canonical Life Context", () => {
    const now = 1_700_000_000_000;
    const context = createLifeContext(now);

    expect(context.version).toBe(1);
    expect(context.signals).toEqual([]);
    expect(context.updatedAt).toBe(now);
  });

  it("treats an unexpired signal as active", () => {
    const now = 1_700_000_000_000;

    const signal = {
      id: "test-tonight",
      domain: "TONIGHT",
      strength: "STRONG",
      source: "TONIGHT_CONTEXT",
      observedAt: now,
      expiresAt: now + 60_000,
    } as LifeContextSignal;

    expect(isLifeContextSignalActive(signal, now)).toBe(true);
  });

  it("filters active signals by domain without inventing context", () => {
    const now = 1_700_000_000_000;

    const tonight = {
      id: "tonight",
      domain: "TONIGHT",
      strength: "STRONG",
      source: "TONIGHT_CONTEXT",
      observedAt: now,
      expiresAt: now + 60_000,
    } as LifeContextSignal;

    const expiredGoal = {
      id: "goal",
      domain: "GOALS",
      strength: "MODERATE",
      source: "USER",
      observedAt: now - 120_000,
      expiresAt: now - 1,
    } as LifeContextSignal;

    const context = {
      ...createLifeContext(now),
      signals: [tonight, expiredGoal],
    };

    expect(getActiveLifeContextSignals(context, now)).toEqual([tonight]);

    expect(
      getLifeContextSignalsByDomain(context, "TONIGHT", now)
    ).toEqual([tonight]);

    expect(
      getLifeContextSignalsByDomain(context, "GOALS", now)
    ).toEqual([]);
  });
});
