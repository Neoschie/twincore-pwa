import type { TwinCorePlanType } from "./types";

export async function startSubscriptionPurchase(plan: TwinCorePlanType) {
  if (plan !== "premium" && plan !== "party_pass") {
    return {
      success: false,
      message: "Unknown subscription plan.",
    };
  }

  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan }),
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