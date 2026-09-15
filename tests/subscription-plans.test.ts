import { describe, expect, it } from "vitest";

import {
  TWINCORE_PLANS,
  getPlan,
} from "@/lib/subscription/plans";

describe("TwinCore subscription plan contract", () => {
  it("keeps all three canonical plan types available", () => {
    expect(Object.keys(TWINCORE_PLANS).sort()).toEqual(
      ["free", "party_pass", "premium"].sort()
    );
  });

  it("resolves the free plan", () => {
    expect(getPlan("free")).toBe(TWINCORE_PLANS.free);
  });

  it("resolves Party Pass", () => {
    expect(getPlan("party_pass")).toBe(TWINCORE_PLANS.party_pass);
  });

  it("resolves Premium", () => {
    expect(getPlan("premium")).toBe(TWINCORE_PLANS.premium);
  });
});
