import { Resend } from "resend";
import { getFromAddress, EmailPurpose, DEFAULT_REPLY_TO } from "@/lib/email-from";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

export type HistoryItem = {
  token: string;        // magic link token for that booking
  serviceName: string;
  startAt: Date;
};

export async function sendBookingConfirmation(params: {
  to: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  startAt: Date;
  price: string;
  siteUrl: string;
  bookingToken?: string;        // new: magic link token for this booking
  history?: HistoryItem[];      // new: up to 3 prior bookings with this pro
  preferencesToken?: string;    // new: manage-preferences token
  /** Pass the Torch (Phase 1E). When set, the email gets the Layer-2
   *  disclosure block crediting the referring pro and clarifying that
   *  OYRB / the referrer aren't liable for services the destination
   *  pro provides. */
  referrerName?: string | null;
}) {
  if (!resend) {
    console.warn("Resend not configured — skipping email");
    return;
  }

  const { to, customerName, businessName, serviceName, startAt, price, siteUrl, bookingToken, history, preferencesToken, referrerName } = params;
  const whenLabel = startAt.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const viewBookingUrl = bookingToken ? `${APP_URL}/booking/${bookingToken}` : null;
  const prefsUrl = preferencesToken ? `${APP_URL}/preferences/${preferencesToken}` : null;

  // Pass the Torch — Layer-2 disclosure block. Renders only when this
  // booking originated from a referral context (?ref= URL or the inline
  // Pro Referrals widget). Spec-locked copy, do not edit lightly.
  const referralDisclosure = referrerName
    ? `
        <div style="margin:20px 0;padding:14px 16px;border-radius:12px;background:#FFF7ED;border:1px solid #FDBA74;color:#7C2D12;font-size:13px;line-height:1.5;">
          <strong style="color:#7C2D12;">💛 Recommended by ${referrerName}.</strong>
          ${businessName} is an independent professional. Your booking is
          directly with ${businessName} — ${referrerName} and OYRB are not
          responsible for services provided.
        </div>
      `
    : "";

  const historyBlock = history && history.length > 0
    ? `
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #E7E5E4;">
          <p style="color:#737373;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">Your booking history with ${businessName}</p>
          ${history.map((h) => `
            <p style="margin:0 0 6px;font-size:13px;color:#525252;">
              <a href="${APP_URL}/booking/${h.token}" style="color:#0A0A0A;text-decoration:none;">
                ${h.serviceName} · ${h.startAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </a>
            </p>
          `).join("")}
          <p style="margin:12px 0 0;font-size:11px;color:#A3A3A3;">Want to save your info long-term? Create a free OYRB client account. <em>(Coming soon.)</em></p>
        </div>
      `
    : "";

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.BOOKING),
      replyTo: DEFAULT_REPLY_TO,
      to,
      subject: `Booking confirmed with ${businessName}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 8px;">Booking confirmed ✦</p>
          <h1 style="font-size:26px;font-weight:600;margin:0 0 16px;line-height:1.2;">Thanks, ${customerName}!</h1>
          <p style="color:#525252;font-size:15px;line-height:1.5;margin:0 0 24px;">Your appointment with <strong>${businessName}</strong> is locked in.</p>
          <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:24px 0;">
            <p style="color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Service</p>
            <p style="font-size:15px;font-weight:600;margin:0 0 16px;">${serviceName}</p>
            <p style="color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">When</p>
            <p style="font-size:15px;font-weight:600;margin:0 0 16px;">${whenLabel}</p>
            <p style="color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Price</p>
            <p style="font-size:15px;font-weight:600;margin:0;">${price}</p>
          </div>
          ${referralDisclosure}
          ${viewBookingUrl ? `
          <p style="color:#737373;font-size:14px;line-height:1.5;margin:0 0 20px;">View your booking, add it to your calendar, or reschedule anytime:</p>
          <div style="margin:0 0 16px;">
            <a href="${viewBookingUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;margin-right:8px;margin-bottom:8px;">View my booking</a>
            <a href="${viewBookingUrl}/reschedule" style="display:inline-block;border:1px solid #E7E5E4;color:#0A0A0A;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:600;margin-right:8px;margin-bottom:8px;">Reschedule</a>
            ${process.env.PAY_NOW_ENABLED === "true" ? `
              <a href="${viewBookingUrl}/pay" style="display:inline-block;border:1px solid #E7E5E4;color:#0A0A0A;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:600;margin-right:8px;margin-bottom:8px;">Pay for your service now</a>
            ` : ""}
            <a href="${siteUrl}" style="display:inline-block;border:1px solid #E7E5E4;color:#0A0A0A;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:600;">Pro&apos;s site</a>
          </div>
          <p style="color:#A3A3A3;font-size:11px;line-height:1.5;margin:0 0 16px;">This secure link expires in 7 days. Don&apos;t share it. Rescheduling is available up to 24 hours before your appointment.</p>
          ` : `
          <p style="color:#737373;font-size:14px;line-height:1.5;margin:0 0 20px;">Need to make a change? Reply to this email.</p>
          <div style="margin:0 0 24px;">
            <a href="${siteUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;margin-right:8px;">View site</a>
          </div>
          `}
          ${historyBlock}
          <p style="color:#A3A3A3;font-size:12px;margin:32px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">
            Powered by OYRB — own your brand.
            ${prefsUrl ? ` · <a href="${prefsUrl}" style="color:#A3A3A3;">Manage my communication preferences</a>` : ""}
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send booking confirmation", err);
  }
}

export async function sendPaymentReceived(params: {
  to: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  startAt: Date;
  paidAmountCents: number;
  priceCents: number;
  depositWasPaid: boolean;
  token: string;
}) {
  if (!resend) return;
  const {
    to,
    customerName,
    businessName,
    serviceName,
    startAt,
    paidAmountCents,
    priceCents,
    depositWasPaid,
    token,
  } = params;
  const whenLabel = startAt.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const fmt = (c: number) => `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;
  const summary = depositWasPaid
    ? `Balance of ${fmt(paidAmountCents)} received. Service total was ${fmt(priceCents)} (deposit already on file).`
    : `Paid ${fmt(paidAmountCents)} in full. No balance due at your appointment.`;

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.PAYMENT),
      replyTo: DEFAULT_REPLY_TO,
      to,
      subject: `Payment received — ${serviceName} with ${businessName}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#047857;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Payment received ✓</p>
          <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">Thanks, ${customerName}!</h1>
          <p style="color:#525252;font-size:15px;line-height:1.5;margin:0 0 16px;">${summary}</p>
          <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Service</p>
            <p style="margin:0 0 14px;font-size:15px;font-weight:600;">${serviceName}</p>
            <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">When</p>
            <p style="margin:0 0 14px;font-size:15px;font-weight:600;">${whenLabel}</p>
            <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Amount paid</p>
            <p style="margin:0;font-size:18px;font-weight:600;color:#047857;">${fmt(paidAmountCents)}</p>
          </div>
          <a href="${APP_URL}/booking/${token}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">View my booking</a>
          <p style="color:#A3A3A3;font-size:11px;margin:24px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">
            Charged by Stripe on behalf of ${businessName}. Keep this email as your receipt. For refunds or questions contact ${businessName} directly.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send payment-received email", err);
  }
}

export async function sendBookingCancellation(params: {
  to: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  startAt: Date;
  cancelledBy: "pro" | "client";
  reason?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  siteUrl: string;
}) {
  if (!resend) return;
  const { to, customerName, businessName, serviceName, startAt, cancelledBy, reason, contactEmail, contactPhone, siteUrl } = params;
  const whenLabel = startAt.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const byLine =
    cancelledBy === "pro"
      ? `${businessName} cancelled your upcoming appointment.`
      : `Your appointment has been cancelled.`;
  const contactBlock = cancelledBy === "pro" && (contactEmail || contactPhone)
    ? `
        <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 6px;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Contact ${businessName}</p>
          ${contactPhone ? `<p style="margin:0 0 2px;font-size:14px;"><a href="tel:${contactPhone}" style="color:#0A0A0A;text-decoration:none;">📞 ${contactPhone}</a></p>` : ""}
          ${contactEmail ? `<p style="margin:0;font-size:14px;"><a href="mailto:${contactEmail}" style="color:#0A0A0A;text-decoration:none;">✉️ ${contactEmail}</a></p>` : ""}
        </div>`
    : "";

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.BOOKING),
      replyTo: DEFAULT_REPLY_TO,
      to,
      subject: `Cancelled: ${serviceName} with ${businessName}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Booking cancelled</p>
          <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">Hi ${customerName},</h1>
          <p style="color:#525252;font-size:15px;line-height:1.5;margin:0 0 16px;">${byLine}</p>
          <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Service</p>
            <p style="margin:0 0 14px;font-size:15px;font-weight:600;">${serviceName}</p>
            <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">When</p>
            <p style="margin:0;font-size:15px;font-weight:600;text-decoration:line-through;color:#A3A3A3;">${whenLabel}</p>
          </div>
          ${reason ? `<p style="color:#525252;font-size:13px;margin:0 0 16px;"><strong>Note from ${businessName}:</strong> ${reason}</p>` : ""}
          ${contactBlock}
          <a href="${siteUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">Book a new time</a>
          <p style="color:#A3A3A3;font-size:11px;margin:24px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">If a deposit was charged, ${businessName} will handle any refund separately.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send cancellation email", err);
  }
}

