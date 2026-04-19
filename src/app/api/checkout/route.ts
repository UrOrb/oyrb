import { NextResponse } from "next/server";
import { stripe, priceIdFor, type PriceTier } from "@/lib/stripe";
import type { BillingCycle } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

/**
 * First-time checkout. The body picks { tier, cycle } and we resolve the
 * matching price ID. Add-on purchases for additional sites no longer go
 * through this endpoint — they hit /api/dashboard/add-site which mutates
 * the existing subscription instead.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tier?: PriceTier; cycle?: BillingCycle };
    const tier = body.tier;
    const cycle = body.cycle ?? "monthly";

    if (!tier || (tier !== "starter" && tier !== "studio" && tier !== "scale")) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }
    if (cycle !== "monthly" && cycle !== "annual") {
      return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
    }

    const priceId = priceIdFor(tier, cycle);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Re-use the user's existing Stripe customer if any (e.g. they cancelled
    // and are re-subscribing). Look at the account_subscriptions row first,
    // fall back to any business they previously owned.
    let customerId: string | undefined;
    const { data: existingSub } = await supabase
      .from("account_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    customerId = existingSub?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const { data: anyBiz } = await supabase
        .from("businesses")
        .select("stripe_customer_id")
        .eq("owner_id", user.id)
        .not("stripe_customer_id", "is", null)
        .limit(1)
        .maybeSingle();
      customerId = anyBiz?.stripe_customer_id ?? undefined;
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        metadata: {
          supabase_user_id: user.id,
          tier,
          billing_cycle: cycle,
        },
      },
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        tier,
        billing_cycle: cycle,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
