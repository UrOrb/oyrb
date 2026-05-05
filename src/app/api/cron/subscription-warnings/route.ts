import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPreBillingReminder, sendGraceExpiring } from "@/lib/email";

/**
 * Daily cron — subscription billing lifecycle. Runs three independent
 * passes against account_subscriptions:
 *
 *   1. T-3 pre-billing reminder for status='active' subscriptions whose
 *      current_period_end falls in the next 3-4 day window. Trialing
 *      pros are intentionally excluded — they get a separate ladder via
 *      sendTrialReminder (Stripe customer.subscription.trial_will_end +
 *      /api/cron/trial-reminders).
 *
 *   2. T+1 grace-expiring warning for past_due subscriptions whose
 *      grace_period_ends_at is "tomorrow" (within ~24h). Dedup anchor:
 *      last_warning_sent_at must be older than past_due_since (i.e. we
 *      haven't already warned within THIS failure cycle).
 *
 *   3. Enforcement: past_due subscriptions with grace_period_ends_at in
 *      the past flip is_published=false on their businesses and stamp
 *      unpublished_for_billing_at. Pro-managed unpublished storefronts
 *      are untouched. Already-paused storefronts are no-ops.
 *
 * Idempotency: every step uses one of three guards — column-level NULL
 * checks, last_warning_sent_at vs past_due_since, or unpublished_for_billing_at
 * IS NULL — so a duplicate cron run never double-sends or double-pauses.
 *
 * Auth: requires Authorization: Bearer ${CRON_SECRET} on every request.
 * Vercel Cron sets this automatically when configured in vercel.json.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const startedAt = Date.now();

  let preBillingSent = 0;
  let graceExpiringSent = 0;
  let enforced = 0;
  const errors: string[] = [];

  // ── 1. T-3 pre-billing reminders ──────────────────────────────────────
  // Pull active subs whose current_period_end is in the next 3-4 day window.
  // Filtering in SQL to keep the row count small even on large platforms.
  try {
    const threeDaysOut = new Date(now.getTime() + 3 * DAY_MS);
    const fourDaysOut = new Date(now.getTime() + 4 * DAY_MS);

    const { data: upcoming, error } = await admin
      .from("account_subscriptions")
      .select(
        "user_id, tier, stripe_subscription_id, current_period_end, last_warning_sent_at",
      )
      .eq("status", "active")
      .gte("current_period_end", threeDaysOut.toISOString())
      .lt("current_period_end", fourDaysOut.toISOString());
    if (error) throw error;

    for (const sub of upcoming ?? []) {
      if (!sub.current_period_end) continue;
      const periodEnd = new Date(sub.current_period_end);

      // Dedup: last_warning_sent_at must be older than (period_end - 4 days).
      // A single billing cycle is at least 30 days, so a same-cycle prior
      // send would always fall inside that window. Cross-cycle prior sends
      // are old enough to ignore.
      const cycleAnchor = new Date(periodEnd.getTime() - 4 * DAY_MS);
      if (
        sub.last_warning_sent_at &&
        new Date(sub.last_warning_sent_at) > cycleAnchor
      ) {
        continue;
      }

      const { data: { user } } = await admin.auth.admin.getUserById(sub.user_id);
      if (!user?.email) continue;

      try {
        await sendPreBillingReminder({
          to: user.email,
          chargeAt: periodEnd,
          tier: tierLabel(sub.tier as string),
        });
        await admin
          .from("account_subscriptions")
          .update({ last_warning_sent_at: now.toISOString() })
          .eq("stripe_subscription_id", sub.stripe_subscription_id);
        preBillingSent++;
      } catch (err) {
        console.error("pre-billing send failed:", err);
        errors.push(`pre-billing ${sub.stripe_subscription_id}`);
      }
    }
  } catch (err) {
    console.error("pre-billing pass failed:", err);
    errors.push(`pre-billing-pass:${err instanceof Error ? err.message : "unknown"}`);
  }

  // ── 2. T+1 grace-expiring warnings ────────────────────────────────────
  // Past-due subs whose grace ends in the next ~24h AND we haven't yet
  // warned during this failure cycle. The < past_due_since check is the
  // dedup — once we send a T+1 warning, last_warning_sent_at jumps above
  // past_due_since and the next cron pass skips the row.
  try {
    const oneDayOut = new Date(now.getTime() + 1.5 * DAY_MS);

    const { data: expiring, error } = await admin
      .from("account_subscriptions")
      .select(
        "user_id, tier, stripe_subscription_id, past_due_since, grace_period_ends_at, last_warning_sent_at",
      )
      .eq("status", "past_due")
      .gt("grace_period_ends_at", now.toISOString())
      .lt("grace_period_ends_at", oneDayOut.toISOString());
    if (error) throw error;

    for (const sub of expiring ?? []) {
      if (!sub.grace_period_ends_at || !sub.past_due_since) continue;

      // Dedup against the current past-due cycle.
      if (
        sub.last_warning_sent_at &&
        new Date(sub.last_warning_sent_at) > new Date(sub.past_due_since)
      ) {
        continue;
      }

      const { data: { user } } = await admin.auth.admin.getUserById(sub.user_id);
      if (!user?.email) continue;

      try {
        await sendGraceExpiring({
          to: user.email,
          graceEndsAt: new Date(sub.grace_period_ends_at),
          tier: tierLabel(sub.tier as string),
        });
        await admin
          .from("account_subscriptions")
          .update({ last_warning_sent_at: now.toISOString() })
          .eq("stripe_subscription_id", sub.stripe_subscription_id);
        graceExpiringSent++;
      } catch (err) {
        console.error("grace-expiring send failed:", err);
        errors.push(`grace ${sub.stripe_subscription_id}`);
      }
    }
  } catch (err) {
    console.error("grace pass failed:", err);
    errors.push(`grace-pass:${err instanceof Error ? err.message : "unknown"}`);
  }

  // ── 3. Enforcement (T+2 — grace expired) ──────────────────────────────
  // Pause every still-published storefront for past-due pros whose grace
  // window has elapsed. Stamp unpublished_for_billing_at so the recovery
  // path on invoice.payment_succeeded knows which rows to re-publish.
  try {
    const { data: expired, error } = await admin
      .from("account_subscriptions")
      .select("user_id, stripe_subscription_id")
      .eq("status", "past_due")
      .not("grace_period_ends_at", "is", null)
      .lt("grace_period_ends_at", now.toISOString());
    if (error) throw error;

    for (const sub of expired ?? []) {
      try {
        const { data: paused, error: pauseErr } = await admin
          .from("businesses")
          .update({
            is_published: false,
            unpublished_for_billing_at: now.toISOString(),
          })
          .eq("owner_id", sub.user_id)
          .eq("is_published", true)
          .is("unpublished_for_billing_at", null)
          .select("id");
        if (pauseErr) throw pauseErr;
        enforced += paused?.length ?? 0;
      } catch (err) {
        console.error("enforcement step failed:", err);
        errors.push(`enforce ${sub.stripe_subscription_id}`);
      }
    }
  } catch (err) {
    console.error("enforcement pass failed:", err);
    errors.push(`enforcement-pass:${err instanceof Error ? err.message : "unknown"}`);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    durationMs: Date.now() - startedAt,
    preBillingSent,
    graceExpiringSent,
    storefrontsUnpublished: enforced,
    errors: errors.length > 0 ? errors : undefined,
  });
}

function tierLabel(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
