import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Phase 3 — Service timing: Start ping.
 *
 * Pro taps "Start service" on the booking detail page. We stamp
 * service_started_at = now() if currently NULL.
 *
 * Idempotent — the first tap wins. Subsequent calls return the
 * existing timestamp without overwriting (atomic via the WHERE
 * service_started_at IS NULL filter on the UPDATE so concurrent taps
 * resolve cleanly without a transaction).
 *
 * Auth: 404 (not 403) for non-owners — matches the detail page's
 * existence-leak protection.
 *
 * No notifications, no notification_log writes — this is operational
 * data, not communication.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Verify ownership + read current state. The select goes through
  // the user's RLS-scoped client first; if it doesn't return a row we
  // 404 without leaking whether the booking exists for someone else.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, business_id, status, service_started_at, businesses!inner(owner_id)")
    .eq("id", id)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = booking as unknown as {
    id: string;
    business_id: string;
    status: string;
    service_started_at: string | null;
    businesses: { owner_id: string };
  };

  if (row.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Status restriction matches the UI's render gate: only confirmed
  // bookings can be tapped. The UI hides the button for other
  // statuses, so this branch is a defense-in-depth check against
  // direct API calls.
  if (row.status !== "confirmed") {
    return NextResponse.json(
      { error: "Service timing only available for confirmed bookings." },
      { status: 400 },
    );
  }

  // Already started? Return existing timestamp without overwriting.
  if (row.service_started_at) {
    return NextResponse.json({ service_started_at: row.service_started_at });
  }

  const nowIso = new Date().toISOString();
  const admin = createAdminClient();

  // Atomic first-write-wins. If two taps race, the second sees an
  // already-set value and the WHERE clause stops the second UPDATE
  // from changing anything.
  const { data: updated, error: updErr } = await admin
    .from("bookings")
    .update({ service_started_at: nowIso })
    .eq("id", row.id)
    .is("service_started_at", null)
    .select("service_started_at")
    .maybeSingle();

  if (updErr) {
    console.error("[timing/start] update failed:", updErr.message);
    return NextResponse.json({ error: "Couldn't start the service timer." }, { status: 500 });
  }

  // Race resolution: the UPDATE returned no rows because another
  // request slipped in first. Re-read and return the winning value.
  if (!updated) {
    const { data: fresh } = await admin
      .from("bookings")
      .select("service_started_at")
      .eq("id", row.id)
      .maybeSingle();
    return NextResponse.json({
      service_started_at:
        (fresh as { service_started_at: string | null } | null)?.service_started_at ?? nowIso,
    });
  }

  return NextResponse.json({ service_started_at: updated.service_started_at });
}
