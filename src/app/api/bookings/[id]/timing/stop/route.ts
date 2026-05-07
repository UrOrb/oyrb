import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Phase 3 — Service timing: Stop ping.
 *
 * Pro taps "Stop service" on the booking detail page. We stamp
 * service_ended_at = now() if currently NULL AND service_started_at
 * IS NOT NULL.
 *
 * Stop requires Start. Tapping Stop without Start returns a 400 with
 * an error message. UI also disables the Stop button until Start is
 * tapped, so the API check is defense-in-depth.
 *
 * Stop does NOT flip booking.status to 'completed' or stamp
 * bookings.completed_at. Those are owned by the auto-complete cron
 * (PR #21) and run on the scheduled `end_at + 4h` clock. A pro who
 * stops at 1pm for a 2pm-end-scheduled booking shouldn't have the
 * slot freed for new bookings until the scheduled end. Phase 3 is
 * purely a real-world signal layer.
 *
 * Idempotent — first tap wins. No undo. No notifications.
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

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, business_id, status, service_started_at, service_ended_at, businesses!inner(owner_id)",
    )
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
    service_ended_at: string | null;
    businesses: { owner_id: string };
  };

  if (row.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (row.status !== "confirmed") {
    return NextResponse.json(
      { error: "Service timing only available for confirmed bookings." },
      { status: 400 },
    );
  }

  if (!row.service_started_at) {
    return NextResponse.json(
      { error: "Tap Start before tapping Stop." },
      { status: 400 },
    );
  }

  // Already stopped? Idempotent — return the existing timestamp.
  if (row.service_ended_at) {
    return NextResponse.json({
      service_started_at: row.service_started_at,
      service_ended_at: row.service_ended_at,
    });
  }

  const nowIso = new Date().toISOString();
  const admin = createAdminClient();

  const { data: updated, error: updErr } = await admin
    .from("bookings")
    .update({ service_ended_at: nowIso })
    .eq("id", row.id)
    .is("service_ended_at", null)
    .not("service_started_at", "is", null)
    .select("service_started_at, service_ended_at")
    .maybeSingle();

  if (updErr) {
    console.error("[timing/stop] update failed:", updErr.message);
    return NextResponse.json({ error: "Couldn't stop the service timer." }, { status: 500 });
  }

  if (!updated) {
    const { data: fresh } = await admin
      .from("bookings")
      .select("service_started_at, service_ended_at")
      .eq("id", row.id)
      .maybeSingle();
    return NextResponse.json({
      service_started_at: (fresh as { service_started_at: string | null } | null)?.service_started_at ?? row.service_started_at,
      service_ended_at: (fresh as { service_ended_at: string | null } | null)?.service_ended_at ?? nowIso,
    });
  }

  return NextResponse.json({
    service_started_at: updated.service_started_at,
    service_ended_at: updated.service_ended_at,
  });
}
