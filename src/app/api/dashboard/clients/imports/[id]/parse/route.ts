import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAllowedMime } from "@/lib/client-imports/upload-constants";
import { detectVendor, buildInitialMapping } from "@/lib/client-imports/vendor-presets";
import {
  normalizeRow,
  classifyErrorField,
  loadExistingContacts,
  type ParsedRow,
} from "@/lib/client-imports/row-parser";
import type {
  ImportColumnMapping,
  ImportPreviewRow,
  ImportError,
  ImportTargetField,
} from "@/lib/client-imports/types";

/**
 * Parses the previously-uploaded CSV and writes the structured preview
 * back to the client_imports row. Side-effect-free: this route writes
 * ONLY to client_imports — no clients inserted, no emails sent, no
 * Stripe customers created, no consent flags flipped, no referral
 * attribution. Commit happens in PR 3.
 *
 * State machine: pending_upload → pending_parse → pending_review.
 * The intermediate `pending_parse` write is a "we picked this up,
 * don't double-process" marker; if anything below throws, we move to
 * `failed` and surface a generic error message.
 */

const PREVIEW_ROW_CAP = 50;

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

  // Existence-leak posture (PR #45 canonical): if the row doesn't
  // exist OR doesn't belong to the caller's business, both branches
  // return the same 404 shape. Never let the response distinguish
  // "wrong import id" from "someone else's import id".
  const { data: importRow } = await admin
    .from("client_imports")
    .select("id, business_id, status, source_path, source_mime, businesses(owner_id)")
    .eq("id", id)
    .maybeSingle();

  const row = importRow as unknown as {
    id: string;
    business_id: string;
    status: string;
    source_path: string | null;
    source_mime: string | null;
    businesses: { owner_id: string } | null;
  } | null;

  if (!row || !row.businesses || row.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status !== "pending_upload") {
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }
  if (!row.source_path) {
    // Caller hit /parse before the file was uploaded. Mark failed so
    // the row isn't left in a half-state forever.
    await markFailed(admin, id);
    return NextResponse.json({ error: "missing_source" }, { status: 400 });
  }
  if (!isAllowedMime(row.source_mime)) {
    // Defense-in-depth: bucket allowlist + upload-token route both
    // already enforce this. If we somehow get here, something is off.
    await markFailed(admin, id);
    return NextResponse.json({ error: "invalid_mime" }, { status: 400 });
  }

  // Claim the row so a duplicate POST (double-click, network retry)
  // can't run the parser twice. invalid_state above blocks the
  // second caller from progressing past validation.
  await admin
    .from("client_imports")
    .update({ status: "pending_parse" })
    .eq("id", id);

  try {
    const fileText = await fetchSourceFile(admin, row.source_path);
    const parsed = Papa.parse<ParsedRow>(fileText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });

    const headers = (parsed.meta.fields ?? []).filter((h): h is string => Boolean(h && h.trim()));
    if (headers.length === 0) {
      await markFailed(admin, id);
      return NextResponse.json({ error: "empty_file" }, { status: 400 });
    }

    const vendorHint = detectVendor(headers);
    const columnMapping: ImportColumnMapping = vendorHint
      ? buildInitialMapping(vendorHint.id, headers)
      : Object.fromEntries(headers.map((h) => [h, "ignore" as ImportTargetField]));

    // Normalize every row up front so the dedup pass can compare on
    // the same shape we'll persist in PR 3's commit.
    const normalized = (parsed.data ?? []).map((rawRow, idx) =>
      normalizeRow(rawRow, columnMapping, idx + 1),
    );

    // Existing-clients dedup. Single round trip — fetch this business's
    // emails + phones into memory, then test in O(1). Scales to ~10k
    // clients comfortably; if a pro ever hits a million, swap for a
    // server-side temp-table strategy. Not a concern at PR 2 scope.
    const existing = await loadExistingContacts(admin, row.business_id);

    // Within-file dedup tracking. The first occurrence keeps `valid`,
    // every subsequent match flips to `duplicate`.
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();

    const errorEntries: ImportError[] = [];
    let validCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const candidate of normalized) {
      // Validation errors win over duplicate status — a row missing a
      // name is unimportable regardless of whether its email already
      // exists.
      if (candidate.errors && candidate.errors.length > 0) {
        candidate.status = "error";
        for (const errMsg of candidate.errors) {
          errorEntries.push({
            row_index: candidate.row_index,
            field: classifyErrorField(errMsg),
            message: errMsg,
          });
        }
        errorCount += 1;
        continue;
      }

      const emailKey = candidate.email ?? null;
      const phoneKey = candidate.phone ?? null;

      const isExistingMatch =
        (emailKey && existing.byEmail.has(emailKey)) ||
        (phoneKey && existing.byPhone.has(phoneKey));
      const isWithinFileDup =
        (emailKey && seenEmails.has(emailKey)) ||
        (phoneKey && seenPhones.has(phoneKey));

      if (isExistingMatch || isWithinFileDup) {
        candidate.status = "duplicate";
        duplicateCount += 1;
      } else {
        candidate.status = "valid";
        validCount += 1;
      }

      if (emailKey) seenEmails.add(emailKey);
      if (phoneKey) seenPhones.add(phoneKey);
    }

    const previewData: ImportPreviewRow[] = normalized
      .slice(0, PREVIEW_ROW_CAP)
      .map((r) => ({
        row_index: r.row_index,
        status: r.status,
        name: r.name,
        email: r.email,
        phone: r.phone,
        notes: r.notes,
        ...(r.errors && r.errors.length > 0 ? { errors: r.errors } : {}),
      }));

    await admin
      .from("client_imports")
      .update({
        status: "pending_review",
        parsed_at: new Date().toISOString(),
        vendor_hint: vendorHint?.id ?? null,
        column_mapping: columnMapping,
        total_rows: normalized.length,
        valid_rows: validCount,
        duplicate_rows: duplicateCount,
        error_rows: errorCount,
        preview_data: previewData,
        errors: errorEntries,
      })
      .eq("id", id);

    const { data: updated } = await admin
      .from("client_imports")
      .select("*")
      .eq("id", id)
      .single();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("client-imports parse failed:", err);
    await markFailed(admin, id);
    return NextResponse.json({ error: "parse_error" }, { status: 500 });
  }
}

async function markFailed(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
) {
  await admin
    .from("client_imports")
    .update({ status: "failed" })
    .eq("id", id);
}

async function fetchSourceFile(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
): Promise<string> {
  const { data, error } = await admin.storage.from("client-imports").download(path);
  if (error || !data) {
    throw new Error(`download failed: ${error?.message ?? "no data"}`);
  }
  return await data.text();
}