export async function sendRebookReminder(params: {
  to: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  daysSince: number;
  siteUrl: string;
  preferencesToken: string;
}) {
  if (!resend) return;
  const { to, customerName, businessName, serviceName, daysSince, siteUrl, preferencesToken } = params;
  const prefsUrl = `${APP_URL}/preferences/${preferencesToken}`;
  const unsubOneClick = `${APP_URL}/api/public/preferences/unsubscribe?token=${encodeURIComponent(preferencesToken)}&scope=rebook`;

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.BOOKING),
      replyTo: DEFAULT_REPLY_TO,
      to,
      subject: `Time to rebook with ${businessName}?`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Time for a refresh</p>
          <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">Hey ${customerName} —</h1>
          <p style="color:#525252;font-size:15px;line-height:1.5;margin:0 0 16px;">
            It&apos;s been ${daysSince} days since your last ${serviceName} with <strong>${businessName}</strong>. Ready to rebook?
          </p>
          <a href="${siteUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:600;margin:16px 0;">Rebook with ${businessName}</a>
          <p style="color:#A3A3A3;font-size:11px;margin:32px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">
            <a href="${unsubOneClick}" style="color:#A3A3A3;">Unsubscribe from rebook reminders</a> ·
            <a href="${prefsUrl}" style="color:#A3A3A3;">Manage preferences</a>
          </p>
        </div>
      `,
      headers: {
        "List-Unsubscribe": `<${unsubOneClick}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } catch (err) {
    console.error("Failed to send rebook reminder", err);
  }
}

