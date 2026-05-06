import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveToken } from "@/lib/booking-tokens";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  isAllowedMime,
} from "@/lib/disputes";

/**
 * Mints a signed Supabase Storage upload URL for client-side dispute
 * evidence. Token-gated (no Supabase auth user — clients aren't OYRB
 * users). Server validates size + mime + booking ownership before
 * minting; the URL itself is short-lived.
 *
 * Path scheme: bookings/{bookingId}/client/{ts}-{rand}-{filename}
 *   - bookings/{bookingId} keeps every file for a booking colocated.
 *   - /client/ subdirectory marks reporter side, mirrored by /pro/
 *     for counter-evidence. RLS policies (when used) can scope per
 *     side; pros never read /client/ files.
 *   - {ts}-{rand}- prefix prevents collisions when the client uploads
 *     two files with the same name.
 *   - All reads go through service-role-minted signed URLs in v1 — no
 *     anonymous read access via RLS.
 */
const UPLOAD_TTL_SECONDS = 300; // 5 minutes — generous enough for slow uploads, short enough to limit abuse

export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const limit = rateLimit(`disp-up:${ip}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many uploads. Slow down." }, { status: 429 });
  }

  let body: {
    token?: string;
    filename?: string;
    mime_type?: string;
    size?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.token || !body.filename || !body.mime_type || typeof body.size !== "number") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const resolved = await resolveToken(body.token);
  if (!resolved || resolved.expired) {
    return NextResponse.json({ error: "Link expired or invalid." }, { status: 401 });
  }

  if (!isAllowedMime(body.mime_type)) {
    return NextResponse.json(
      {
        error: `File type not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(", ")}.`,
      },
      { status: 400 },
    );
  }
  if (body.size <= 0 || body.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB.` },
      { status: 400 },
    );
  }

  // Sanitize filename: strip path separators, limit length, append a
  // timestamp + short random so two files with the same name don't
  // collide.
  const cleanName = body.filename
    .replace(/[/\\]/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 100);
  const path = `bookings/${resolved.bookingId}/client/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("dispute-evidence")
    .createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl failed:", error?.message);
    return NextResponse.json({ error: "Upload server unavailable" }, { status: 500 });
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    expiresInSeconds: UPLOAD_TTL_SECONDS,
  });
}
