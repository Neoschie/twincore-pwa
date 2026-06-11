import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPostHogClient } from "@/lib/posthog-server";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing webhook secret." },
      { status: 500 }
    );
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

   console.log("Stripe webhook received:", event.type);

if (event.type === "checkout.session.completed") {
  const session = event.data.object;

  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan;

  if (userId && plan) {
    const now = new Date();

    const premiumExpiresAt =
      plan === "premium"
        ? null
        : null;

    const partyPassExpiresAt =
      plan === "party_pass"
        ? new Date(
            now.getTime() + 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

    await supabaseAdmin
      .from("user_subscriptions")
      .upsert({
        user_id: userId,

        plan,

        status: "active",

        premium_expires_at: premiumExpiresAt,

        party_pass_expires_at:
          partyPassExpiresAt,

        updated_at: new Date().toISOString(),
      });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: "subscription_activated",
      properties: { plan, user_id: userId },
    });
    await posthog.shutdown();
  }
}

return NextResponse.json({ received: true });
    
} catch (error) {
    console.error("Stripe webhook error:", error);

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }
}