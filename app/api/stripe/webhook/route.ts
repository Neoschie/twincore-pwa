import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPostHogClient } from "@/lib/posthog-server";
import { mapStripeSubscriptionAuthority } from "@/lib/subscription/stripe-lifecycle";

function stripeId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function currentPeriodEnd(subscription: Stripe.Subscription) {
  const itemEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");

  if (itemEnds.length) {
    return Math.max(...itemEnds);
  }

  const subscriptionWithLegacyPeriod = subscription as Stripe.Subscription & {
    current_period_end?: number;
  };

  return subscriptionWithLegacyPeriod.current_period_end ?? null;
}

async function persistPremiumSubscription(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;
  const customerId = stripeId(subscription.customer);

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  const metadataUserId = subscription.metadata?.user_id || null;
  const userId = existing?.user_id || metadataUserId;

  if (!userId) {
    throw new Error(
      `Unable to resolve TwinCore user for Stripe subscription ${subscriptionId}.`
    );
  }

  const authority = mapStripeSubscriptionAuthority({
    status: subscription.status,
    currentPeriodEnd: currentPeriodEnd(subscription),
  });

  const { error } = await supabaseAdmin
    .from("user_subscriptions")
    .upsert(
      {
        user_id: userId,
        plan: "premium",
        status: authority.status,
        premium_expires_at: authority.premiumExpiresAt,
        party_pass_expires_at: null,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    throw error;
  }

  return { userId, authority };
}

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

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    console.error("Stripe webhook signature validation failed.");
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  try {
    console.log("Stripe webhook received:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan;

      if (plan !== "premium" && plan !== "party_pass") {
        throw new Error("Stripe checkout contained an invalid plan.");
      }

      if (!userId) {
        throw new Error("Stripe checkout contained no TwinCore user.");
      }

      if (plan === "party_pass") {
        const now = new Date();
        const partyPassExpiresAt = new Date(
          now.getTime() + 24 * 60 * 60 * 1000
        ).toISOString();

        const { error } = await supabaseAdmin
          .from("user_subscriptions")
          .upsert(
            {
              user_id: userId,
              plan: "party_pass",
              status: "active",
              premium_expires_at: null,
              party_pass_expires_at: partyPassExpiresAt,
              stripe_customer_id: stripeId(session.customer),
              stripe_subscription_id: null,
              updated_at: now.toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (error) throw error;
      }

      if (plan === "premium") {
        const subscriptionId = stripeId(session.subscription);

        if (!subscriptionId) {
          throw new Error(
            "Premium checkout completed without a Stripe subscription."
          );
        }

        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );

        await persistPremiumSubscription(subscription);
      }

      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: userId,
        event: "subscription_activated",
        properties: { plan, user_id: userId },
      });
      await posthog.shutdown();
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      await persistPremiumSubscription(subscription);
    }

    if (
      event.type === "invoice.payment_failed" ||
      event.type === "invoice.payment_succeeded"
    ) {
      const invoice = event.data.object as Stripe.Invoice;
      const parent = invoice.parent;

      const subscriptionId =
        parent?.type === "subscription_details"
          ? stripeId(parent.subscription_details?.subscription)
          : null;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );
        await persistPremiumSubscription(subscription);
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    console.error("Stripe webhook processing failed.");

    return NextResponse.json(
      { error: "Stripe webhook processing failed." },
      { status: 500 }
    );
  }
}
