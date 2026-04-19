import { NextResponse } from "next/server";
import { stripe, PRICE_IDS, type PriceTier } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tier: PriceTier; addNew?: boolean };
    const { tier, addNew } = body;
    const priceId = PRICE_IDS[tier];

    if (!priceId) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Re-use the user's existing Stripe customer if any; same person, multiple
    // subscriptions (one per site). Look at any of their businesses for it.
    const { data: anyBiz } = await supabase
      .from("businesses")
      .select("stripe_customer_id")
      .eq("owner_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    let customerId = anyBiz?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // success_url for the additional-site purchase routes through a small
    // bouncer page that polls for the freshly-created business and forwards
    // straight into its setup, so the user never lands back on the dashboard.
    const successPath = addNew
      ? `/dashboard/site/new/landing?session={CHECKOUT_SESSION_ID}`
      : `/dashboard?checkout=success`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
        // Stripe puts subscription metadata onto the subscription object the
        // webhook receives, which is where we read the add-new-site flag.
        metadata: {
          supabase_user_id: user.id,
          tier,
          add_new_site: addNew ? "true" : "false",
        },
      },
      success_url: `${appUrl}${successPath}`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        tier,
        add_new_site: addNew ? "true" : "false",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
