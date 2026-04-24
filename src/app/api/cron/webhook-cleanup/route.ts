import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Daily cleanup of the Stripe webhook idempotency ledger.
 *
 * Vercel schedule: see vercel.json. Drops any row with status='success'
 * older than 90 days; the table only needs to retain enough history to
 * cover Stripe's longest possible re-delivery window (a few days at
 * most) plus a buffer for incident debugging. Failed rows are KEPT
 * indefinitely so we always have a forensic trail of unsuccessful
 * processing attempts.
 */
export async function GET() {
  const start = Date.now();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("processed_webhook_events")
      .delete({ count: "exact" })
      .eq("status", "success")
      .lt("processed_at", cutoff);
    if (error) throw error;
    console.log(`[webhook-cleanup] ok in ${Date.now() - start}ms · deleted=${count ?? 0}`);
    return NextResponse.json({ ok: true, deleted: count ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error(`[webhook-cleanup] FAILED: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
