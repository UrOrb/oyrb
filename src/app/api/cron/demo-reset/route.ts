import { NextRequest, NextResponse } from "next/server";
import { resetDemoData } from "@/lib/demo-reset";
import { isDemoMode } from "@/lib/demo";

/**
 * Nightly reset cron. Scheduled via vercel.json at 08:00 UTC (= 4 AM
 * Eastern). No-ops on production (DEMO_MODE=false) even if Vercel
 * accidentally hits this route there — but the whole route file only
 * exists on the demo deployment's codebase anyway so this is belt +
 * suspenders.
 */
export async function GET(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ skipped: true, reason: "demo_mode_off" });
  }
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await resetDemoData();
    console.log(`[demo-reset] ok in ${result.duration_ms}ms; wiped ${result.tables_wiped.length} tables`);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[demo-reset] FAILED: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
