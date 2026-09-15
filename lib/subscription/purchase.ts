import type { TwinCorePlanType } from "./types";
import { supabase } from "@/lib/supabase/client";
import { apiUrl } from "@/lib/api-url";

export async function startSubscriptionPurchase(plan: TwinCorePlanType) {
  if (plan !== "premium" && plan !== "party_pass") {
    return {
      success: false,
      message: "Unknown subscription plan.",
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {
      success: false,
      message: "Please sign in before starting checkout.",
    };
  }

  const response = await fetch(apiUrl("/api/stripe/checkout"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan,
      accessToken: session.access_token,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.url) {
    return {
      success: false,
      message: data.error || "Unable to start checkout.",
    };
  }

  return {
    success: true,
    redirectTo: data.url as string,
  };
}