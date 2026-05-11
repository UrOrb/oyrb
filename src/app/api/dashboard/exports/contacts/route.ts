import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { buildContactsCsv } from "@/lib/exports/contacts-csv";
import { ipFromRequest } from "@/lib/rate-limit";

/**
 * Phase 8 PR 1 — Contacts CSV export.
 *
 * GET /api/dashboard/exports/contacts?siteId=<uuid>
 *
 * Returns a UTF-8 CSV of the pro's client list with the columns
 * declared in src/lib/exports/contacts-csv.ts. Each successful
 * response also writes an audit row into public.data_exports.
 *
 * Audit ordering (per spec): the data_exports row is written AFTER
 * successful CSV generation but BEFORE the response goes out. If the
 * insert fails, we log the error and STILL return the CSV — the
 * export succeeding for the pro is more important than the audit row.
 * Lost audit rows can be backfilled from logs; a 500 to the pro
 * cannot be undone.
 *
 * This route is reachable while the dashboard is in past-due or
 * strike-pause state because /dashboard/settings/* is on the proxy
 * exempt list (src/proxy.ts:18-22). The route path itself is /api,
 * which isn't gated by the proxy at all; the gating only matters for
 * the in-app links that surface this endpoint.
 *
 * Empty-state: a pro with zero clients receives a CSV containing only
 * the header row. The audit row still writes with row_count = 0.
 */

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // siteId is optional; getCurrentBusiness re-validates ownership and
  // falls back to the cookie / oldest-business chain when absent.
  const siteId = request.nextUrl.searchParams.get("siteId");
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return NextResponse.json({ error: "No business found" }, { status: 404 });
  }

  // CSV generation runs against the authenticated session — RLS on
  // clients / bookings / client_imports enforces business scope as
  // defense in depth, on top of the explicit business_id filter.
  const { csv, rowCount, byteSize } = await buildContactsCsv(
    supabase,
    business.id,
  );

  // Audit row insert via service-role, mirroring notification_log's
  // write convention. Best-effort: any insert failure is logged but
  // does not block the response. The catch() guarantees we never
  // throw out of this block — the CSV must still ship.
  try {
    const admin = createAdminClient();
    const { error: auditError } = await admin.from("data_exports").insert({
      business_id: business.id,
      initiated_by_user_id: user.id,
      export_type: "contacts",
      row_count: rowCount,
      byte_size: byteSize,
      ip: ipFromRequest(request),
      user_agent: request.headers.get("user-agent") ?? null,
    });
    if (auditError) {
      console.error("data_exports insert failed", {
        business_id: business.id,
        user_id: user.id,
        error: auditError,
      });
    }
  } catch (err) {
    console.error("data_exports insert threw", {
      business_id: business.id,
      user_id: user.id,
      error: err,
    });
  }

  // YYYY-MM-DD filename suffix in UTC. Matches what most CSV exports
  // look like in tools the pro is migrating from (Acuity / GlossGenius
  // both use ISO date stamps in their export filenames).
  const today = new Date().toISOString().slice(0, 10);
  const filename = `oyrb-contacts-${business.slug}-${today}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Prevent any intermediate cache from serving stale data — this
      // is a per-user authenticated export.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
