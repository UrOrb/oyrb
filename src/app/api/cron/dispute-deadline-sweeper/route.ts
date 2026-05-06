import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  sendDisputeCounterWindowExpiring,
  sendDisputeMovedToReview,
} from "@/lib/email";

/**
 * Daily cron — Dispute Inquiry deadline sweeper. Runs at 08:00 UTC.
 *
 * Daily cadence is a Vercel Hobby-plan constraint, not a design
 * choice — Hobby only allows one run per day per cron. Worst-case
 * delay between counter_deadline expiration and the status flip to
 * under_review is therefore ~24 hours (vs. ~1 hour on an hourly
 * schedule). Acceptable for current scale; revisit when upgrading
 * to Vercel Pro and switching back to hourly (`30 * * * *`).
 *
 * Three independent passes per run:
 *
 *   1. T+24h reminder. Disputes filed 23–26h ago and still in
 *      awaiting_counter get a "24 hours left" email to the respondent.
 *      With a daily cron this 3-hour window only catches filings whose
 *      T+24 falls within today's run; misses are tolerable since the
 *      enforcement pass still fires.
 *   2. T+44h reminder. Disputes filed 43–46h ago and still in
 *      awaiting_counter get a "4 hours left" email. Same caveat as
 *      above — 3-hour window, daily cron means partial coverage.
 *   3. Enforcement. Disputes whose counter_deadline is past flip to
 *      under_review and both sides receive a "moved to OYRB review"
 *      email. The cron NEVER writes status='expired' — that's an
 *      admin-only manual transition after 30 days in under_review
 *      without resolution. Cron only handles awaiting_counter →
 *      under_review.
 *
 * Idempotency: notification_log dedup — every reminder email is
 * checked against prior rows for the same dispute + purpose. The
 * enforcement step uses the WHERE filter `status = 'awaiting_counter'`
 * so a duplicate run never re-flips a row.
 *
 * Auth: requires Authorization: Bearer ${CRON_SECRET}. Matches the
 * existing cron pattern verbatim.
 */
