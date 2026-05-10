import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Daily cron — Client Imports stuck-state sweeper. Runs at 04:30 UTC.
 *
 * Two passes per run, each scanning client_imports for rows that have
 * been parked in a non-terminal state past their reasonable TTL:
 *
 *   1. pending_upload >24h. The upload-token route minted a signed URL
 *      and created the row, but the browser never finished the PUT.
 *      The signed URL has long since expired; the row is dead weight
 *      blocking the concurrency guard. Flip to cancelled + delete the
 *      placeholder storage entry (if any).
 *   2. pending_parse >1h. The parse route claimed the row but didn't
 *      finish (function timeout, crash, etc.). Flip to failed; keep
 *      the source file so we can debug. The state machine guards
 *      against parse re-running, so this is the only way out.
 *
 * The 24h / 1h thresholds match the discovery report (§3.12) and the
 * upload-token route's concurrency-guard expectations.
 *
 * Daily cadence is the Vercel Hobby-plan limit, not a design choice.
 * Worst-case dead-row delay is therefore ~24 hours — acceptable since
 * the row blocks no client-facing surface (only the pro's own concurrency
 * guard, and the upload page already returns the existing import id
 * via the 409 path so the pro can cancel it manually).
 *
 * Auth: Bearer ${CRON_SECRET}. Same shape as every other OYRB cron.
 */
const HOUR_MS = 60 * 60 * 1000;
const UPLOAD_TTL_MS = 24 * HOUR_MS;
const PARSE_TTL_MS = 1 * HOUR_MS;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const startedAt = Date.now();

  let cancelled = 0;
  let failed = 0;
  const errors: string[] = [];

  // ── Pass 1: pending_upload >24h → cancelled ──────────────────────
  try {
    const cutoff = new Date(now.getTime() - UPLOAD_TTL_MS).toISOString();
    const { data: stale } = await admin
      .from("client_imports")
      .select("id, source_path")
      .eq("status", "pending_upload")
      .lt("created_at", cutoff);

    for (const r of (stale ?? []) as Array<{ id: string; source_path: string | null }>) {
      try {
        // Best-effort placeholder cleanup. The upload likely never
        // completed (that's why we're here) so source_path may point
        // at nothing — the storage remove call is a no-op in that case
        // and we ignore the error.
        if (r.source_path) {
          await admin.storage.from("client-imports").remove([r.source_path]);
        }
        // Atomic flip — only update if still pending_upload, so a
        // racing manual cancel doesn't get clobbered.
        const { data: updated } = await admin
          .from("client_imports")
          .update({
            status: "cancelled",
            cancelled_at: now.toISOString(),
            error_summary: "auto-cancelled: upload not completed within 24 hours",
          })
          .eq("id", r.id)
          .eq("status", "pending_upload")
          .select("id");
        if (updated && updated.length > 0) cancelled++;
      } catch (err) {
        errors.push(`cancel ${r.id}`);
        console.error("client-imports sweep cancel failed:", err);
      }
    }
  } catch (err) {
    errors.push(`cancel-pass:${err instanceof Error ? err.message : "unknown"}`);
    console.error("client-imports sweep cancel pass failed:", err);
  }

  // ── Pass 2: pending_parse >1h → failed ──────────────────────────
  try {
    const cutoff = new Date(now.getTime() - PARSE_TTL_MS).toISOString();
    const { data: stale } = await admin
      .from("client_imports")
      .select("id")
      .eq("status", "pending_parse")
      .lt("created_at", cutoff);

    for (const r of (stale ?? []) as Array<{ id: string }>) {
      try {
        // Atomic flip — only update if still pending_parse. Source file
        // intentionally retained for debugging stuck parses.
        const { data: updated } = await admin
          .from("client_imports")
          .update({
            status: "failed",
            failed_at: now.toISOString(),
            error_summary: "auto-failed: parse did not complete within 1 hour",
          })
          .eq("id", r.id)
          .eq("status", "pending_parse")
          .select("id");
        if (updated && updated.length > 0) failed++;
      } catch (err) {
        errors.push(`fail ${r.id}`);
        console.error("client-imports sweep fail failed:", err);
      }
    }
  } catch (err) {
    errors.push(`fail-pass:${err instanceof Error ? err.message : "unknown"}`);
    console.error("client-imports sweep fail pass failed:", err);
  }

  console.log(
    `[client-imports-sweep] cancelled=${cancelled} failed=${failed} · ${Date.now() - startedAt}ms`,
  );

  return NextResponse.json({
    ok: errors.length === 0,
    swept: { cancelled, failed },
    durationMs: Date.now() - startedAt,
    errors: errors.length > 0 ? errors : undefined,
  });
}
