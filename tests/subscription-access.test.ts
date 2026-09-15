import { describe, expect, it } from "vitest";

import {
  canAccessFeature,
} from "@/lib/subscription/access";

import type {
  TwinCoreSubscriptionState,
} from "@/lib/subscription/types";

function state(
  overrides: Partial<TwinCoreSubscriptionState> = {},
): TwinCoreSubscriptionState {
  return {
    plan: "free",
    status: "active",
    expiresAt: null,
    partyPassExpiresAt: null,
    ...overrides,
  } as TwinCoreSubscriptionState;
}

describe("TwinCore subscription access contract", () => {
  it("allows free users into basic TwinMe", () => {
    const result = canAccessFeature(
      state(),
      "basic_twinme",
    );

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("free_allowed");
  });

  it("keeps advanced TwinMe locked for free users", () => {
    const result = canAccessFeature(
      state(),
      "advanced_twinme",
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("locked");
  });

  it("allows active Premium into advanced TwinMe", () => {
    const result = canAccessFeature(
      state({
        plan: "premium",
        status: "active",
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      }),
      "advanced_twinme",
    );

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("premium_allowed");
  });

  it("rejects expired Party Pass access", () => {
    const result = canAccessFeature(
      state({
        plan: "party_pass",
        status: "active",
        expiresAt: Date.now() - 60_000,
      }),
      "advanced_twinme",
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("expired");
  });
});