export async function sendOwnerNotification(params: {
  to: string;
  businessName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  startAt: Date;
  price: string;
  notes?: string | null;
  dashboardUrl: string;
}) {
  if (!resend) return;

  const { to, businessName, customerName, customerEmail, customerPhone, serviceName, startAt, price, notes, dashboardUrl } = params;
  const whenLabel = startAt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.BOOKING),
      to,
      subject: `New booking: ${customerName} — ${serviceName}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 8px;">New booking ✦</p>
          <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">${serviceName}</h1>
          <p style="color:#525252;font-size:15px;margin:0 0 24px;">${whenLabel} · ${price}</p>
          <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;">
            <p style="margin:0 0 4px;"><strong>${customerName}</strong></p>
            <p style="margin:0 0 4px;color:#525252;font-size:14px;">${customerEmail}</p>
            ${customerPhone ? `<p style="margin:0;color:#525252;font-size:14px;">${customerPhone}</p>` : ""}
            ${notes ? `<p style="margin:12px 0 0;padding-top:12px;border-top:1px solid #E7E5E4;color:#525252;font-size:13px;">${notes}</p>` : ""}
          </div>
          <a href="${dashboardUrl}" style="display:inline-block;margin-top:20px;background:#0A0A0A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">View in dashboard</a>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send owner notification", err);
  }
}

// ── Pass the Torch (Trusted Pros) ─────────────────────────────────────────
// Three transactional emails covering the request → accept → invite
// fan-out. All three use EmailPurpose.BOOKING (hello@) per
// src/lib/email-from.ts and reuse the existing OYRB email styling.

const TRUSTED_PROS_DASHBOARD_URL = `${APP_URL}/dashboard/pass-the-torch`;

/**
 * Sent to the receiving pro when another OYRB pro requests to add
 * them to their Trusted Pros list (requestReferral).
 */
export async function sendReferralRequestEmail(
  toEmail: string,
  requestingBusinessName: string,
  vouchNote: string | null,
) {
  if (!resend) {
    console.warn("Resend not configured — skipping referral request email");
    return;
  }
  if (!toEmail) return;

  const noteBlock = vouchNote
    ? `
        <div style="margin:20px 0;padding:14px 16px;border-radius:12px;background:#FAFAF9;border:1px solid #E7E5E4;">
          <p style="margin:0;font-size:13px;color:#737373;text-transform:uppercase;letter-spacing:0.05em;">Their note</p>
          <p style="margin:6px 0 0;font-size:14px;font-style:italic;color:#0A0A0A;line-height:1.5;">&ldquo;${vouchNote}&rdquo;</p>
        </div>
      `
    : "";

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.BOOKING),
      replyTo: DEFAULT_REPLY_TO,
      to: toEmail,
      subject: `[OYRB] ${requestingBusinessName} wants to add you to her Trusted Pros`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 8px;">Pass the Torch ✦</p>
          <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;line-height:1.3;">${requestingBusinessName} wants to vouch for you.</h1>
          <p style="color:#525252;font-size:15px;line-height:1.55;margin:0 0 16px;">
            On OYRB, pros build a small list of peers they trust. When ${requestingBusinessName} is fully booked or away, her clients see the pros she vouches for — and she&apos;d like you to be one of them.
          </p>
          ${noteBlock}
          <p style="color:#525252;font-size:14px;line-height:1.55;margin:0 0 20px;">
            Accept and your business will appear on her storefront when she&apos;s unavailable. Clients book directly with you — ${requestingBusinessName} takes nothing, OYRB takes nothing.
          </p>
          <a href="${TRUSTED_PROS_DASHBOARD_URL}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">Review in your dashboard</a>
          <p style="color:#A3A3A3;font-size:11px;line-height:1.5;margin:28px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">
            You can decline at any time from your Trusted Pros dashboard. Powered by OYRB — own your brand.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send referral request email", err);
  }
}

/**
 * Sent to the original requester when the receiving pro accepts the
 * referral (acceptReferral and tryAcceptPendingInvite).
 */
export async function sendReferralAcceptedEmail(
  toEmail: string,
  acceptingBusinessName: string,
) {
  if (!resend) {
    console.warn("Resend not configured — skipping referral accepted email");
    return;
  }
  if (!toEmail) return;

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.BOOKING),
      replyTo: DEFAULT_REPLY_TO,
      to: toEmail,
      subject: `[OYRB] ${acceptingBusinessName} accepted your Trusted Pros request`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#047857;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 8px;">Accepted ✓</p>
          <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;line-height:1.3;">${acceptingBusinessName} accepted your invitation.</h1>
          <p style="color:#525252;font-size:15px;line-height:1.55;margin:0 0 20px;">
            ${acceptingBusinessName} now appears on your storefront when you&apos;re fully booked or away — exactly when your clients need a great alternative.
          </p>
          <a href="${TRUSTED_PROS_DASHBOARD_URL}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">Open Trusted Pros</a>
          <p style="color:#A3A3A3;font-size:11px;line-height:1.5;margin:28px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">
            Drag to reorder, edit your vouch note, or remove anytime. Powered by OYRB — own your brand.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send referral accepted email", err);
  }
}

/**
 * Sent to a non-OYRB pro who's been invited via inviteByEmail. Lands
 * them on the personalized /invite/[token] landing page.
 */
export async function sendReferralInviteEmail(
  toEmail: string,
  requestingBusinessName: string,
  vouchNote: string | null,
  token: string,
) {
  if (!resend) {
    console.warn("Resend not configured — skipping referral invite email");
    return;
  }
  if (!toEmail || !token) return;

  const inviteUrl = `${APP_URL}/invite/${token}`;
  const noteBlock = vouchNote
    ? `
        <div style="margin:20px 0;padding:14px 16px;border-radius:12px;background:#FFF7ED;border:1px solid #FDBA74;">
          <p style="margin:0;font-size:13px;color:#7C2D12;text-transform:uppercase;letter-spacing:0.05em;">${requestingBusinessName} says</p>
          <p style="margin:6px 0 0;font-size:14px;font-style:italic;color:#7C2D12;line-height:1.5;">&ldquo;${vouchNote}&rdquo;</p>
        </div>
      `
    : "";

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.BOOKING),
      replyTo: DEFAULT_REPLY_TO,
      to: toEmail,
      subject: `[OYRB] You've been personally invited to OYRB`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 8px;">You&apos;ve been personally invited ✦</p>
          <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;line-height:1.3;">${requestingBusinessName} wants you on her Trusted Pros.</h1>
          <p style="color:#525252;font-size:15px;line-height:1.55;margin:0 0 16px;">
            OYRB is the booking site beauty pros build for themselves. ${requestingBusinessName} is asking you to join — and to be one of the pros she vouches for when she&apos;s booked or away.
          </p>
          ${noteBlock}
          <p style="color:#525252;font-size:14px;line-height:1.55;margin:0 0 24px;">
            Accept and your business will appear on her storefront when she&apos;s unavailable. Clients book directly with you — ${requestingBusinessName} takes nothing, OYRB takes nothing.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:600;">Accept your invitation</a>
          <p style="color:#A3A3A3;font-size:12px;line-height:1.5;margin:24px 0 0;">
            Or copy this link into your browser: <a href="${inviteUrl}" style="color:#737373;">${inviteUrl}</a>
          </p>
          <p style="color:#A3A3A3;font-size:11px;line-height:1.5;margin:24px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">
            This invitation expires in 30 days. Powered by OYRB — own your brand.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send referral invite email", err);
  }
}

