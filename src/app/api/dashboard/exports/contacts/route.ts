import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { buildContactsXlsx } from "@/lib/exports/contacts-xlsx";
import { XLSX_CONTENT_TYPE } from "@/lib/exports/xlsx";
import { ipFromRequest } from "@/lib/rate-limit";

/**
 * Contacts XLSX export.
 *
 * GET /api/dashboard/exports/contacts?siteId=<uuid>
 *
 * Returns an Excel workbook containing one ListObject (Table) of the
 * pro's client list with the columns declared in
 * src/lib/exports/contacts-xlsx.ts. Each successful response also
 * writes an audit row into public.data_exports.
 *
 * Audit ordering (per spec): the data_exports row is written AFTER
 * successful workbook generation but BEFORE the response goes out. If
 * the insert fails, we log the error and STILL return the workbook —
 * the export succeeding for the pro is more important than the audit
 * row. Lost audit rows can be backfilled from logs; a 500 to the pro
 * cannot be undone.
 *
 * This route is reachable while the dashboard is in past-due or
 * strike-pause state because /dashboard/settings/* is on the proxy
 * exempt list (src/proxy.ts:18-22).
 *
 * Empty-state: a pro with zero clients receives a workbook containing
 * only the header row inside an empty filterable table. The audit row
 * still writes with row_count = 0.
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

  const { buffer, rowCount, byteSize } = await buildContactsXlsx(
    supabase,
    business.id,
  );

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

  const today = new Date().toISOString().slice(0, 10);
  const filename = `oyrb-contacts-${business.slug}-${today}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(byteSize),
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
