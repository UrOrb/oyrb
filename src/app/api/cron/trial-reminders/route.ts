import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendTrialReminder, type ReminderType } from "@/lib/trial-emails";
import type { Tier, BillingCycle } from "@/lib/plans";

/**
 * Daily cron: sends 7-day and 1-day trial-end reminders.
 *
 * 3-day reminder is fired by Stripe's `customer.subscription.trial_will_end`
 * webhook (see /api/stripe/webhook), so this job intentionally only handles
 * the other two. Runs once per day via Vercel Cron — see vercel.json.
 *
 * Idempotency: sendTrialReminder() checks trial_reminders_sent before each
 * send, so re-running this job (or running it twice in a single day) won't
 * double-send.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const startedAt = Date.now();

  // Pull every trialing subscription with its conversion date. Filter the
  // 7-day and 1-day windows in JS so the SQL stays simple — count is small.
  const { data: trialing, error } = await admin
    .from("account_subscriptions")
    .select("user_id, tier, billing_cycle, stripe_subscription_id, current_period_end")
    .eq("status", "trialing")
    .not("current_period_end", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const SEVEN = 7 * 24 * 60 * 60 * 1000;
  const ONE = 1 * 24 * 60 * 60 * 1000;
  const HALF_DAY = 12 * 60 * 60 * 1000;

  let scanned = 0;
  let sent7 = 0;
  let sent1 = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of trialing ?? []) {
    scanned++;
    const trialEnd = new Date(row.current_period_end as string);
    const ms = trialEnd.getTime() - now.getTime();

    let reminderType: ReminderType | null = null;
    if (Math.abs(ms - SEVEN) <= HALF_DAY) reminderType = "7_day";
    else if (Math.abs(ms - ONE) <= HALF_DAY) reminderType = "1_day";
    if (!reminderType) continue;

    // Look up the user's email — account_subscriptions doesn't store it.
    const { data: { user } } = await admin.auth.admin.getUserById(row.user_id);
    const toEmail = user?.email;
    if (!toEmail) {
      errors++;
      continue;
    }

    const result = await sendTrialReminder({
      reminderType,
      toEmail,
      stripeSubscriptionId: row.stripe_subscription_id,
      tier: row.tier as Tier,
      billingCycle: row.billing_cycle as BillingCycle,
      trialEnd,
    });

    if (result.sent) {
      if (reminderType === "7_day") sent7++;
      else sent1++;
    } else if (result.reason === "already_sent") {
      skipped++;
    } else {
      errors++;
    }
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    scanned,
    sent_7_day: sent7,
    sent_1_day: sent1,
    skipped_already_sent: skipped,
    errors,
  });
}
