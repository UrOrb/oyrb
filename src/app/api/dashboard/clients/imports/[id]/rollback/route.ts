import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Undoes a recent commit by deleting all clients with this import as
 * their `imported_via_id`. Bounded by a 7-day window — long enough to
 * catch "I uploaded the wrong file" surprise, short enough that
 * rollback can't quietly nuke a list a pro has been working with for
 * weeks.
 *
 * State machine: committed → rolled_back (within 7 days) | refused otherwise.
 *
 * Defensive booking-FK guard: bookings.client_id is ON DELETE SET NULL
 * (per migration 001), so deleting a client orphans any bookings
 * referencing them rather than crashing or cascading. That's a
 * silently-destructive UX outcome we deliberately refuse — if any of
 * the to-be-deleted clients have bookings, the route returns 409 with
 * { error: "rollback_blocked_bookings_exist", count: N } and the pro
 * goes through support for manual cleanup.
 *
 * Defensive merge guard (PR 4): if any duplicate rows were committed
 * with the "merge" action (clients_merged > 0), rollback refuses with
 * 409 { error: "rollback_blocked_merges_present", count: N }. We
 * don't snapshot pre-merge client state, so undoing a merge would
 * either delete a pre-existing client (wrong — they pre-date the
 * import) or leave the merged data in place with the audit trail
 * removed (wrong — silently keeps the change). Refusing is the
 * cleanest defensive choice; pro contacts support for manual undo.
 *
 * Why 7 days specifically: balances "oh I made a mistake" recovery
 * against "the pro has interacted with these clients now, undoing
 * silently is destructive." Industry-standard soft-undo window.
 * Locked in this PR; future changes ship as their own PR.
 */
const ROLLBACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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

  const admin = createAdminClient();

  const { data: importRow } = await admin
    .from("client_imports")
    .select(
      "id, business_id, status, committed_at, clients_merged, businesses(owner_id)",
    )
    .eq("id", id)
    .maybeSingle();

  const row = importRow as unknown as {
    id: string;
    business_id: string;
    status: string;
    committed_at: string | null;
    clients_merged: number | null;
    businesses: { owner_id: string } | null;
  } | null;

  if (!row || !row.businesses || row.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status !== "committed") {
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }
  if (!row.committed_at) {
    // Defensive — if status is committed but committed_at is missing,
    // we have no anchor for the 7-day check. Refuse rather than
    // assume "now" or "forever ago".
    return NextResponse.json({ error: "missing_committed_at" }, { status: 409 });
  }
  const committedMs = new Date(row.committed_at).getTime();
  if (Date.now() - committedMs > ROLLBACK_WINDOW_MS) {
    return NextResponse.json(
      { error: "rollback_window_expired" },
      { status: 410 },
    );
  }

  // Merge guard (PR 4 decision A). Refuse rollback when any rows
  // were committed via merge — we can't auto-undo merges without
  // snapshotting pre-merge state. Cheaper than a per-row scan: the
  // commit route writes clients_merged on success, so a single
  // column read is enough.
  if ((row.clients_merged ?? 0) > 0) {
    return NextResponse.json(
      {
        error: "rollback_blocked_merges_present",
        count: row.clients_merged,
      },
      { status: 409 },
    );
  }

  // Booking guard: refuse rollback if any to-be-deleted client has at
  // least one booking. Cheaper than a per-client subquery — fetch the
  // list of imported client IDs first, then a single count query
  // against bookings.client_id.
  const { data: importedClients } = await admin
    .from("clients")
    .select("id")
    .eq("business_id", row.business_id)
    .eq("imported_via_id", id);
  const clientIds = ((importedClients ?? []) as Array<{ id: string }>).map((c) => c.id);

  if (clientIds.length > 0) {
    const { count: bookingCount } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("client_id", clientIds);
    if ((bookingCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: "rollback_blocked_bookings_exist",
          count: bookingCount,
        },
        { status: 409 },
      );
    }
  }

  // Atomic-ish delete. supabase-js doesn't return a count on delete
  // unless we also select; use the imported clientIds length as the
  // authoritative count (we just verified it's safe to delete them
  // all and there's no concurrent insert path).
  if (clientIds.length > 0) {
    const { error: delErr } = await admin
      .from("clients")
      .delete()
      .in("id", clientIds);
    if (delErr) {
      console.error("rollback delete failed:", delErr.message);
      return NextResponse.json(
        { error: "rollback_failed", message: delErr.message },
        { status: 500 },
      );
    }
  }

  // Atomic flip with status filter so a concurrent rollback can't
  // double-stamp rolled_back_at.
  const { data: flipped } = await admin
    .from("client_imports")
    .update({
      status: "rolled_back",
      rolled_back_at: new Date().toISOString(),
      clients_deleted: clientIds.length,
    })
    .eq("id", id)
    .eq("status", "committed")
    .select("id");
  if (!flipped || flipped.length === 0) {
    // Lost the race. The other rollback either succeeded (in which
    // case our delete was a no-op anyway since they deleted first) or
    // failed midway. Surface invalid_state so the pro refreshes.
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }

  return NextResponse.json({
    status: "rolled_back",
    clients_deleted: clientIds.length,
  });
}
