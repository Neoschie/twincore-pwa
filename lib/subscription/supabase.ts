import { supabase } from "@/lib/supabase/client";
import type { TwinCoreSubscriptionState } from "./types";
import { getDefaultSubscriptionState } from "./storage";

export async function getUserSubscriptionFromSupabase(): Promise<TwinCoreSubscriptionState> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return getDefaultSubscriptionState();
  }

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return getDefaultSubscriptionState();
  }

  const now = Date.now();

  const partyPassExpiresAt = data.party_pass_expires_at
    ? new Date(data.party_pass_expires_at).getTime()
    : null;

  const premiumExpiresAt = data.premium_expires_at
    ? new Date(data.premium_expires_at).getTime()
    : null;

  const expiresAt =
    data.plan === "party_pass"
      ? partyPassExpiresAt
      : data.plan === "premium"
      ? premiumExpiresAt
      : null;

  return {
    plan: data.plan ?? "free",
    status:
      expiresAt && now > expiresAt
        ? "expired"
        : data.status ?? "inactive",

    startedAt: data.created_at
      ? new Date(data.created_at).getTime()
      : null,

    expiresAt,

    partyPassActivatedAt: null,
    partyPassExpiresAt,

    source: "supabase",
  };
}