// ── Subscription billing lifecycle (Phase 1.2) ──────────────────────────
//
// Three reminders that escalate when a pro's recurring charge fails:
//   1. T-3 pre-billing reminder (only for status='active'; trialing pros
//      already get a separate ladder via sendTrialReminder).
//   2. T+0 payment-failed (fired from the Stripe webhook — gives the pro
//      ~2 days to update their card before the storefront unpublishes).
//   3. T+1 grace-expiring (fired by the daily cron the day before the
//      grace window ends).
//
// All three land at billing@oyrb.space (EmailPurpose.PAYMENT) and CTA to
// /dashboard/billing-pending so the pro hits a single page with the live
// status + the "Update payment method" button. Linking directly to
// /api/stripe/portal from email would 401 unauthenticated clicks; the
// dashboard page handles the auth flow gracefully and lands the user in
// the same place after login.

const fmtCents = (c: number) => `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;

const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

const fmtDayTime = (d: Date) =>
  d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function billingFooter(): string {
  return `
    <p style="color:#A3A3A3;font-size:11px;line-height:1.5;margin:24px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">
      Need help? Reply to this email or write to <a href="mailto:support@oyrb.space" style="color:#737373;">support@oyrb.space</a>.
      You&apos;re receiving this because your OYRB subscription requires attention.
    </p>
  `;
}

export async function sendPreBillingReminder(params: {
  to: string;
  /** Optional — cron path doesn't have the upcoming invoice in hand and
   *  reading it from Stripe per-subscription would burn API quota. When
   *  omitted the email reads "the card on file will be charged" without
   *  a dollar figure. */
  amountCents?: number | null;
  chargeAt: Date;
  tier: string;
}) {
  if (!resend) return;
  const { to, amountCents, chargeAt, tier } = params;
  const billingPendingUrl = `${APP_URL}/dashboard/billing-pending`;
  const portalUrl = `${APP_URL}/api/stripe/portal`;
  const amountSentence =
    amountCents != null && amountCents > 0
      ? `We&apos;ll charge ${fmtCents(amountCents)} to the card on file.`
      : `The card on file will be charged automatically.`;

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.PAYMENT),
      replyTo: DEFAULT_REPLY_TO,
      to,
      subject: `Heads-up — your OYRB ${tier} renews ${fmtDay(chargeAt)}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#737373;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Upcoming charge</p>
          <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">A friendly heads-up.</h1>
          <p style="color:#525252;font-size:15px;line-height:1.55;margin:0 0 16px;">
            Your OYRB ${tier} subscription renews on ${fmtDay(chargeAt)}. ${amountSentence}
          </p>
          <p style="color:#525252;font-size:15px;line-height:1.55;margin:0 0 20px;">
            If your card is current, no action needed — this is just a heads-up. If you need to update it, do that anytime before the renewal:
          </p>
          <a href="${portalUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">Update payment method</a>
          <p style="color:#A3A3A3;font-size:12px;margin:18px 0 0;">
            Or check your billing status anytime at <a href="${billingPendingUrl}" style="color:#737373;">${billingPendingUrl.replace(/^https?:\/\//, "")}</a>.
          </p>
          ${billingFooter()}
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send pre-billing reminder", err);
  }
}

