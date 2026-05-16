export type TwinCorePlanType = "free" | "party_pass" | "premium";

export type TwinCoreSubscriptionStatus =
  | "inactive"
  | "active"
  | "expired"
  | "cancelled";

export type TwinCoreFeatureKey =
  | "basic_twinme"
  | "advanced_twinme"
  | "hands_free_voice"
  | "passive_awareness"
  | "predictive_guidance"
  | "ecosystem_sync"
  | "party_mode"
  | "unlimited_party_mode"
  | "crew_sync"
  | "spots_guidance"
  | "exit_guidance";

export type TwinCoreSubscriptionState = {
  plan: TwinCorePlanType;
  status: TwinCoreSubscriptionStatus;

  startedAt: number | null;
  expiresAt: number | null;

  partyPassActivatedAt: number | null;
  partyPassExpiresAt: number | null;

  source: "local" | "stripe" | "supabase";
};

export type TwinCoreAccessResult = {
  allowed: boolean;
  reason:
    | "free_allowed"
    | "premium_allowed"
    | "party_pass_allowed"
    | "expired"
    | "locked"
    | "unknown";
  upgradeMessage?: string;
};