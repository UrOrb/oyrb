import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  isAllowedMime,
} from "@/lib/disputes";

/**
 * Mints a signed Supabase Storage upload URL for pro counter-evidence.
 * Auth-gated to the dispute owner. Path scheme:
 *   bookings/{bookingId}/pro/{ts}-{rand}-{filename}
 *
 * Mirrors the client-side upload-token route's validation but uses
 * auth instead of a magic-link token.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { filename?: string; mime_type?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.filename || !body.mime_type || typeof body.size !== "number") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!isAllowedMime(body.mime_type)) {
    return NextResponse.json(
      { error: `File type not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(", ")}.` },
      { status: 400 },
    );
  }
  if (body.size <= 0 || body.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB.` },
      { status: 400 },
    );
  }

  // Verify dispute belongs to this pro AND is still in awaiting_counter.
  const admin = createAdminClient();
  const { data: dispute } = await admin
    .from("dispute_inquiries")
    .select("id, business_id, booking_id, status, businesses(owner_id)")
    .eq("id", id)
    .maybeSingle();

  const row = dispute as unknown as {
    id: string;
    business_id: string;
    booking_id: string;
    status: string;
    businesses: { owner_id: string } | null;
  } | null;

  if (!row || !row.businesses || row.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status !== "awaiting_counter") {
    return NextResponse.json(
      { error: "Counter-evidence window has closed for this inquiry." },
      { status: 400 },
    );
  }

  const cleanName = body.filename
    .replace(/[/\\]/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 100);
  const path = `bookings/${row.booking_id}/pro/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;

  const { data, error } = await admin.storage
    .from("dispute-evidence")
    .createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl (pro) failed:", error?.message);
    return NextResponse.json({ error: "Upload server unavailable" }, { status: 500 });
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    path: data.path,
  });
}
