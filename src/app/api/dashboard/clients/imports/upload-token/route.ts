import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { rateLimit } from "@/lib/rate-limit";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILENAME_LENGTH,
  isAllowedMime,
} from "@/lib/client-imports/upload-constants";

/**
 * Mints a signed Supabase Storage upload URL for a client-import CSV.
 * Mirrors src/app/api/dashboard/disputes/[id]/upload-token/route.ts —
 * same body validation shape, same path/random/sanitize scheme, same
 * existence-leak posture (404 on unauth instead of 403). Differences:
 *
 *  - This route ALSO creates the parent client_imports row before
 *    minting the URL, so the response includes `importId` for the
 *    follow-up parse call.
 *  - Concurrency guard: only one active import per business at a time.
 *    Returns 409 with the existing import id so the upload page can
 *    redirect the user to wherever they left off (per discovery §4-c).
 *  - Rate limit: 10 imports/hour per business — generous enough for
 *    a real onboarding ("oh I uploaded the wrong file, let me cancel
 *    and try again") but tight enough to throttle a runaway script.
 */

const ACTIVE_IMPORT_STATUSES = ["pending_upload", "pending_parse", "pending_review"] as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const business = await getCurrentBusiness();
  if (!business) {
    // No business under this user → nothing to import into. 404 keeps
    // the response shape uniform with the existence-leak pattern even
    // though there's nothing to leak in this branch.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Rate limit BEFORE any DB work so a runaway client doesn't hammer
  // the concurrency-check query. Per business, not per IP — a pro on a
  // shared corporate network shouldn't share a bucket with strangers.
  const rl = rateLimit(`client-imports:${business.id}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", resetAt: rl.resetAt },
      { status: 429 },
    );
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
  if (body.filename.length === 0 || body.filename.length > MAX_FILENAME_LENGTH) {
    return NextResponse.json(
      { error: `Filename must be 1–${MAX_FILENAME_LENGTH} characters.` },
      { status: 400 },
    );
  }
  if (body.filename.includes("/") || body.filename.includes("\\")) {
    return NextResponse.json(
      { error: "Filename may not contain path separators." },
      { status: 400 },
    );
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

  const admin = createAdminClient();

  // Concurrency guard. The pro can have at most one active import in
  // flight; otherwise two browser tabs racing the same flow could both
  // commit and double-insert clients. Pre-existing active import →
  // surface its id so the UI can redirect the pro to resume.
  const { data: existing } = await admin
    .from("client_imports")
    .select("id")
    .eq("business_id", business.id)
    .in("status", ACTIVE_IMPORT_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "import_in_progress", existingImportId: existing.id },
      { status: 409 },
    );
  }

  // Create the import row BEFORE minting the signed URL so we have an
  // id for the storage path. status defaults to 'pending_upload' per
  // the migration; we overwrite source_path once the URL is minted.
  const { data: created, error: insertErr } = await admin
    .from("client_imports")
    .insert({
      business_id: business.id,
      initiated_by_user_id: user.id,
      source_filename: body.filename,
      source_mime: body.mime_type,
      source_size_bytes: body.size,
    })
    .select("id")
    .single();
  if (insertErr || !created) {
    console.error("client_imports insert failed:", insertErr?.message);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
  const importId = created.id as string;

  // Path scheme: {business_id}/{import_id}/{ts}-{rand}-{filename}
  // First folder MUST be the business id — migration 049's storage
  // RLS policy keys off (storage.foldername(name))[1] to scope reads
  // per business. Don't reorder.
  const cleanName = body.filename
    .replace(/[/\\]/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 100);
  const path = `${business.id}/${importId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;

  const { data: signed, error: signErr } = await admin.storage
    .from("client-imports")
    .createSignedUploadUrl(path);
  if (signErr || !signed) {
    console.error("createSignedUploadUrl (client-imports) failed:", signErr?.message);
    // Best-effort cleanup: drop the row we just created so the
    // concurrency guard doesn't lock the pro out of retrying.
    await admin.from("client_imports").delete().eq("id", importId);
    return NextResponse.json({ error: "upload_unavailable" }, { status: 500 });
  }

  // Persist the path so the parse route can find the file. Failure
  // here is recoverable — the file may still upload and parse can
  // resolve the path from the storage listing — but cleaner to leave
  // the row complete.
  await admin
    .from("client_imports")
    .update({ source_path: signed.path })
    .eq("id", importId);

  return NextResponse.json({
    importId,
    uploadUrl: signed.signedUrl,
    token: signed.token,
    path: signed.path,
  });
}
