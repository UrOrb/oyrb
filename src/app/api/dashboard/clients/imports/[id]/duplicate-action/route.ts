import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { DuplicateAction, ImportPreviewRow } from "@/lib/client-imports/types";

/**
 * Persist the pro's per-row duplicate-handling choice (skip / merge /
 * create_anyway) onto the matching entry inside the import's
 * `preview_data` jsonb array. Called from the preview UI's per-row
 * action selector with a 500ms client-side debounce.
 *
 * Storage shape: `preview_data` is a jsonb array of ImportPreviewRow.
 * We read the whole array, find the entry whose row_index matches
 * the request, set its `duplicate_action` field, and write the array
 * back. Cheap at the 50-row preview cap; would warrant a different
 * shape if the preview ever grew unbounded.
 *
 * Concurrency: read-modify-write under racing PATCHes → last writer
 * wins. The 500ms debounce + 60/min/business rate limit are good
 * enough; pros aren't rapidly toggling the same row from two devices.
 *
 * Existence-leak posture: 404 for both "doesn't exist" and "not
 * yours", same as every other client_imports route.
 */
const VALID_ACTIONS: DuplicateAction[] = ["skip", "merge", "create_anyway"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { row_index?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.row_index !== "number" || !Number.isFinite(body.row_index)) {
    return NextResponse.json({ error: "row_index must be a number" }, { status: 400 });
  }
  if (
    typeof body.action !== "string" ||
    !VALID_ACTIONS.includes(body.action as DuplicateAction)
  ) {
    return NextResponse.json(
      { error: `action must be one of ${VALID_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }
  const rowIndex = body.row_index;
  const action = body.action as DuplicateAction;

  const admin = createAdminClient();

  const { data: importRow } = await admin
    .from("client_imports")
    .select("id, business_id, status, preview_data, businesses(owner_id)")
    .eq("id", id)
    .maybeSingle();

  const row = importRow as unknown as {
    id: string;
    business_id: string;
    status: string;
    preview_data: ImportPreviewRow[] | null;
    businesses: { owner_id: string } | null;
  } | null;

  if (!row || !row.businesses || row.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status !== "pending_review") {
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }

  // Rate-limit defense behind the client-side debounce. Per business,
  // not per IP — pros on shared corporate networks shouldn't share a
  // bucket. 60/min covers normal pro behavior (a few clicks here and
  // there) without throttling intentional bulk edits.
  const rl = await rateLimit(`client-imports-duplicate-action:${row.business_id}`, 60, 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  const preview = row.preview_data ?? [];
  const targetIndex = preview.findIndex((r) => r.row_index === rowIndex);
  if (targetIndex === -1) {
    return NextResponse.json({ error: "row_not_in_preview" }, { status: 404 });
  }
  if (preview[targetIndex].status !== "duplicate") {
    return NextResponse.json(
      { error: "row_not_duplicate" },
      { status: 400 },
    );
  }

  const updated = preview.slice();
  updated[targetIndex] = { ...preview[targetIndex], duplicate_action: action };

  // Atomic write with status filter so a racing reparse / commit
  // can't have its preview_data clobbered by a stale PATCH.
  const { error: updErr } = await admin
    .from("client_imports")
    .update({ preview_data: updated })
    .eq("id", id)
    .eq("status", "pending_review");
  if (updErr) {
    console.error("duplicate-action PATCH failed:", updErr.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ row: updated[targetIndex] });
}
