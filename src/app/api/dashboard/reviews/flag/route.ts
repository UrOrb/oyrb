import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const VALID_REASONS = new Set(["spam", "inappropriate", "false_info", "offensive", "other"]);

// Pro-initiated flag. Reviews stay publicly visible when flagged — we're
// just surfacing them to the admin queue. The pro can't take a review
// down themselves (spec: "Flagged reviews stay live until admin decides").
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { review_id?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reviewId = (body.review_id ?? "").trim();
  const reason = (body.reason ?? "").trim();
  if (!reviewId) {
    return NextResponse.json({ error: "Missing review id" }, { status: 400 });
  }
  if (!VALID_REASONS.has(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("reviews")
    .select(`
      id, status, business_id,
      businesses(owner_id)
    `)
    .eq("id", reviewId)
    .maybeSingle();

  const review = row as unknown as {
    id: string;
    status: string;
    business_id: string;
    businesses: { owner_id: string } | null;
  } | null;

  if (!review || !review.businesses) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }
  // Only the pro whose business the review is on can flag it.
  if (review.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "Not your review" }, { status: 403 });
  }
  if (review.status === "removed") {
    return NextResponse.json({ error: "Already removed" }, { status: 409 });
  }
  if (review.status === "flagged") {
    return NextResponse.json({ error: "Already flagged" }, { status: 409 });
  }

  const { error } = await admin
    .from("reviews")
    .update({
      status: "flagged",
      flagged_at: new Date().toISOString(),
      flagged_reason: reason,
      flagged_by_user_id: user.id,
    })
    .eq("id", reviewId);
  if (error) {
    console.error("Flag review failed:", error);
    return NextResponse.json({ error: "Couldn't flag review" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