export async function sendPaymentFailed(params: {
  to: string;
  amountCents: number;
  attemptedAt: Date;
  graceEndsAt: Date;
  tier: string;
}) {
  if (!resend) return;
  const { to, amountCents, attemptedAt, graceEndsAt, tier } = params;
  const billingPendingUrl = `${APP_URL}/dashboard/billing-pending`;

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.PAYMENT),
      replyTo: DEFAULT_REPLY_TO,
      to,
      subject: `Payment didn&apos;t go through — please update your card`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B45309;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Payment failed</p>
          <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">Your card was declined.</h1>
          <p style="color:#525252;font-size:15px;line-height:1.55;margin:0 0 16px;">
            We tried to charge ${fmtCents(amountCents)} for your OYRB ${tier} subscription on ${fmtDay(attemptedAt)} and the card was declined.
          </p>
          <div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:12px;padding:16px 18px;margin:20px 0;">
            <p style="margin:0 0 6px;color:#78350F;font-size:13px;font-weight:600;">Your storefront is still live.</p>
            <p style="margin:0;color:#78350F;font-size:13px;line-height:1.5;">
              You have until <strong>${fmtDayTime(graceEndsAt)}</strong> to update your payment method. After that, your booking site will be unpublished until billing is current. Your data is safe either way — nothing gets deleted.
            </p>
          </div>
          <a href="${billingPendingUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">Update payment method</a>
          ${billingFooter()}
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send payment-failed email", err);
  }
}

