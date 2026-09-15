import { describe, expect, it } from "vitest";

import {
  hasPassiveAwarenessAccess,
  hasPredictiveAccess,
  hasPremiumAccess,
  hasUnlimitedPartyAccess,
} from "@/lib/subscription/entitlements";

describe("subscription entitlement authority", () => {
  it("allows active Premium with finite future expiry", () => {
    const state = {
      plan: "premium" as const,
      status: "active" as const,
      expiresAt: Date.now() + 60_000,
      partyPassExpiresAt: null,
      startedAt: null,
      partyPassActivatedAt: null,
      source: "supabase" as const,
    };

    expect(hasPremiumAccess(state)).toBe(true);
    expect(hasPredictiveAccess(state)).toBe(true);
    expect(hasPassiveAwarenessAccess(state)).toBe(true);
    expect(hasUnlimitedPartyAccess(state)).toBe(true);
  });

  it("rejects expired Premium across entitlement helpers", () => {
    const state = {
      plan: "premium" as const,
      status: "active" as const,
      expiresAt: Date.now() - 60_000,
      partyPassExpiresAt: null,
      startedAt: null,
      partyPassActivatedAt: null,
      source: "supabase" as const,
    };

    expect(hasPremiumAccess(state)).toBe(false);
    expect(hasPredictiveAccess(state)).toBe(false);
    expect(hasPassiveAwarenessAccess(state)).toBe(false);
    expect(hasUnlimitedPartyAccess(state)).toBe(false);
  });

  it("rejects active Premium without finite authority", () => {
    const state = {
      plan: "premium" as const,
      status: "active" as const,
      expiresAt: null,
      partyPassExpiresAt: null,
      startedAt: null,
      partyPassActivatedAt: null,
      source: "supabase" as const,
    };

    expect(hasPremiumAccess(state)).toBe(false);
  });
});
