import { describe, expect, it } from "vitest";

import {
  isPremiumAuthorityActive,
  mapStripeSubscriptionAuthority,
} from "@/lib/subscription/stripe-lifecycle";

describe("Stripe Premium lifecycle authority", () => {
  it("maps an active Stripe subscription to bounded Premium access", () => {
    const result = mapStripeSubscriptionAuthority({
      status: "active",
      currentPeriodEnd: 2_000_000_000,
    });

    expect(result.status).toBe("active");
    expect(result.premiumExpiresAt).not.toBeNull();
  });

  it("maps payment failure states away from active", () => {
    expect(
      mapStripeSubscriptionAuthority({
        status: "past_due",
        currentPeriodEnd: 2_000_000_000,
      }).status
    ).toBe("payment_failed");

    expect(
      mapStripeSubscriptionAuthority({
        status: "unpaid",
        currentPeriodEnd: 2_000_000_000,
      }).status
    ).toBe("payment_failed");
  });

  it("maps cancelled subscriptions away from active", () => {
    expect(
      mapStripeSubscriptionAuthority({
        status: "canceled",
        currentPeriodEnd: 2_000_000_000,
      }).status
    ).toBe("cancelled");
  });

  it("requires an authoritative Premium expiry", () => {
    expect(
      isPremiumAuthorityActive({
        plan: "premium",
        status: "active",
        expiresAt: null,
      })
    ).toBe(false);
  });

  it("rejects expired Premium authority", () => {
    expect(
      isPremiumAuthorityActive({
        plan: "premium",
        status: "active",
        expiresAt: Date.now() - 1000,
      })
    ).toBe(false);
  });

  it("accepts active unexpired Premium authority", () => {
    expect(
      isPremiumAuthorityActive({
        plan: "premium",
        status: "active",
        expiresAt: Date.now() + 60_000,
      })
    ).toBe(true);
  });
});
