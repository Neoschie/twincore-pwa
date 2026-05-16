import type { TwinCorePlanType } from "./types";

export type TwinCorePlan = {
  id: TwinCorePlanType;
  name: string;
  priceUsd: number;
  billingLabel: string;
  description: string;
  durationHours: number | null;
};

export const TWINCORE_PLANS: Record<TwinCorePlanType, TwinCorePlan> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    billingLabel: "Limited access",
    description: "Basic TwinMe access with limited guidance.",
    durationHours: null,
  },

  party_pass: {
    id: "party_pass",
    name: "Party Pass",
    priceUsd: 5.99,
    billingLabel: "24-hour access",
    description: "Activate the full TwinCore experience for 24 hours.",
    durationHours: 24,
  },

  premium: {
    id: "premium",
    name: "Premium",
    priceUsd: 24.99,
    billingLabel: "USD/month",
    description:
      "Full adaptive awareness, predictive guidance, voice, ecosystem sync, and advanced TwinMe intelligence.",
    durationHours: null,
  },
};

export function getPlan(plan: TwinCorePlanType) {
  return TWINCORE_PLANS[plan];
}