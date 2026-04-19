import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resend } from "@/lib/email";
import { sendSms, tierAllowsSms } from "@/lib/sms";

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";

/**
 * Runs via Vercel Cron (see vercel.json). Sends 24h reminders for
 * confirmed bookings starting in the next 22–26 hour window.
 *
 * Email: sent to all clients (every tier).
 * SMS:   sent to clients with sms_consent=true, only when the pro is on Studio/Scale.
 */
export async function GET(request: NextRequest) {
  // Protect the endpoint — Vercel Cron sends an auth header,
  // or allow manual triggering via CRON_SECRET.
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  // Daily cron runs once at 9am UTC. Wide 18–36h window catches all bookings
  // happening within "tomorrow" range. reminder_sent_at prevents duplicates.
  const windowStart = new Date(now.getTime() + 18 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id, start_at, end_at, reminder_sent_at, sms_reminder_sent_at,
      business_id,
      services(name, price_cents),
      clients(name, email, phone, sms_consent),
      businesses(business_name, slug, phone, subscription_tier)
    `)
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gte("start_at", windowStart.toISOString())
    .lte("start_at", windowEnd.toISOString());

  if (error) {
    console.error("Reminder fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: {
    id: string;
    emailed: boolean;
    texted: boolean;
    reason?: string;
  }[] = [];

  for (const b of bookings ?? []) {
    const booking = b as unknown as {
      id: string;
      start_at: string;
      business_id: string;
      services: { name: string; price_cents: number } | null;
      clients: {
        name: string;
        email: string | null;
        phone: string | null;
        sms_consent: boolean;
      } | null;
      businesses: {
        business_name: string;
        slug: string;
        phone: string | null;
        subscription_tier: string;
      } | null;
    };

    const client = booking.clients;
    const biz = booking.businesses;
    const svc = booking.services;
    if (!client || !biz || !svc) continue;

    const whenLabel = new Date(booking.start_at).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    let emailed = false;
    let texted = false;

    // Email reminder — every tier
    if (client.email && resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: client.email,
          subject: `Reminder: ${svc.name} tomorrow with ${biz.business_name}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
              <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 8px;">Reminder</p>
              <h1 style="font-size:24px;font-weight:600;margin:0 0 16px;">See you tomorrow, ${client.name}!</h1>
              <p style="color:#525252;font-size:15px;line-height:1.5;margin:0 0 24px;">Just a heads-up about your appointment with <strong>${biz.business_name}</strong>.</p>
              <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:24px 0;">
                <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Service</p>
                <p style="margin:0 0 16px;font-size:15px;font-weight:600;">${svc.name}</p>
                <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">When</p>
                <p style="margin:0;font-size:15px;font-weight:600;">${whenLabel}</p>
              </div>
              <p style="color:#525252;font-size:14px;margin:0 0 20px;line-height:1.6;">Need to make a change? Click below to reschedule or cancel — no need to email.</p>
              <div style="margin:0 0 28px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space"}/s/${biz.slug}?reschedule=${booking.id}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600;margin-right:8px;">Reschedule</a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space"}/s/${biz.slug}" style="display:inline-block;border:1px solid #E7E5E4;color:#0A0A0A;text-decoration:none;padding:11px 22px;border-radius:999px;font-size:14px;font-weight:600;">View site</a>
              </div>
              <p style="color:#A3A3A3;font-size:12px;margin:0;border-top:1px solid #E7E5E4;padding-top:16px;">Running late or have questions? Reply to this email or text ${biz.phone ?? biz.business_name}.</p>
            </div>
          `,
        });
        emailed = true;
      } catch (err) {
        console.error("Email reminder failed:", err);
      }
    }

    // SMS reminder — Studio/Scale tiers only, client must have opted in
    if (
      client.phone &&
      client.sms_consent &&
      tierAllowsSms(biz.subscription_tier)
    ) {
      const smsBody = `${biz.business_name}: Reminder — ${svc.name} tomorrow at ${whenLabel}. Reply to this text to reschedule.`;
      const r = await sendSms({ to: client.phone, body: smsBody });
      if (r.ok) texted = true;
    }

    // Mark reminder_sent_at so we don't double-send
    if (emailed || texted) {
      await supabase
        .from("bookings")
        .update({
          reminder_sent_at: new Date().toISOString(),
          ...(texted ? { sms_reminder_sent_at: new Date().toISOString() } : {}),
        })
        .eq("id", booking.id);
    }

    results.push({ id: booking.id, emailed, texted });
  }

  // ── Review request emails ─────────────────────────────────────────────
  // Send "how was your visit?" emails 24–48h after appointments completed
  const reviewWindowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const reviewWindowEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data: completedBookings } = await supabase
    .from("bookings")
    .select(`
      id, end_at, review_request_sent_at, business_id,
      services(name),
      clients(name, email),
      businesses(business_name, slug)
    `)
    .eq("status", "confirmed")
    .is("review_request_sent_at", null)
    .gte("end_at", reviewWindowStart.toISOString())
    .lte("end_at", reviewWindowEnd.toISOString());

  let reviewEmailsSent = 0;
  for (const b of (completedBookings ?? []) as Array<{
    id: string;
    business_id: string;
    services: { name: string } | null;
    clients: { name: string; email: string | null } | null;
    businesses: { business_name: string; slug: string } | null;
  }>) {
    if (!b.clients?.email || !b.businesses || !b.services || !resend) continue;
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: b.clients.email,
        subject: `How was your ${b.services.name} with ${b.businesses.business_name}?`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
            <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Share your experience</p>
            <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">Hi ${b.clients.name}!</h1>
            <p style="color:#525252;font-size:15px;line-height:1.5;margin:0 0 16px;">Thanks for visiting <strong>${b.businesses.business_name}</strong>. We'd love to hear how it went — your review helps other clients find great pros.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space"}/s/${b.businesses.slug}/review/${b.id}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:600;margin:16px 0;">Leave a review</a>
            <p style="color:#A3A3A3;font-size:12px;margin:24px 0 0;">Takes about 30 seconds. You&apos;ll be shown by first name only.</p>
          </div>
        `,
      });
      await supabase
        .from("bookings")
        .update({ review_request_sent_at: new Date().toISOString() })
        .eq("id", b.id);
      reviewEmailsSent++;
    } catch (err) {
      console.error("Review request email failed:", err);
    }
  }

  return NextResponse.json({
    processed: results.length,
    emailed: results.filter((r) => r.emailed).length,
    texted: results.filter((r) => r.texted).length,
    reviewEmailsSent,
    results,
  });
}