export async function sendGraceExpiring(params: {
  to: string;
  /** Optional — cron doesn't load the original failed invoice. Email reads
   *  "your card was declined" without an amount when omitted. */
  amountCents?: number | null;
  graceEndsAt: Date;
  tier: string;
}) {
  if (!resend) return;
  const { to, amountCents, graceEndsAt, tier } = params;
  const billingPendingUrl = `${APP_URL}/dashboard/billing-pending`;
  const amountSentence =
    amountCents != null && amountCents > 0
      ? `We tried to charge ${fmtCents(amountCents)} and the card was declined.`
      : `Your card was declined.`;

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.PAYMENT),
      replyTo: DEFAULT_REPLY_TO,
      to,
      subject: `Last day — your OYRB site will be unpublished tomorrow`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B91C1C;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Final notice</p>
          <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">Your storefront unpublishes ${fmtDay(graceEndsAt)}.</h1>
          <p style="color:#525252;font-size:15px;line-height:1.55;margin:0 0 16px;">
            Your OYRB ${tier} subscription is still past due. ${amountSentence} Your grace window ends ${fmtDayTime(graceEndsAt)}.
          </p>
          <div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:12px;padding:16px 18px;margin:20px 0;">
            <p style="margin:0;color:#7F1D1D;font-size:13px;line-height:1.5;">
              After that, your booking site at oyrb.space will be unpublished and clients won&apos;t be able to book new appointments. Existing bookings are preserved. Update your card any time and your storefront re-publishes automatically — nothing manual to do.
            </p>
          </div>
          <a href="${billingPendingUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">Update payment method now</a>
          ${billingFooter()}
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send grace-expiring email", err);
  }
}
