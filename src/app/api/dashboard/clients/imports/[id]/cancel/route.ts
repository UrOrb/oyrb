import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Marks an in-flight import as cancelled and removes the source file
 * from storage. Only valid for pre-commit statuses — once we're past
 * `committed`, the rollback path (PR 3) is what undoes the import.
 *
 * Existence-leak posture: 404 for both "doesn't exist" and "not yours"
 * (PR #45 canonical pattern). Storage delete failures are swallowed —
 * the row is still marked cancelled, and a stale file in the bucket
 * is harmless (TTL cleanup will sweep it eventually).
 */
const CANCELLABLE_STATUSES = ["pending_upload", "pending_parse", "pending_review"] as const;

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
    .select("id, status, source_path, businesses(owner_id)")
    .eq("id", id)
    .maybeSingle();

  const row = importRow as unknown as {
    id: string;
    status: string;
    source_path: string | null;
    businesses: { owner_id: string } | null;
  } | null;

  if (!row || !row.businesses || row.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(row.status)) {
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }

  // Best-effort source-file delete. The row update is what matters
  // for the state machine; a leftover storage object doesn't change
  // the user-visible state.
  if (row.source_path) {
    const { error: removeErr } = await admin.storage
      .from("client-imports")
      .remove([row.source_path]);
    if (removeErr) {
      console.warn(
        "client-imports cancel: storage remove failed:",
        removeErr.message,
      );
    }
  }

  await admin
    .from("client_imports")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
