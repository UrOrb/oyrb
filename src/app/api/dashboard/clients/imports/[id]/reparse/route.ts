import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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
 * Re-parse a previously-parsed import using a pro-supplied column
 * mapping. Sister route to /parse, with three deliberate differences:
 *
 *   1. Status guard: pending_review (not pending_upload). The pro
 *      iterates on the mapping after seeing the first parse's
 *      preview; status doesn't change as a result of re-parsing.
 *   2. Mapping source: uses the body's `column_mapping` verbatim.
 *      Skips vendor auto-detection — the pro is overriding it.
 *   3. Lifecycle: stays at pending_review throughout. No "claim"
 *      via status transition, since this is idempotent — running
 *      twice with the same mapping produces the same result.
 *
 * Side-effect surface: only client_imports updates. Source storage
 * file unchanged. No clients written. preview_data is rebuilt from
 * scratch, so any duplicate_action selections from the prior parse
 * are reset to the new parse's default ("skip"). Caller's UI surfaces
 * a warning before invoking this route when prior selections exist.
 */

const PREVIEW_ROW_CAP = 50;
const VALID_TARGETS: ImportTargetField[] = ["name", "email", "phone", "notes", "ignore"];

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

  let body: { column_mapping?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validatedMapping = validateMapping(body.column_mapping);
  if (!validatedMapping.ok) {
    return NextResponse.json({ error: validatedMapping.error }, { status: 400 });
  }
  const newMapping = validatedMapping.mapping;

  const admin = createAdminClient();

  // Existence-leak posture (PR #45 canonical): same 404 for "doesn't
  // exist" and "not yours" — never let response shape distinguish.
  const { data: importRow } = await admin
    .from("client_imports")
    .select("id, business_id, status, source_path, businesses(owner_id)")
    .eq("id", id)
    .maybeSingle();

  const row = importRow as unknown as {
    id: string;
    business_id: string;
    status: string;
    source_path: string | null;
    businesses: { owner_id: string } | null;
  } | null;

  if (!row || !row.businesses || row.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status !== "pending_review") {
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }
  if (!row.source_path) {
    return NextResponse.json({ error: "missing_source" }, { status: 400 });
  }

  try {
    // Re-fetch the source CSV. Storage call is the same shape as
    // /parse; both share the file but neither route mutates it.
    const { data: file, error: dlErr } = await admin.storage
      .from("client-imports")
      .download(row.source_path);
    if (dlErr || !file) {
      throw new Error(`download failed: ${dlErr?.message ?? "no data"}`);
    }
    const fileText = await file.text();

    const parsed = Papa.parse<ParsedRow>(fileText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });

    // Verify the supplied mapping's keys actually exist as headers
    // in the file. A pro who edits the mapping shouldn't be able to
    // accidentally introduce a header the file doesn't have (would
    // silently no-op every row).
    const csvHeaders = new Set(
      (parsed.meta.fields ?? []).filter((h): h is string => Boolean(h && h.trim())),
    );
    for (const header of Object.keys(newMapping)) {
      if (!csvHeaders.has(header)) {
        return NextResponse.json(
          { error: "unknown_header", header },
          { status: 400 },
        );
      }
    }

    const normalized = (parsed.data ?? []).map((rawRow, idx) =>
      normalizeRow(rawRow, newMapping, idx + 1),
    );

    // Fresh dedup pass against current clients table state.
    const existing = await loadExistingContacts(admin, row.business_id);
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();

    const errorEntries: ImportError[] = [];
    let validCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const candidate of normalized) {
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

    // preview_data is rebuilt from scratch — duplicate_action
    // selections from the prior parse are intentionally reset.
    // Surfaced as a warning in the UI before the pro re-parses.
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

    // Atomic update with status filter so a concurrent re-parse or
    // commit doesn't clobber a transition that's already happened.
    // No status change — stays at pending_review — but the filter
    // protects against, e.g., re-parse landing after the pro hit
    // Confirm.
    const { data: updated } = await admin
      .from("client_imports")
      .update({
        column_mapping: newMapping,
        parsed_at: new Date().toISOString(),
        total_rows: normalized.length,
        valid_rows: validCount,
        duplicate_rows: duplicateCount,
        error_rows: errorCount,
        preview_data: previewData,
        errors: errorEntries,
        // vendor_hint is intentionally NOT touched. The pro
        // overrode the auto-detected mapping; we keep the original
        // detection result on the row as historical provenance.
      })
      .eq("id", id)
      .eq("status", "pending_review")
      .select("*")
      .single();

    if (!updated) {
      return NextResponse.json({ error: "invalid_state" }, { status: 409 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("client-imports reparse failed:", err);
    return NextResponse.json({ error: "reparse_error" }, { status: 500 });
  }
}

type MappingValidation =
  | { ok: true; mapping: ImportColumnMapping }
  | { ok: false; error: string };

/**
 * Verify the body's column_mapping is the right shape:
 *   - object with string keys (CSV headers)
 *   - values are one of the allowed ImportTargetField strings
 *   - non-empty (otherwise the re-parse would be a no-op)
 */
function validateMapping(input: unknown): MappingValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "column_mapping must be an object" };
  }
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length === 0) {
    return { ok: false, error: "column_mapping must not be empty" };
  }
  const mapping: ImportColumnMapping = {};
  for (const [header, target] of entries) {
    if (typeof header !== "string" || header.length === 0) {
      return { ok: false, error: "column_mapping keys must be non-empty strings" };
    }
    if (
      typeof target !== "string" ||
      !VALID_TARGETS.includes(target as ImportTargetField)
    ) {
      return {
        ok: false,
        error: `column_mapping value for ${header} must be one of ${VALID_TARGETS.join(", ")}`,
      };
    }
    mapping[header] = target as ImportTargetField;
  }
  return { ok: true, mapping };
}
