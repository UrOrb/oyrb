import { resend } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/server";
import { TIERS, fmtMoney, type Tier, type BillingCycle } from "@/lib/plans";

const FROM = process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://oyrb.space";

export type ReminderType = "7_day" | "3_day" | "1_day";

const SUBJECTS: Record<ReminderType, string> = {
  "7_day": "Your free trial ends in 7 days",
  "3_day": "Your free trial ends in 3 days",
  "1_day": "Your free trial ends tomorrow",
};

const HEADLINES: Record<ReminderType, string> = {
  "7_day": "1 week left in your trial.",
  "3_day": "3 days left in your trial.",
  "1_day": "Your trial ends tomorrow.",
};

const LEAD: Record<ReminderType, string> = {
  "7_day":
    "You have 7 days of OYRB left before your card is charged. No action needed if you want to keep going — we'll renew automatically.",
  "3_day":
    "Just a heads-up — your free trial wraps up in 3 days. We'll bill the card you saved unless you cancel before then.",
  "1_day":
    "Tomorrow is the day your free trial converts to a paid plan. Last chance to cancel and pay nothing.",
};

/**
 * Send one trial reminder. Idempotent: writes a row in trial_reminders_sent
 * after a successful send and refuses to fire again for the same
 * (subscription, reminder_type) pair. Safe to invoke from both the daily
 * cron (7-day, 1-day) and the trial_will_end webhook (3-day).
 */
export async function sendTrialReminder(input: {
  reminderType: ReminderType;
  toEmail: string;
  stripeSubscriptionId: string;
  tier: Tier;
  billingCycle: BillingCycle;
  trialEnd: Date;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!resend) return { sent: false, reason: "resend_not_configured" };

  const admin = createAdminClient();

  // Idempotency check first. If a row already exists, skip.
  const { data: existing } = await admin
    .from("trial_reminders_sent")
    .select("id")
    .eq("stripe_subscription_id", input.stripeSubscriptionId)
    .eq("reminder_type", input.reminderType)
    .maybeSingle();
  if (existing) return { sent: false, reason: "already_sent" };

  const tier = TIERS[input.tier];
  const amountCents = input.billingCycle === "monthly" ? tier.monthlyPriceCents : tier.annualPriceCents;
  const amountLabel = `${fmtMoney(amountCents)}${input.billingCycle === "monthly" ? "/month" : "/year"}`;
  const conversionDate = input.trialEnd.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const subject = SUBJECTS[input.reminderType];
  const html = renderHtml({
    headline: HEADLINES[input.reminderType],
    lead: LEAD[input.reminderType],
    planName: tier.name,
    cycleLabel: input.billingCycle === "monthly" ? "Monthly" : "Annual",
    amountLabel,
    conversionDate,
    manageUrl: `${APP_URL}/dashboard/settings`,
    cancelUrl: `${APP_URL}/api/stripe/portal`,
  });

  try {
    await resend.emails.send({ from: FROM, to: input.toEmail, subject, html });
  } catch (err) {
    console.error(`Trial reminder send failed (${input.reminderType}):`, err);
    return { sent: false, reason: "send_error" };
  }

  // Only record after a successful send so a failed Resend call doesn't
  // poison the idempotency entry.
  await admin.from("trial_reminders_sent").insert({
    stripe_subscription_id: input.stripeSubscriptionId,
    reminder_type: input.reminderType,
  });

  return { sent: true };
}

function renderHtml(p: {
  headline: string;
  lead: string;
  planName: string;
  cycleLabel: string;
  amountLabel: string;
  conversionDate: string;
  manageUrl: string;
  cancelUrl: string;
}): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
  <p style="color:#B8896B;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 12px;">OYRB · Trial reminder</p>
  <h1 style="font-size:22px;line-height:1.25;margin:0 0 12px;color:#0A0A0A;">${escapeHtml(p.headline)}</h1>
  <p style="color:#525252;font-size:14px;line-height:1.6;margin:0 0 20px;">${escapeHtml(p.lead)}</p>

  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #E7E5E4;border-radius:8px;background:#FAFAF9;margin:0 0 24px;">
    <tr><td style="padding:14px 16px;border-bottom:1px solid #F0EFEC;font-size:13px;">
      <span style="color:#737373;">Plan</span><br>
      <strong style="color:#0A0A0A;">${escapeHtml(p.planName)} · ${escapeHtml(p.cycleLabel)}</strong>
    </td></tr>
    <tr><td style="padding:14px 16px;border-bottom:1px solid #F0EFEC;font-size:13px;">
      <span style="color:#737373;">Charge on</span><br>
      <strong style="color:#0A0A0A;">${escapeHtml(p.conversionDate)}</strong>
    </td></tr>
    <tr><td style="padding:14px 16px;font-size:13px;">
      <span style="color:#737373;">Amount</span><br>
      <strong style="color:#0A0A0A;">${escapeHtml(p.amountLabel)}</strong>
    </td></tr>
  </table>

  <p style="margin:0 0 8px;">
    <a href="${escapeHtml(p.manageUrl)}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;">Manage subscription</a>
    <a href="${escapeHtml(p.cancelUrl)}" style="display:inline-block;margin-left:8px;color:#B8896B;text-decoration:underline;padding:10px 4px;font-size:13px;">Cancel before charge</a>
  </p>

  <p style="color:#A3A3A3;font-size:11px;line-height:1.5;margin:32px 0 0;border-top:1px solid #F0EFEC;padding-top:16px;">
    You're getting this because you started a free trial of OYRB. We send three of these total — at 7 days, 3 days, and 1 day before your trial ends — so there are no surprise charges.
  </p>
</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
