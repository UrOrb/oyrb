import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";

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
}) {
  if (!resend) {
    console.warn("Resend not configured — skipping email");
    return;
  }

  const { to, customerName, businessName, serviceName, startAt, price, siteUrl, bookingToken, history, preferencesToken } = params;
  const whenLabel = startAt.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const viewBookingUrl = bookingToken ? `${APP_URL}/booking/${bookingToken}` : null;
  const prefsUrl = preferencesToken ? `${APP_URL}/preferences/${preferencesToken}` : null;

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
      from: FROM,
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
      from: FROM,
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
      from: FROM,
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
      from: FROM,
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
      from: FROM,
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
