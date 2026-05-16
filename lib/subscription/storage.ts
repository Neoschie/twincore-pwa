import type { TwinCoreSubscriptionState } from "./types";

const STORAGE_KEY = "twincore_subscription_state";

export function getDefaultSubscriptionState(): TwinCoreSubscriptionState {
  return {
    plan: "free",
    status: "inactive",

    startedAt: null,
    expiresAt: null,

    partyPassActivatedAt: null,
    partyPassExpiresAt: null,

    source: "local",
  };
}

export function getSubscriptionState(): TwinCoreSubscriptionState {
  if (typeof window === "undefined") {
    return getDefaultSubscriptionState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSubscriptionState();

    return {
      ...getDefaultSubscriptionState(),
      ...JSON.parse(raw),
    };
  } catch {
    return getDefaultSubscriptionState();
  }
}

export function saveSubscriptionState(state: TwinCoreSubscriptionState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function activateLocalPartyPass() {
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000;

  const nextState: TwinCoreSubscriptionState = {
    plan: "party_pass",
    status: "active",

    startedAt: now,
    expiresAt,

    partyPassActivatedAt: now,
    partyPassExpiresAt: expiresAt,

    source: "local",
  };

  saveSubscriptionState(nextState);

  return nextState;
}

export function activateLocalPremium() {
  const now = Date.now();

  const nextState: TwinCoreSubscriptionState = {
    plan: "premium",
    status: "active",

    startedAt: now,
    expiresAt: null,

    partyPassActivatedAt: null,
    partyPassExpiresAt: null,

    source: "local",
  };

  saveSubscriptionState(nextState);

  return nextState;
}

export function clearSubscriptionState() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);
}