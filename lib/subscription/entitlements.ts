import type { TwinCoreSubscriptionState } from "./types";

export function hasPremiumAccess(
  subscription: TwinCoreSubscriptionState
) {
  return (
    subscription.plan === "premium" &&
    subscription.status === "active"
  );
}

export function hasPartyAccess(
  subscription: TwinCoreSubscriptionState
) {
  if (
    subscription.plan === "premium" &&
    subscription.status === "active"
  ) {
    return true;
  }

  if (
    subscription.plan === "party_pass" &&
    subscription.status === "active"
  ) {
    if (
      subscription.partyPassExpiresAt &&
      Date.now() > subscription.partyPassExpiresAt
    ) {
      return false;
    }

    return true;
  }

  return false;
}

export function hasPredictiveAccess(
  subscription: TwinCoreSubscriptionState
) {
  return hasPremiumAccess(subscription);
}

export function hasPassiveAwarenessAccess(
  subscription: TwinCoreSubscriptionState
) {
  return hasPremiumAccess(subscription);
}

export function hasUnlimitedPartyAccess(
  subscription: TwinCoreSubscriptionState
) {
  return hasPartyAccess(subscription);
}