import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendRebookReminder } from "@/lib/email";
import { issueBookingToken } from "@/lib/booking-tokens";
import { canSendRebookReminder } from "@/lib/comm-preferences";
import { defaultIntervalFor } from "@/lib/rebook-intervals";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

/**
 * Daily cron: scan confirmed bookings where end_at is N days old (N per
 * service category) and no rebook_reminder_sent_at yet. Email the client,
 * include a one-click unsubscribe. Honor communication_preferences.
 *
 * Scales by category-day — we fetch a 45-day backlog and let per-booking
 * interval logic decide which to email today. 45 covers longest interval
 * (braids = 56) with a 14-day grace window on either side.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // Only care about bookings whose end_at was at least 7 days ago (no point
  // chasing same-week rebooks) and at most 90 days ago (after that, stale).
  const lookbackStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const lookbackEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id, end_at, rebook_reminder_sent_at, business_id,
      services(name),
      clients(name, email),
      businesses(business_name, slug, service_category, owner_id)
    `)
    .eq("status", "confirmed")
    .is("rebook_reminder_sent_at", null)
    .gte("end_at", lookbackStart.toISOString())
    .lte("end_at", lookbackEnd.toISOString())
    .limit(500);

  if (error) {
    console.error("Rebook cron fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Preload any pro overrides so we don't N+1 on per-pro interval lookups.
  const proIds = Array.from(
    new Set(
      (bookings ?? [])
        .map((b: unknown) => (b as { businesses: { owner_id: string } | null }).businesses?.owner_id)
        .filter((x: string | undefined): x is string => !!x)
    )
  );
  const overridesByPro = new Map<string, Map<string, number>>();
  if (proIds.length > 0) {
    const { data: overrides } = await supabase
      .from("pro_rebook_intervals")
      .select("pro_user_id, service_category, interval_days")
      .in("pro_user_id", proIds);
    for (const r of (overrides ?? []) as Array<{ pro_user_id: string; service_category: string; interval_days: number }>) {
      let m = overridesByPro.get(r.pro_user_id);
      if (!m) {
        m = new Map();
        overridesByPro.set(r.pro_user_id, m);
      }
      m.set(r.service_category, r.interval_days);
    }
  }

  const results: Array<{ id: string; sent: boolean; reason?: string }> = [];

  for (const b of (bookings ?? []) as Array<{
    id: string;
    end_at: string;
    business_id: string;
    services: { name: string } | null;
    clients: { name: string; email: string | null } | null;
    businesses: { business_name: string; slug: string; service_category: string | null; owner_id: string } | null;
  }>) {
    if (!b.clients?.email || !b.businesses || !b.services) {
      results.push({ id: b.id, sent: false, reason: "missing_data" });
      continue;
    }

    const category = b.businesses.service_category ?? "other";
    const perProOverride = overridesByPro.get(b.businesses.owner_id)?.get(category);
    const interval = perProOverride ?? defaultIntervalFor(category);

    const endAt = new Date(b.end_at);
    const daysSince = Math.floor((now.getTime() - endAt.getTime()) / (24 * 60 * 60 * 1000));
    // Fire reminder once daysSince reaches interval. Grace window: we only
    // scan up to 90 days back so stale bookings age out naturally.
    if (daysSince < interval) {
      results.push({ id: b.id, sent: false, reason: "too_early" });
      continue;
    }

    const email = b.clients.email;
    const allowed = await canSendRebookReminder(email);
    if (!allowed) {
      // Still flip rebook_reminder_sent_at so we don't re-check this booking
      // every day. The client can re-opt-in and receive for future bookings.
      await supabase
        .from("bookings")
        .update({ rebook_reminder_sent_at: new Date().toISOString() })
        .eq("id", b.id);
      results.push({ id: b.id, sent: false, reason: "unsubscribed" });
      continue;
    }

    // Issue preferences/unsubscribe token anchored to this booking.
    const tk = await issueBookingToken({ bookingId: b.id, clientEmail: email, ttlDays: 30 });
    if (!tk.ok) {
      results.push({ id: b.id, sent: false, reason: tk.reason });
      continue;
    }

    await sendRebookReminder({
      to: email,
      customerName: b.clients.name,
      businessName: b.businesses.business_name,
      serviceName: b.services.name,
      daysSince,
      siteUrl: `${APP_URL}/s/${b.businesses.slug}`,
      preferencesToken: tk.token,
    });

    await supabase
      .from("bookings")
      .update({ rebook_reminder_sent_at: new Date().toISOString() })
      .eq("id", b.id);

    results.push({ id: b.id, sent: true });
  }

  return NextResponse.json({
    scanned: results.length,
    sent: results.filter((r) => r.sent).length,
    skipped: results.filter((r) => !r.sent).length,
    results,
  });
}
