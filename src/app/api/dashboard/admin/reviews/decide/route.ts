import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";

const VALID_DECISIONS = new Set(["kept", "removed", "more_info"]);

// Admin moderation: decide on a flagged review. "kept" restores public
// status without clearing the flag history (so the audit trail stays).
// "removed" pulls it from the site. "more_info" keeps it flagged but
// stamps the review log so we know an admin looked.
export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: { review_id?: string; decision?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reviewId = (body.review_id ?? "").trim();
  const decision = (body.decision ?? "").trim();
  if (!reviewId || !VALID_DECISIONS.has(decision)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("reviews")
    .select("id, status")
    .eq("id", reviewId)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {
    admin_decision: decision,
    admin_reviewed_at: new Date().toISOString(),
    admin_reviewer_user_id: gate.user.id,
  };
  if (decision === "kept") {
    update.status = "live";
    update.approved = true;
  } else if (decision === "removed") {
    update.status = "removed";
    update.approved = false;
  }
  // "more_info" leaves status='flagged' so it stays in the queue.

  const { error } = await admin.from("reviews").update(update).eq("id", reviewId);
  if (error) {
    console.error("Admin review decision failed:", error);
    return NextResponse.json({ error: "Couldn't save decision" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, decision });
}
