import type {
  TwinCoreAccessResult,
  TwinCoreFeatureKey,
  TwinCoreSubscriptionState,
} from "./types";

function isExpired(state: TwinCoreSubscriptionState) {
  if (!state.expiresAt) return false;
  return Date.now() > state.expiresAt;
}

function isPremium(state: TwinCoreSubscriptionState) {
  return state.plan === "premium" && state.status === "active";
}

function isPartyPassActive(state: TwinCoreSubscriptionState) {
  return (
    state.plan === "party_pass" &&
    state.status === "active" &&
    !isExpired(state)
  );
}

const FREE_FEATURES: TwinCoreFeatureKey[] = [
  "basic_twinme",
  "party_mode",
];

const PARTY_PASS_FEATURES: TwinCoreFeatureKey[] = [
  "basic_twinme",
  "advanced_twinme",
  "hands_free_voice",
  "passive_awareness",
  "predictive_guidance",
  "ecosystem_sync",
  "party_mode",
  "crew_sync",
  "spots_guidance",
  "exit_guidance",
];

const PREMIUM_FEATURES: TwinCoreFeatureKey[] = [
  ...PARTY_PASS_FEATURES,
  "unlimited_party_mode",
];

export function canAccessFeature(
  state: TwinCoreSubscriptionState,
  feature: TwinCoreFeatureKey
): TwinCoreAccessResult {
  if (isExpired(state)) {
    return {
      allowed: false,
      reason: "expired",
      upgradeMessage: "Your access expired. Upgrade to continue full TwinCore awareness.",
    };
  }

  if (isPremium(state)) {
    return {
      allowed: PREMIUM_FEATURES.includes(feature),
      reason: "premium_allowed",
    };
  }

  if (isPartyPassActive(state)) {
    return {
      allowed: PARTY_PASS_FEATURES.includes(feature),
      reason: "party_pass_allowed",
    };
  }

  if (FREE_FEATURES.includes(feature)) {
    return {
      allowed: true,
      reason: "free_allowed",
    };
  }

  return {
    allowed: false,
    reason: "locked",
    upgradeMessage: "Unlock full adaptive awareness with Premium or a Party Pass.",
  };
}

export function hasPremiumAccess(state: TwinCoreSubscriptionState) {
  return isPremium(state);
}

export function hasPartyPassAccess(state: TwinCoreSubscriptionState) {
  return isPartyPassActive(state);
}

export function hasFullTwinCoreAccess(state: TwinCoreSubscriptionState) {
  return isPremium(state) || isPartyPassActive(state);
}