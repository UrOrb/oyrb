import { NextResponse } from "next/server";
import { cancelRemovalAsAdmin } from "@/lib/remove-brand/admin-actions";

/**
 * Admin escape hatch: cancel a pending Remove Brand grace period
 * before the cron finalizes the deletion.
 *
 *   POST /api/admin/remove-brand/cancel
 *   { "business_id": "<uuid>" }
 *
 * Authenticated via the admin's logged-in session — the inner
 * cancelRemovalAsAdmin server action runs requireAdmin() (env-driven
 * ADMIN_EMAILS allowlist, lib/admin.ts). Returns 401/403 on auth
 * failure; 200 with { ok: true } on success.
 *
 * Function-only in Phase 8 PR 5 — no admin UI page yet. Intended for
 * curl during incident response. A future PR can build a UI surface
 * that reuses cancelRemovalAsAdmin unchanged.
 */
export async function POST(request: Request) {
  let body: { business_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const businessId = (body.business_id ?? "").trim();
  if (!businessId) {
    return NextResponse.json(
      { ok: false, error: "business_id is required" },
      { status: 400 },
    );
  }

  const result = await cancelRemovalAsAdmin(businessId);
  if (!result.ok) {
    // 401/403 distinguishable in logs: requireAdmin's error strings
    // include "Not authenticated" / "Admin access required". Anything
    // else is a 400-class business-state problem.
    const status =
      result.error === "Not authenticated"
        ? 401
        : result.error === "Admin access required"
          ? 403
          : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
