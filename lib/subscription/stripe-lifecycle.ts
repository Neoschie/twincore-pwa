export type StripeSubscriptionAuthority = {
  status: string;
  premiumExpiresAt: string | null;
};

const ACTIVE_STRIPE_STATUSES = new Set(["active", "trialing"]);

export function mapStripeSubscriptionAuthority(input: {
  status: string;
  currentPeriodEnd: number | null;
}): StripeSubscriptionAuthority {
  return {
    status: ACTIVE_STRIPE_STATUSES.has(input.status)
      ? "active"
      : input.status === "past_due" ||
          input.status === "unpaid" ||
          input.status === "incomplete"
        ? "payment_failed"
        : "cancelled",
    premiumExpiresAt:
      input.currentPeriodEnd && input.currentPeriodEnd > 0
        ? new Date(input.currentPeriodEnd * 1000).toISOString()
        : null,
  };
}

export function isPremiumAuthorityActive(input: {
  plan: string;
  status: string;
  expiresAt: number | null;
}) {
  if (input.plan !== "premium" || input.status !== "active") {
    return false;
  }

  if (!input.expiresAt) {
    return false;
  }

  return Date.now() <= input.expiresAt;
}
