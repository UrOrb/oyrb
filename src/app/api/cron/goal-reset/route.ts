import { NextResponse } from "next/server";
import { snapshotAllUsersForPreviousMonth } from "@/lib/goal-tracking";

/**
 * Monthly-reset cron for the income goal meter.
 *
 * Vercel schedule: `0 0 1 * *` — fires at 00:00 UTC on the 1st of each
 * month. Captures the previous month's goal-vs-earned snapshot into
 * goal_history for every user that has a goal setting row, then the
 * current-month meter naturally starts at $0 on the next dashboard load.
 *
 * The snapshot worker uses the service-role admin client and iterates
 * all users, so it only needs to run once per month (not per-user).
 */
export async function GET() {
  const start = Date.now();
  try {
    const result = await snapshotAllUsersForPreviousMonth();
    console.log(
      `[goal-reset] ok in ${Date.now() - start}ms · captured=${result.captured} skipped=${result.skipped}`,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error(`[goal-reset] FAILED: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
