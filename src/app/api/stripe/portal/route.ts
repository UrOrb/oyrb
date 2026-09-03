import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Creates a Stripe Customer Portal session. Users manage subscription,
// update payment method, download invoices, and cancel — all self-service
// (FTC "click to cancel" compliance).
//
// Accepts both GET and POST so a plain <Link href="/api/stripe/portal">
// from the Settings page works (GET, issues a 302 to the portal URL) and
// a fetch("...", { method: "POST" }) from the Settings form also works
// (POST, returns { url } JSON for the client to follow).
export async function GET(request: NextRequest) {
  const result = await createPortalSession(request);
  if ("error" in result) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings/general?portal_error=${encodeURIComponent(result.error)}`, request.url)
    );
  }
  return NextResponse.redirect(result.url);
}

export async function POST(request: NextRequest) {
  const result = await createPortalSession(request);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ url: result.url });
}

async function createPortalSession(request: NextRequest): Promise<
  | { url: string }
  | { error: string; status?: number }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized", status: 401 };

  // limit(1) matters: maybeSingle() ERRORS (data=null) when the query
  // matches more than one row, so without it every multi-site pro got a
  // permanent 404 here and couldn't reach the billing portal. Prefer the
  // oldest row that actually has a customer id.
  const { data: business } = await supabase
    .from("businesses")
    .select("id, stripe_customer_id")
    .eq("owner_id", user.id)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!business?.stripe_customer_id) {
    return { error: "No subscription to manage. Subscribe first.", status: 404 };
  }

  const origin = new URL(request.url).origin;
  const returnUrl = `${origin}/dashboard/settings/general`;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: returnUrl,
    });
    return { url: session.url };
  } catch (err) {
    // Stale-customer recovery — when Stripe reports the customer
    // doesn't exist (deleted out-of-band: manual admin action in the
    // Stripe Dashboard, cleanup script, etc.), recreate it and retry
    // once. The pro keeps billing-portal access; lost subscriptions
    // are NOT restored (subscriptions belong to customers in Stripe's
    // data model — deleting the customer kills the sub).
    //
    // First use of `Stripe.errors.*` instanceof checks in OYRB. Reuse
    // this exact pattern (`err instanceof Stripe.errors.X && err.code
    // === '...' && err.param === '...'`) for any future Stripe error
    // discrimination — discriminating by code/param keeps recovery
    // logic narrow and prevents accidental over-handling.
    if (
      err instanceof Stripe.errors.StripeInvalidRequestError &&
      err.code === "resource_missing" &&
      err.param === "customer"
    ) {
      return await recoverAndRetry({
        userId: user.id,
        userEmail: user.email ?? null,
        businessId: business.id,
        oldCustomerId: business.stripe_customer_id,
        returnUrl,
      });
    }

    // Any other Stripe error: the portal IS configured (otherwise no
    // pro would have ever reached it). Treat unrecognized errors as
    // a temporary platform issue rather than a config problem.
    console.error("Customer Portal error:", err);
    return {
      error: "Could not access billing portal — please contact support.",
      status: 503,
    };
  }
}

/**
 * Recovery path when Stripe says `resource_missing - customer`. Creates
 * a fresh Stripe customer carrying the user's email and a
 * `recovered_from` metadata trail, updates both tables that store
 * `stripe_customer_id` (UPDATE-only on `account_subscriptions` to
 * respect its NOT NULL `stripe_subscription_id` constraint), and
 * retries the portal session ONCE.
 *
 * IMPORTANT: this restores BILLING PORTAL ACCESS only. Any
 * subscription the pro had on the deleted customer is also gone.
 * Pros affected need manual ops reconciliation to restore their tier
 * if applicable — the recovery log line is the trigger for that.
 */
async function recoverAndRetry(params: {
  userId: string;
  userEmail: string | null;
  businessId: string;
  oldCustomerId: string;
  returnUrl: string;
}): Promise<{ url: string } | { error: string; status?: number }> {
  const { userId, userEmail, businessId, oldCustomerId, returnUrl } = params;

  // Inline customer creation matching api/checkout/route.ts:107.
  // Phone isn't available in the portal context — Stripe doesn't
  // require it. Metadata records the old customer ID so a future ops
  // query can reconstruct which pros were affected.
  let newCustomerId: string;
  try {
    const customer = await stripe.customers.create({
      email: userEmail ?? undefined,
      metadata: {
        supabase_user_id: userId,
        recovered_from: oldCustomerId,
      },
    });
    newCustomerId = customer.id;
  } catch (err) {
    console.error("[stripe-recovery] customer creation failed:", err);
    return {
      error: "Could not access billing portal — please contact support.",
      status: 503,
    };
  }

  // Update both tables that carry the customer ID. `account_subscriptions`
  // is UPDATE-only — INSERT would violate `stripe_subscription_id NOT
  // NULL`, and the pro doesn't have a real subscription on the new
  // customer yet. If they don't have an `account_subscriptions` row
  // (e.g., cancelled long ago), the UPDATE is a no-op and the next
  // checkout flow creates a fresh row pointing at the new customer.
  const admin = createAdminClient();
  const { error: bizUpdErr } = await admin
    .from("businesses")
    .update({ stripe_customer_id: newCustomerId })
    .eq("id", businessId);
  if (bizUpdErr) {
    console.error(
      "[stripe-recovery] businesses update failed:",
      bizUpdErr.message,
    );
    return {
      error: "Could not access billing portal — please contact support.",
      status: 503,
    };
  }
  // Best-effort on `account_subscriptions` — failure logged but doesn't
  // block the retry. The portal works as long as `businesses` is current;
  // any drift on `account_subscriptions` gets reconciled at the next
  // checkout/webhook event.
  const { error: subUpdErr } = await admin
    .from("account_subscriptions")
    .update({ stripe_customer_id: newCustomerId })
    .eq("user_id", userId);
  if (subUpdErr) {
    console.error(
      "[stripe-recovery] account_subscriptions update failed:",
      subUpdErr.message,
    );
  }

  console.log(
    `[stripe-recovery] stale customer ${oldCustomerId} for business ${businessId} replaced with ${newCustomerId}`,
  );

  // Retry the portal session ONCE with the new customer. No recursion
  // on second failure — surface a clean 503 and let the user retry.
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: newCustomerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  } catch (err) {
    console.error("[stripe-recovery] retry failed:", err);
    return {
      error: "Could not access billing portal — please contact support.",
      status: 503,
    };
  }
}
