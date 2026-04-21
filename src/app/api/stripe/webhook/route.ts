import { NextResponse } from "next/server";
import { stripe, tierFromPriceId, isAddonPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { recordTrialStart, recordTrialAttempt } from "@/lib/trial";
import { addBan } from "@/lib/trial-bans";
import { sendTrialReminder } from "@/lib/trial-emails";
import { handlePayInFullCompleted } from "@/lib/pay-in-full";
import { handleGiftCardCompleted } from "@/lib/gift-cards";
import type { Tier, BillingCycle } from "@/lib/plans";
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

      // Discriminator: pay-in-full sessions carry booking_type=pay_in_full
      // in their metadata. Route them to the booking-side handler before
      // the subscription path below (which expects supabase_user_id).
      if (session.metadata?.booking_type === "pay_in_full") {
        await handlePayInFullCompleted(supabase, session);
        break;
      }
      // Gift-card purchases flow through the same webhook; route to the
      // gift_cards handler.
      if (session.metadata?.booking_type === "gift_card") {
        await handleGiftCardCompleted(supabase, session);
        break;
      }

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

      // Expand items + default_payment_method so we can grab the card
      // fingerprint for cross-account dedup.
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price", "default_payment_method"],
      });

      const cardFingerprint = extractCardFingerprint(sub);

      await syncSubscriptionRow(supabase, userId, customerId, sub, cardFingerprint);
      await ensureFirstBusiness(supabase, userId, customerId, sub.id);

      // Dedup check: if this card has been used on another account's prior
      // trial, cancel the new trial immediately, log the audit row, and ban
      // the email + phone. The user will get the standard "trial isn't
      // available" message. Only enforced for trials — paid subs are fine
      // to share a card (e.g. agency owner running multiple sites).
      const isTrial = sub.status === "trialing";
      if (isTrial && cardFingerprint) {
        const { data: dup } = await supabase
          .from("account_subscriptions")
          .select("user_id")
          .eq("payment_method_fingerprint", cardFingerprint)
          .neq("user_id", userId)
          .limit(1)
          .maybeSingle();

        if (dup) {
          // Cancel the just-created subscription. Stripe charges nothing
          // because we're still in the trial window.
          try {
            await stripe.subscriptions.cancel(sub.id);
          } catch (err) {
            console.warn("Failed to cancel duplicate-card trial:", err);
          }
          await supabase
            .from("account_subscriptions")
            .update({ status: "cancelled" })
            .eq("user_id", userId);

          // Audit + ban. Phone may be empty if metadata didn't set it.
          await recordTrialAttempt({
            email: sub.metadata?.trial_email ?? "",
            phone: sub.metadata?.trial_phone ?? "",
            outcome: "blocked_payment_method_duplicate",
            notes: `card fingerprint ${cardFingerprint.slice(0, 16)}…`,
          });
          await addBan({
            email: sub.metadata?.trial_email ?? null,
            reason: `duplicate_payment_method_fingerprint:${cardFingerprint.slice(0, 16)}`,
            trigger: "duplicate_payment_method_fingerprint",
          });
          if (sub.metadata?.trial_phone) {
            await addBan({
              phone: sub.metadata.trial_phone,
              reason: `duplicate_payment_method_fingerprint:${cardFingerprint.slice(0, 16)}`,
              trigger: "duplicate_payment_method_fingerprint",
            });
          }
          break; // do not record trial_history — they didn't successfully start
        }
      }

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

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? "";
      await syncSubscriptionRow(supabase, userId, customerId, sub);
      break;
    }

    case "customer.subscription.trial_will_end": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? "";
      // Sync first so the local subscription state is fresh, then fire the
      // 3-day reminder. Stripe fires this event ~3 days before trial_end.
      await syncSubscriptionRow(supabase, userId, customerId, sub);

      const trialEndUnix =
        (sub as unknown as { trial_end?: number | null }).trial_end ??
        (sub as unknown as { current_period_end?: number | null }).current_period_end ??
        sub.items.data[0]?.current_period_end ??
        null;
      if (!trialEndUnix) break;

      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      if (!user?.email) break;

      const tierMeta = (sub.metadata?.tier as Tier) ?? null;
      const cycleMeta = (sub.metadata?.billing_cycle as BillingCycle) ?? "monthly";
      if (!tierMeta) break;

      try {
        await sendTrialReminder({
          reminderType: "3_day",
          toEmail: user.email,
          stripeSubscriptionId: sub.id,
          tier: tierMeta,
          billingCycle: cycleMeta,
          trialEnd: new Date(trialEndUnix * 1000),
        });
      } catch (err) {
        console.error("3-day reminder send failed:", err);
      }
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
  sub: Stripe.Subscription,
  cardFingerprintOverride?: string | null
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

  // Card fingerprint: prefer the value the caller already extracted (from
  // an expanded subscription); otherwise try the inline value, otherwise
  // leave the column untouched on update so we don't overwrite a previous
  // capture with null.
  const cardFp =
    cardFingerprintOverride !== undefined
      ? cardFingerprintOverride
      : extractCardFingerprint(sub);

  const row: Record<string, unknown> = {
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
  };
  if (cardFp) row.payment_method_fingerprint = cardFp;

  await supabase
    .from("account_subscriptions")
    .upsert(row, { onConflict: "user_id" });
}

/**
 * Pull the card fingerprint out of an expanded Subscription. Returns
 * null when the field isn't present (e.g. non-card payment method, or
 * default_payment_method wasn't expanded). Stripe surfaces this as
 * payment_method.card.fingerprint for cards.
 */
function extractCardFingerprint(sub: Stripe.Subscription): string | null {
  const pm = sub.default_payment_method;
  if (!pm || typeof pm === "string") return null;
  const card = (pm as Stripe.PaymentMethod).card;
  return card?.fingerprint ?? null;
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
