import { resend } from "@/lib/email";
import { getFromAddress, EmailPurpose } from "@/lib/email-from";

/**
 * Phase 8 PR 4 — Remove Brand transactional emails.
 *
 *   sendRemovalInitiated — receipt sent at initiation. Carries the
 *                          deletion date and a deep link back to the
 *                          Remove Brand page so the pro can one-click
 *                          restore even if they forget their dashboard
 *                          route.
 *   sendRemovalRestored  — reassurance sent at restore. "Everything is
 *                          exactly where you left it."
 *
 * Both use the ACCOUNT EmailPurpose (account@oyrb.space), matching
 * the existing lifecycle-email convention (mig-034 billing failure
 * emails, mig-053 consent affirmation receipts).
 *
 * Best-effort. Failures log + swallow; the surrounding state-change
 * has already landed in the DB and shouldn't be rolled back over
 * an email delivery hiccup.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

function fmtDateLong(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function sendRemovalInitiated(params: {
  to: string;
  businessName: string;
  scheduledFor: Date;
}): Promise<void> {
  if (!resend) {
    console.warn("Resend not configured — skipping removal-initiated email");
    return;
  }
  const dateLabel = fmtDateLong(params.scheduledFor);
  const restoreUrl = `${APP_URL}/dashboard/settings/remove-brand`;

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.ACCOUNT),
      to: params.to,
      subject: `Brand removal scheduled — ${dateLabel}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Brand removal</p>
          <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">Your brand removal is scheduled for ${dateLabel}.</h1>
          <p style="color:#525252;font-size:14px;line-height:1.5;margin:0 0 16px;">
            You've started a 14-day removal window for <strong>${params.businessName}</strong>. Your storefront is already down. Your account itself stays usable until ${dateLabel}, when everything deletes permanently.
          </p>
          <div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 6px;color:#78350F;font-size:13px;font-weight:600;">Changed your mind?</p>
            <p style="margin:0 0 12px;color:#78350F;font-size:13px;line-height:1.5;">
              You can restore your brand at any point during the 14 days. Restore puts everything back exactly where it was — same storefront, same directory tile (if you had one), same subscription state.
            </p>
            <a href="${restoreUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">Restore now</a>
          </div>
          <p style="color:#737373;font-size:13px;line-height:1.6;margin:0 0 16px;">
            During the next 14 days you can still log into your dashboard, fulfill existing booked appointments, and see your data. Booking reminders for those existing appointments will continue to send normally.
          </p>
          <p style="color:#737373;font-size:13px;line-height:1.6;margin:0 0 8px;">
            Your Stripe subscription has been set to cancel at the end of your current billing period — no prorated refund; you keep the time you paid for.
          </p>
          <p style="color:#A3A3A3;font-size:12px;margin:20px 0 0;">
            If you didn't start this removal, restore it now and email <a href="mailto:support@oyrb.space" style="color:#525252;">support@oyrb.space</a>.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendRemovalInitiated failed:", err);
  }
}

export async function sendRemovalRestored(params: {
  to: string;
  businessName: string;
}): Promise<void> {
  if (!resend) {
    console.warn("Resend not configured — skipping removal-restored email");
    return;
  }

  const dashboardUrl = `${APP_URL}/dashboard`;

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.ACCOUNT),
      to: params.to,
      subject: `Welcome back — ${params.businessName} is restored`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Brand restored</p>
          <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">Welcome back.</h1>
          <p style="color:#525252;font-size:14px;line-height:1.5;margin:0 0 16px;">
            Your brand <strong>${params.businessName}</strong> is restored. Everything is exactly where you left it — your storefront and directory tile are back to the visibility they had before, your data is untouched, and your Stripe subscription continues normally.
          </p>
          <a href="${dashboardUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">Open dashboard</a>
          <p style="color:#A3A3A3;font-size:12px;margin:24px 0 0;">
            If you didn't restore this brand, contact <a href="mailto:support@oyrb.space" style="color:#525252;">support@oyrb.space</a>.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendRemovalRestored failed:", err);
  }
}
