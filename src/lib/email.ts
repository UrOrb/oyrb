import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";

export async function sendBookingConfirmation(params: {
  to: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  startAt: Date;
  price: string;
  siteUrl: string;
}) {
  if (!resend) {
    console.warn("Resend not configured — skipping email");
    return;
  }

  const { to, customerName, businessName, serviceName, startAt, price, siteUrl } = params;
  const whenLabel = startAt.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

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
          <p style="color:#737373;font-size:14px;line-height:1.5;margin:0 0 20px;">Need to make a change? Reply to this email, or sign in to manage your bookings:</p>
          <div style="margin:0 0 24px;">
            <a href="${siteUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;margin-right:8px;">View site</a>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space"}/client-login" style="display:inline-block;border:1px solid #E7E5E4;color:#0A0A0A;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600;">My bookings</a>
          </div>
          <p style="color:#A3A3A3;font-size:12px;margin:32px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">Powered by OYRB — own your brand.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send booking confirmation", err);
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