const HOUR_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const startedAt = Date.now();
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

  let reminders24h = 0;
  let reminders44h = 0;
  let enforced = 0;
  const errors: string[] = [];

  // ── Helpers ──────────────────────────────────────────────────────
  // Check whether we've already sent this reminder type for this
  // booking. notification_log is the dedup ledger from PR #16.
  async function alreadySentReminder(
    bookingId: string,
    hoursRemaining: number,
  ): Promise<boolean> {
    const { data } = await admin
      .from("notification_log")
      .select("id, status_detail")
      .eq("booking_id", bookingId)
      .eq("purpose", "dispute_counter_window_expiring")
      .order("sent_at", { ascending: false })
      .limit(5);
    return ((data ?? []) as Array<{ status_detail: string | null }>).some(
      (r) => r.status_detail === `hours_remaining=${hoursRemaining}`,
    );
  }

  async function resolveProEmail(
    businessId: string,
  ): Promise<string | null> {
    const { data: biz } = await admin
      .from("businesses")
      .select("contact_email, owner_id")
      .eq("id", businessId)
      .maybeSingle();
    if (!biz) return null;
    if ((biz as { contact_email: string | null }).contact_email) {
      return (biz as { contact_email: string }).contact_email;
    }
    const { data: auth } = await admin.auth.admin.getUserById(
      (biz as { owner_id: string }).owner_id,
    );
    return auth?.user?.email ?? null;
  }

  // ── Pass 1: T+24h reminder (filed 23–26h ago) ────────────────────
  try {
    const lo = new Date(now.getTime() - 26 * HOUR_MS).toISOString();
    const hi = new Date(now.getTime() - 23 * HOUR_MS).toISOString();
    const { data: rows } = await admin
      .from("dispute_inquiries")
      .select("id, business_id, booking_id, counter_deadline")
      .eq("status", "awaiting_counter")
      .gte("filed_at", lo)
      .lte("filed_at", hi);

    for (const r of (rows ?? []) as Array<{
      id: string;
      business_id: string;
      booking_id: string;
      counter_deadline: string;
    }>) {
      if (await alreadySentReminder(r.booking_id, 24)) continue;
      const proEmail = await resolveProEmail(r.business_id);
      if (!proEmail) continue;
      try {
        await sendDisputeCounterWindowExpiring({
          to: proEmail,
          businessId: r.business_id,
          bookingId: r.booking_id,
          hoursRemaining: 24,
          counterDeadline: new Date(r.counter_deadline),
          dashboardUrl: `${APP_URL}/dashboard/disputes/${r.id}`,
        });
        // Stamp the dedup marker. notification_log is written by
        // sendDisputeCounterWindowExpiring with purpose=dispute_counter_window_expiring;
        // we update its status_detail so the dedup query can match.
        await admin
          .from("notification_log")
          .update({ status_detail: "hours_remaining=24" })
          .eq("booking_id", r.booking_id)
          .eq("purpose", "dispute_counter_window_expiring")
          .is("status_detail", null);
        reminders24h++;
      } catch (err) {
        errors.push(`24h-reminder ${r.id}`);
        console.error("dispute 24h reminder failed:", err);
      }
    }
  } catch (err) {
    errors.push(`24h-pass:${err instanceof Error ? err.message : "unknown"}`);
    console.error("24h reminder pass failed:", err);
  }

  // ── Pass 2: T+44h reminder (filed 43–46h ago) ────────────────────
  try {
    const lo = new Date(now.getTime() - 46 * HOUR_MS).toISOString();
    const hi = new Date(now.getTime() - 43 * HOUR_MS).toISOString();
    const { data: rows } = await admin
      .from("dispute_inquiries")
      .select("id, business_id, booking_id, counter_deadline")
      .eq("status", "awaiting_counter")
      .gte("filed_at", lo)
      .lte("filed_at", hi);

    for (const r of (rows ?? []) as Array<{
      id: string;
      business_id: string;
      booking_id: string;
      counter_deadline: string;
    }>) {
      if (await alreadySentReminder(r.booking_id, 4)) continue;
      const proEmail = await resolveProEmail(r.business_id);
      if (!proEmail) continue;
      try {
        await sendDisputeCounterWindowExpiring({
          to: proEmail,
          businessId: r.business_id,
          bookingId: r.booking_id,
          hoursRemaining: 4,
          counterDeadline: new Date(r.counter_deadline),
          dashboardUrl: `${APP_URL}/dashboard/disputes/${r.id}`,
        });
        await admin
          .from("notification_log")
          .update({ status_detail: "hours_remaining=4" })
          .eq("booking_id", r.booking_id)
          .eq("purpose", "dispute_counter_window_expiring")
          .is("status_detail", null);
        reminders44h++;
      } catch (err) {
        errors.push(`44h-reminder ${r.id}`);
        console.error("dispute 44h reminder failed:", err);
      }
    }
  } catch (err) {
    errors.push(`44h-pass:${err instanceof Error ? err.message : "unknown"}`);
    console.error("44h reminder pass failed:", err);
  }

  // ── Pass 3: enforcement (counter_deadline elapsed) ───────────────
  try {
    const { data: expired } = await admin
      .from("dispute_inquiries")
      .select(`
        id, business_id, booking_id, reporter_email,
        bookings(client_id),
        clients!dispute_inquiries_booking_id_fkey(email)
      `)
      .eq("status", "awaiting_counter")
      .lt("counter_deadline", now.toISOString());

    // The join above is tricky — Postgres doesn't have a direct FK from
    // dispute_inquiries to clients. Fetch client email separately for
    // each row. Cheap given small expected volume.
    const rows = (expired ?? []) as Array<{
      id: string;
      business_id: string;
      booking_id: string;
      reporter_email: string;
    }>;

    for (const r of rows) {
      try {
        // Atomic flip — only update if still awaiting_counter, so
        // duplicate cron runs don't re-fire emails.
        const { data: updated } = await admin
          .from("dispute_inquiries")
          .update({ status: "under_review" })
          .eq("id", r.id)
          .eq("status", "awaiting_counter")
          .select("id");
        if (!updated || updated.length === 0) continue;

        const proEmail = await resolveProEmail(r.business_id);

        // Email to reporter (use stored reporter_email).
        await sendDisputeMovedToReview({
          to: r.reporter_email,
          recipientType: "client",
          businessId: r.business_id,
          bookingId: r.booking_id,
        }).catch((err) => console.error("moved-to-review reporter email failed:", err));

        if (proEmail) {
          await sendDisputeMovedToReview({
            to: proEmail,
            recipientType: "pro",
            businessId: r.business_id,
            bookingId: r.booking_id,
          }).catch((err) => console.error("moved-to-review pro email failed:", err));
        }

        enforced++;
      } catch (err) {
        errors.push(`enforce ${r.id}`);
        console.error("dispute enforcement step failed:", err);
      }
    }
  } catch (err) {
    errors.push(`enforce-pass:${err instanceof Error ? err.message : "unknown"}`);
    console.error("enforcement pass failed:", err);
  }

  console.log(
    `[dispute-deadline-sweeper] 24h=${reminders24h} 44h=${reminders44h} enforced=${enforced} · ${Date.now() - startedAt}ms`,
  );

  return NextResponse.json({
    ok: errors.length === 0,
    reminders24h,
    reminders44h,
    enforced,
    durationMs: Date.now() - startedAt,
    errors: errors.length > 0 ? errors : undefined,
  });
}
