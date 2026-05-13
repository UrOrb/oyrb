import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { buildBookingsXlsx } from "@/lib/exports/bookings-xlsx";
import { XLSX_CONTENT_TYPE } from "@/lib/exports/xlsx";
import { ipFromRequest } from "@/lib/rate-limit";

/**
 * Booking history XLSX export.
 *
 * GET /api/dashboard/exports/bookings?siteId=<uuid>
 *
 * Returns an Excel workbook containing one ListObject (Table) of every
 * booking the pro has on record, all statuses included
 * (pending / confirmed / cancelled / completed), most recent first.
 * Audit row writes to public.data_exports with export_type = 'bookings'.
 *
 * Audit ordering: insert AFTER successful workbook generation, BEFORE
 * the response. Insert failures log but never block the download.
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

  const { buffer, rowCount, byteSize } = await buildBookingsXlsx(
    supabase,
    business.id,
    business.timezone,
  );

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
  const filename = `oyrb-bookings-${business.slug}-${today}.xlsx`;

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
