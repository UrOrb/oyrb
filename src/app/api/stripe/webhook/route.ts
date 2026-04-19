import { NextResponse } from "next/server";
import { stripe, tierFromPriceId, isAddonPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { recordTrialStart } from "@/lib/trial";
import type Stripe from "stripe";

/**
 * Stripe webhook → account_subscriptions sync. The handler is idempotent:
 * every code path upserts by `stripe_subscription_id`, so retries can't
 * corrupt state. Subscribed events (configure in Stripe Dashboard):
 *
 *   checkout.session.completed
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.payment_succeeded
 *   invoice.payment_failed
 *   customer.subscription.trial_will_end       (optional)
 */
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId) break;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!subscriptionId) break;

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? "";

      // Pull the full subscription so we can resolve tier+cycle from the
      // actual line items rather than trusting the metadata (defends against
      // metadata drift if someone edits the checkout in Stripe Dashboard).
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });

      await syncSubscriptionRow(supabase, userId, customerId, sub);
      await ensureFirstBusiness(supabase, userId, customerId, sub.id);

      // Record the trial in trial_history when the subscription was created
      // with a trial. The unique indexes on (email, phone) enforce one-trial-
      // per-identity at the DB layer too. Skip-trial path doesn't have
      // trial_email metadata so this no-ops naturally.
      const trialEmail = sub.metadata?.trial_email ?? "";
      const trialPhone = sub.metadata?.trial_phone ?? "";
      const billingCycle = (sub.metadata?.billing_cycle as "monthly" | "annual") ?? "monthly";
      const tierMeta = (sub.metadata?.tier as "starter" | "studio" | "scale") ?? null;
      if (sub.status === "trialing" && trialEmail && trialPhone && tierMeta) {
        try {
          await recordTrialStart({
            userId,
            email: trialEmail,
            phone: trialPhone,
            tier: tierMeta,
            billingCycle,
            stripeSubscriptionId: sub.id,
          });
        } catch (err) {
          // The DB unique index will catch a true duplicate; everything
          // else is best-effort.
          console.warn("recordTrialStart failed:", err);
        }
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.trial_will_end": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? "";
      await syncSubscriptionRow(supabase, userId, customerId, sub);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      // Mark the account cancelled and soft-archive every business so the
      // user's data isn't lost — they get it back on resubscribe.
      const { data: row } = await supabase
        .from("account_subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle();
      const userId = row?.user_id ?? sub.metadata?.supabase_user_id;
      await supabase
        .from("account_subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", sub.id);
      if (userId) {
        await supabase
          .from("businesses")
          .update({ archived_at: new Date().toISOString(), is_published: false })
          .eq("owner_id", userId)
          .is("archived_at", null);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const inv = event.data.object as Stripe.Invoice;
      // The `subscription` field on Invoice was moved out of the typed shape
      // in newer Stripe API versions but is still present at runtime; read
      // through a cast.
      const subscriptionId = (inv as unknown as { subscription?: string | null }).subscription;
      if (!subscriptionId) break;
      const periodEnd = inv.lines.data[0]?.period?.end;
      await supabase
        .from("account_subscriptions")
        .update({
          status: "active",
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscriptionId);
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const subscriptionId = (inv as unknown as { subscription?: string | null }).subscription;
      if (!subscriptionId) break;
      await supabase
        .from("account_subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", subscriptionId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

// ── helpers ───────────────────────────────────────────────────────────────

async function syncSubscriptionRow(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  customerId: string,
  sub: Stripe.Subscription
) {
  // Find the base-plan line item (the one that matches a tier price), the
  // add-on item, and derive billing cycle from whichever is present.
  let tier: "starter" | "studio" | "scale" | null = null;
  let cycle: "monthly" | "annual" | null = null;
  let addonItemId: string | null = null;
  let addonCount = 0;

  for (const item of sub.items.data) {
    const priceId = item.price?.id ?? "";
    if (isAddonPriceId(priceId)) {
      addonItemId = item.id;
      addonCount = item.quantity ?? 0;
      continue;
    }
    const resolved = tierFromPriceId(priceId);
    if (resolved) {
      tier = resolved.tier;
      cycle = resolved.cycle;
    }
  }

  if (!tier || !cycle) {
    // Subscription with no recognized base-plan price — log and bail rather
    // than silently corrupting the account row.
    console.warn(`Webhook: no tier resolved for subscription ${sub.id}`);
    return;
  }

  // current_period_end was moved off the top-level Subscription in newer
  // Stripe API versions and now lives on each item. Use the first base item's
  // period; same value across items on a single-billing-cycle subscription.
  const periodEndUnix =
    (sub as unknown as { current_period_end?: number | null }).current_period_end ??
    sub.items.data[0]?.current_period_end ??
    null;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

  const status = mapStatus(sub.status);

  await supabase
    .from("account_subscriptions")
    .upsert(
      {
        user_id: userId,
        tier,
        billing_cycle: cycle,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        stripe_addon_item_id: addonItemId,
        addon_count: addonCount,
        status,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
}

function mapStatus(s: Stripe.Subscription.Status):
  | "active" | "trialing" | "past_due" | "cancelled" | "incomplete" {
  if (s === "active") return "active";
  if (s === "trialing") return "trialing";
  if (s === "past_due") return "past_due";
  if (s === "canceled" || s === "unpaid") return "cancelled";
  return "incomplete";
}

async function ensureFirstBusiness(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  customerId: string,
  subscriptionId: string
) {
  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .limit(1);
  if (existing && existing.length > 0) return;

  const { data: { user } } = await supabase.auth.admin.getUserById(userId);
  const baseSlug = (user?.email?.split("@")[0] ?? "studio")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");

  await supabase.from("businesses").insert({
    owner_id: userId,
    business_name: user?.user_metadata?.full_name ?? "My Studio",
    slug: `${baseSlug}-${Date.now().toString(36)}`,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_status: "active",
    is_featured: true,
    featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}
