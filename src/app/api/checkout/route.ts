import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { stripe, priceIdFor, type PriceTier } from "@/lib/stripe";
import type { BillingCycle } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { checkTrialEligibility } from "@/lib/trial";
import { isDemoMode } from "@/lib/demo";

const VERIFY_SECRET = process.env.CLIENT_AUTH_SECRET ?? "";
const encoder = new TextEncoder();

/**
 * First-time checkout. Body: { tier, cycle, skipTrial?, phoneToken?, phone? }.
 *
 *   skipTrial=false (default) → 14-day trial via trial_period_days. Requires
 *     a valid phone-verification JWT (issued by /api/public/verify/check)
 *     and passes the (email, phone) pair through trial-eligibility checks.
 *   skipTrial=true            → no trial; charge today. No phone verification
 *     required, no trial_history row written.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      tier?: PriceTier;
      cycle?: BillingCycle;
      skipTrial?: boolean;
      phoneToken?: string;
      phone?: string;
      deviceFingerprint?: string | null;
    };
    const tier = body.tier;
    const cycle = body.cycle ?? "monthly";
    const skipTrial = !!body.skipTrial;
    const deviceFingerprint = body.deviceFingerprint?.trim() || undefined;

    if (!tier || (tier !== "starter" && tier !== "studio" && tier !== "scale")) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }
    if (cycle !== "monthly" && cycle !== "annual") {
      return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
    }

    // Demo mode: never touch Stripe. Pretend the checkout succeeded and
    // send the client a URL that just goes back to the dashboard with a
    // success flag. The client renders a "Demo mode — no real charge made"
    // toast from the DEMO_MODE banner.
    if (isDemoMode()) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://demo.oyrb.space";
      return NextResponse.json({
        url: `${appUrl}/dashboard?checkout=success&demo=1`,
        demo: true,
      });
    }

    const priceId = priceIdFor(tier, cycle);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!user.email) {
      return NextResponse.json({ error: "Account is missing an email" }, { status: 400 });
    }

    // Trial path: validate the phone-verification JWT and check eligibility
    // BEFORE we touch Stripe so we never send the user to checkout if they're
    // ineligible. Skip-trial path bypasses both — they pay today and never
    // claim the trial offer.
    let verifiedPhone: string | null = null;
    if (!skipTrial) {
      if (!body.phoneToken || !body.phone) {
        return NextResponse.json(
          { error: "Phone verification is required to start a free trial." },
          { status: 400 }
        );
      }
      const phoneFromToken = await verifyPhoneToken(body.phoneToken);
      if (!phoneFromToken || phoneFromToken !== body.phone.trim()) {
        return NextResponse.json(
          { error: "Phone verification is invalid or expired. Please verify again." },
          { status: 400 }
        );
      }
      verifiedPhone = phoneFromToken;

      const eligibility = await checkTrialEligibility({
        email: user.email,
        phone: verifiedPhone,
        phoneVerified: true,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        deviceFingerprint,
      });
      if (!eligibility.ok) {
        return NextResponse.json(
          { error: eligibility.message, code: eligibility.reason },
          { status: 409 }
        );
      }
    }

    // Re-use the user's existing Stripe customer if any.
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
        email: user.email,
        phone: verifiedPhone ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Skip-trial path → omit trial_period_days entirely so Stripe charges
      // today. Trial path → standard 14-day trial requiring a saved card.
      subscription_data: skipTrial
        ? {
            metadata: {
              supabase_user_id: user.id,
              tier,
              billing_cycle: cycle,
              skipped_trial: "true",
              device_fingerprint: deviceFingerprint ?? "",
            },
          }
        : {
            trial_period_days: 14,
            trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
            metadata: {
              supabase_user_id: user.id,
              tier,
              billing_cycle: cycle,
              trial_email: user.email,
              trial_phone: verifiedPhone ?? "",
              device_fingerprint: deviceFingerprint ?? "",
            },
          },
      // Always require a payment method (even in trial mode — required by spec).
      payment_method_collection: "always",
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        tier,
        billing_cycle: cycle,
        skipped_trial: skipTrial ? "true" : "false",
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

async function verifyPhoneToken(token: string): Promise<string | null> {
  if (!VERIFY_SECRET || VERIFY_SECRET.length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, encoder.encode(VERIFY_SECRET));
    if ((payload as { kind?: string }).kind !== "phone_verified") return null;
    return ((payload as { phone?: string }).phone ?? "").trim() || null;
  } catch {
    return null;
  }
}
