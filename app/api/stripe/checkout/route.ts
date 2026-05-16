import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { plan, accessToken } = body;

    if (!plan) {
      return NextResponse.json(
        { error: "Missing plan." },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const isPremium = plan === "premium";

    const session = await stripe.checkout.sessions.create({
      mode: isPremium ? "subscription" : "payment",

      payment_method_types: ["card"],

      metadata: {
        user_id: user.id,
        plan,
      },

      line_items: [
        {
          price_data: {
            currency: "usd",

            product_data: {
              name: isPremium
                ? "TwinCore Premium"
                : "TwinCore Party Pass",
            },

            recurring: isPremium
              ? {
                  interval: "month",
                }
              : undefined,

            unit_amount: isPremium
              ? 2499
              : 599,
          },

          quantity: 1,
        },
      ],

      success_url: `${appUrl}/twinme?checkout=success`,
      cancel_url: `${appUrl}/onboarding?checkout=cancelled`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Stripe checkout failed." },
      { status: 500 }
    );
  }
}

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const isPremium = plan === "premium";

    const session = await stripe.checkout.sessions.create({
      mode: isPremium ? "subscription" : "payment",

      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "usd",

            product_data: {
              name: isPremium
                ? "TwinCore Premium"
                : "TwinCore Party Pass",
            },

            recurring: isPremium
              ? {
                  interval: "month",
                }
              : undefined,

            unit_amount: isPremium
              ? 2499
              : 599,
          },

          quantity: 1,
        },
      ],

      success_url: `${appUrl}/twinme?checkout=success`,
      cancel_url: `${appUrl}/onboarding?checkout=cancelled`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Stripe checkout failed." },
      { status: 500 }
    );
  }
}