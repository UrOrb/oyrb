import { NextRequest, NextResponse } from "next/server";
import { resetDemoData } from "@/lib/demo-reset";
import { demoAdminToken, isDemoMode } from "@/lib/demo";

/**
 * Manual demo-reset endpoint. Protected by a simple bearer token
 * (DEMO_ADMIN_TOKEN env var) — separate from CRON_SECRET so rotating one
 * doesn't affect the other. Only active when DEMO_MODE=true.
 *
 *   curl -XPOST -H "Authorization: Bearer $DEMO_ADMIN_TOKEN" \
 *        https://demo.oyrb.space/api/admin/demo/reset
 */
export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }
  const token = demoAdminToken();
  const auth = request.headers.get("authorization") ?? "";
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await resetDemoData();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
