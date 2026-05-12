import { resend } from "@/lib/email";
import { getFromAddress, EmailPurpose } from "@/lib/email-from";

/**
 * Remove Brand transactional emails. All four use the ACCOUNT
 * EmailPurpose (account@oyrb.space).
 *
 *   sendRemovalInitiated         — receipt at initiation, carries the
 *                                  deletion date + a restore deep link
 *                                  (PR 4)
 *   sendRemovalRestored          — reassurance when the pro restores
 *                                  during the grace window (PR 4)
 *   sendRemovalFinalized         — final notice when the cron deletes
 *                                  the account at the end of grace.
 *                                  Sent BEFORE the DB rows go so the
 *                                  pro's email is still resolvable.
 *                                  After this fires, support@ is the
 *                                  only thing they can reach (PR 5)
 *   sendRemovalCancelledByAdmin  — pro-facing notice when an OYRB admin
 *                                  cancels their pending removal. Same
 *                                  shape as sendRemovalRestored with
 *                                  different framing (PR 5)
 *
 * Best-effort across all four. Failures log + swallow; the surrounding
 * state-change has already landed in the DB and shouldn't be rolled
 * back over an email delivery hiccup. For sendRemovalFinalized
 * specifically: by the time we'd be retrying email send, the deletion
 * is past the point of no return — we're 14 days into the grace window
 * and the pro had every chance to restore.
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

/**
 * Final notification sent the moment the cron decides this business
 * is finalizing — BEFORE any deletion runs. After this fires, every
 * trace of the account starts coming down: Storage objects, the
 * business row + every cascade, the Stripe subscription, eventually
 * the auth.users row (if this was the pro's last business). The pro
 * cannot reply via the dashboard at this point — only via the
 * support@ address called out in the body copy.
 */
export async function sendRemovalFinalized(params: {
  to: string;
  businessName: string;
  finalizedAt: Date;
}): Promise<void> {
  if (!resend) {
    console.warn("Resend not configured — skipping removal-finalized email");
    return;
  }
  const dateLabel = fmtDateLong(params.finalizedAt);

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.ACCOUNT),
      to: params.to,
      subject: `Your brand ${params.businessName} has been removed`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Removal complete</p>
          <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">${params.businessName} has been removed from OYRB.</h1>
          <p style="color:#525252;font-size:14px;line-height:1.5;margin:0 0 16px;">
            Your 14-day grace window ended on ${dateLabel}. As scheduled, your storefront, client list, bookings, services, photos, and account data have been deleted.
          </p>
          <p style="color:#525252;font-size:14px;line-height:1.5;margin:0 0 16px;">
            This is the final email about your OYRB account. Your Stripe subscription has been cancelled (no future charges); your Stripe Connect account, which you own, was not touched and remains accessible in dashboard.stripe.com if you used one.
          </p>
          <p style="color:#525252;font-size:14px;line-height:1.5;margin:0 0 20px;">
            Thank you for your time on the platform. If you'd like to come back, sign up fresh at <a href="${APP_URL}/signup" style="color:#0A0A0A;">${APP_URL.replace(/^https?:\/\//, "")}/signup</a> — it's a clean start.
          </p>
          <p style="color:#A3A3A3;font-size:12px;margin:0;">
            Believe this was sent in error? Reply to this address or email <a href="mailto:support@oyrb.space" style="color:#525252;">support@oyrb.space</a> as soon as possible. Deletion is irreversible, but we'll respond and help you understand what happened.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendRemovalFinalized failed:", err);
  }
}

/**
 * Pro-facing notice when an OYRB admin manually cancels a pending
 * removal. Same shape as sendRemovalRestored but framed as
 * support-initiated. Used by cancelRemovalAsAdmin.
 */
export async function sendRemovalCancelledByAdmin(params: {
  to: string;
  businessName: string;
}): Promise<void> {
  if (!resend) {
    console.warn("Resend not configured — skipping admin-cancellation email");
    return;
  }

  const dashboardUrl = `${APP_URL}/dashboard`;

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.ACCOUNT),
      to: params.to,
      subject: `Your removal was cancelled — ${params.businessName} is back`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Removal cancelled by support</p>
          <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">${params.businessName} is back.</h1>
          <p style="color:#525252;font-size:14px;line-height:1.5;margin:0 0 16px;">
            An OYRB admin cancelled the pending removal of your brand. Your storefront and directory tile are restored to their pre-removal visibility, your data is untouched, and your Stripe subscription continues normally.
          </p>
          <a href="${dashboardUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">Open dashboard</a>
          <p style="color:#A3A3A3;font-size:12px;margin:24px 0 0;">
            If you didn't request this cancellation, reply to this email or contact <a href="mailto:support@oyrb.space" style="color:#525252;">support@oyrb.space</a>.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendRemovalCancelledByAdmin failed:", err);
  }
}
