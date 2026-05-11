import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { buildBookingsCsv } from "@/lib/exports/bookings-csv";
import { ipFromRequest } from "@/lib/rate-limit";

/**
 * Phase 8 PR 2 — Booking history CSV export.
 *
 * GET /api/dashboard/exports/bookings?siteId=<uuid>
 *
 * Returns a UTF-8 CSV of every booking the pro has on record, all
 * statuses included (pending / confirmed / cancelled / completed),
 * most recent first. Audit row writes to public.data_exports with
 * export_type = 'bookings'.
 *
 * Same structural pattern as the contacts route — the duplication is
 * intentional for this PR; a shared helper extraction lands in PR 3
 * once we have three data points.
 *
 * Audit ordering: insert AFTER successful CSV generation, BEFORE the
 * response. Insert failures log but never block the download. Lost
 * audit rows can be backfilled from logs; a 500 to the pro cannot be
 * undone.
 *
 * No migration required: data_exports.export_type is free-text, and
 * 'bookings' is already in EXPORT_TYPES (src/lib/exports/types.ts).
 *
 * Reachable while the dashboard is in past-due or strike-pause state
 * (the /api path itself isn't proxy-gated; this only matters for the
 * in-app links that surface it).
 */

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const siteId = request.nextUrl.searchParams.get("siteId");
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return NextResponse.json({ error: "No business found" }, { status: 404 });
  }

  // businesses.timezone is a non-null text column with default
  // 'America/New_York' (mig 003), so this is always populated in
  // practice. The builder applies its own DEFAULT_TZ fallback as
  // defense in depth.
  const { csv, rowCount, byteSize } = await buildBookingsCsv(
    supabase,
    business.id,
    business.timezone,
  );

  // Audit row insert via service-role. Best-effort: any insert failure
  // is logged but does not block the response.
  try {
    const admin = createAdminClient();
    const { error: auditError } = await admin.from("data_exports").insert({
      business_id: business.id,
      initiated_by_user_id: user.id,
      export_type: "bookings",
      row_count: rowCount,
      byte_size: byteSize,
      ip: ipFromRequest(request),
      user_agent: request.headers.get("user-agent") ?? null,
    });
    if (auditError) {
      console.error("data_exports insert failed", {
        business_id: business.id,
        user_id: user.id,
        export_type: "bookings",
        error: auditError,
      });
    }
  } catch (err) {
    console.error("data_exports insert threw", {
      business_id: business.id,
      user_id: user.id,
      export_type: "bookings",
      error: err,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const filename = `oyrb-bookings-${business.slug}-${today}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
