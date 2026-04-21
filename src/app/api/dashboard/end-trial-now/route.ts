import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getAccountSummary } from "@/lib/account";

/**
 * Converts an active trial to immediate billing. Stripe charges the user
 * right now, the trial offer is forfeited (single trial per identity rule
 * still applies), and add-on purchases unlock. The user explicitly opts in
 * via a "Skip trial and start now" button.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const summary = await getAccountSummary();
  if (!summary?.subscription) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }
  if (summary.subscription.status !== "trialing") {
    return NextResponse.json({ error: "Subscription is not in a trial" }, { status: 400 });
  }

  try {
    // `trial_end: "now"` tells Stripe to end the trial immediately and
    // generate a prorated invoice; the customer's saved payment method is
    // charged right away. Webhook will sync the status flip from trialing
    // → active.
    await stripe.subscriptions.update(summary.subscription.stripe_subscription_id, {
      trial_end: "now",
      proration_behavior: "create_prorations",
    });
  } catch (err) {
    console.error("Failed to end trial early:", err);
    return NextResponse.json(
      { error: "Couldn't end the trial. Please try again or contact support." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
