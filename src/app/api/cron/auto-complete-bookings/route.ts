import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Daily cron — auto-complete confirmed bookings whose scheduled end is
 * comfortably in the past. Closes the platform gap where the
 * `completed` status value existed in the schema (and was read by
 * pro-stats + goal-tracking + dashboard analytics) but was never
 * written by anything. Once this cron starts firing, those analytics
 * surfaces start returning real data for the first time.
 *
 * Buffer: a booking must have ended at least four hours ago before we
 * flip it. Pros run over, services take longer than scheduled, walk-in
 * windows extend — four hours is the floor at which it's safe to
 * assume the appointment really has ended. Tightening this risks
 * marking an in-progress booking complete; loosening would just delay
 * analytics accuracy by a day. Conservative wins.
 *
 * Defensive cap: 1000 rows per run. First firing post-deploy will see
 * a backlog (every confirmed-past-end booking ever), and capping bounds
 * the worst-case query. Oldest rows drain first (`order by end_at asc`)
 * so a large backlog cleans up FIFO across subsequent days. With
 * OYRB's current scale this is almost certainly a no-op concern; the
 * cap is cheap insurance against future scale.
 *
 * No notifications. The cron never sends email/SMS, never writes to
 * notification_log, never fires webhooks. It's a silent backfill of
 * state — pros have already moved on with their lives by the time the
 * appointment is four hours past its end.
 */

const BUFFER_HOURS = 4;
const BUFFER_MS = BUFFER_HOURS * 60 * 60 * 1000;
const MAX_PER_RUN = 1000;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() - BUFFER_MS);
  const startedAt = Date.now();

  // Candidates: confirmed bookings whose end_at is at least BUFFER_HOURS
  // in the past. Oldest first so a large backlog drains FIFO across runs.
  const { data: rows, error: selectErr } = await admin
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .lt("end_at", cutoff.toISOString())
    .order("end_at", { ascending: true })
    .limit(MAX_PER_RUN);

  if (selectErr) {
    console.error("[auto-complete-bookings] select failed:", selectErr.message);
    return NextResponse.json({ error: "select failed" }, { status: 500 });
  }

  const ids = ((rows ?? []) as Array<{ id: string }>).map((r) => r.id);

  if (ids.length === 0) {
    console.log(
      `[auto-complete-bookings] no candidates · ${Date.now() - startedAt}ms`,
    );
    return NextResponse.json({
      ok: true,
      completed: 0,
      backlogged: false,
      durationMs: Date.now() - startedAt,
    });
  }

  const { error: updateErr } = await admin
    .from("bookings")
    .update({ status: "completed", completed_at: now.toISOString() })
    .in("id", ids);

  if (updateErr) {
    console.error("[auto-complete-bookings] update failed:", updateErr.message);
    return NextResponse.json(
      {
        ok: false,
        completed: 0,
        attempted: ids.length,
        error: updateErr.message,
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }

  // backlogged=true means the cap was hit and there's likely more to do
  // tomorrow. Useful telemetry for monitoring whether the platform is
  // catching up or falling behind.
  const backlogged = ids.length === MAX_PER_RUN;
  console.log(
    `[auto-complete-bookings] completed=${ids.length}${backlogged ? " (capped — backlog continues next run)" : ""} · ${Date.now() - startedAt}ms`,
  );

  return NextResponse.json({
    ok: true,
    completed: ids.length,
    backlogged,
    durationMs: Date.now() - startedAt,
  });
}
