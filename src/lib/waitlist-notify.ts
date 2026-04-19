// Notify waitlist clients when a booking slot opens up.

import { createAdminClient } from "./supabase/server";
import { resend } from "./email";
import { sendSms, tierAllowsSms } from "./sms";

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";

type Biz = {
  business_name: string;
  slug: string;
  subscription_tier: string;
};

/**
 * When a booking is cancelled, find waitlist clients who wanted that
 * service (or any service on that business) and notify them that
 * a slot may have opened. Notifies the first N waitlisters, marks them.
 */
export async function notifyWaitlistOnCancellation(params: {
  businessId: string;
  serviceId: string | null;
  startAt: Date;
  maxNotify?: number;
}) {
  const { businessId, serviceId, startAt, maxNotify = 3 } = params;

  const supabase = createAdminClient();

  const { data: bizRaw } = await supabase
    .from("businesses")
    .select("business_name, slug, subscription_tier")
    .eq("id", businessId)
    .maybeSingle();
  if (!bizRaw) return { notified: 0 };
  const biz = bizRaw as Biz;

  // Find waitlisters in "waiting" status, matching this service (or any)
  let query = supabase
    .from("waitlist")
    .select("id, client_name, client_email, client_phone")
    .eq("business_id", businessId)
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(maxNotify);

  if (serviceId) {
    // Match waitlisters who wanted this specific service OR didn't specify one
    query = query.or(`service_id.eq.${serviceId},service_id.is.null`);
  }

  const { data: entries } = await query;
  if (!entries || entries.length === 0) return { notified: 0 };

  const siteUrl = `https://www.oyrb.space/s/${biz.slug}`;
  const whenLabel = startAt.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  let notified = 0;

  for (const entry of entries) {
    // Email
    if (entry.client_email && resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: entry.client_email,
          subject: `A spot just opened with ${biz.business_name} ✦`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
              <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 8px;">Spot opened ✦</p>
              <h1 style="font-size:24px;font-weight:600;margin:0 0 16px;">Quick — a time just opened up, ${entry.client_name}</h1>
              <p style="color:#525252;font-size:15px;line-height:1.5;margin:0 0 20px;">You asked to be on the waitlist for <strong>${biz.business_name}</strong>. A booking was just cancelled and the following slot is available:</p>
              <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:24px 0;">
                <p style="margin:0;font-size:16px;font-weight:600;">${whenLabel}</p>
              </div>
              <a href="${siteUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;">Book this spot now</a>
              <p style="color:#A3A3A3;font-size:12px;margin:24px 0 0;">First-come, first-served — spots go fast.</p>
            </div>
          `,
        });
      } catch (err) {
        console.error("Waitlist email failed:", err);
      }
    }

    // SMS — only if opt-in + tier allows
    if (
      entry.client_phone &&
      tierAllowsSms(biz.subscription_tier)
    ) {
      await sendSms({
        to: entry.client_phone,
        body: `${biz.business_name}: A spot just opened — ${whenLabel}. Book now: ${siteUrl}`,
      });
    }

    await supabase
      .from("waitlist")
      .update({ status: "notified", notified_at: new Date().toISOString() })
      .eq("id", entry.id);

    notified++;
  }

  return { notified };
}
