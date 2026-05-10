import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  normalizeRow,
  loadExistingContacts,
  type ParsedRow,
} from "@/lib/client-imports/row-parser";
import type { ImportColumnMapping } from "@/lib/client-imports/types";

/**
 * Inserts the previously-parsed import into public.clients. This is
 * the FIRST route in the imports flow that writes outside of
 * client_imports — every prior step (upload-token, parse, cancel)
 * touched only the audit row + storage.
 *
 * State machine: pending_review → committed (or → failed on error).
 *
 * Re-parse-from-source: the parse route only persists 50 sample rows
 * in preview_data. The full row set lives in the storage CSV until
 * commit. We re-fetch + re-parse here using the locked-in column
 * mapping from parse time, then re-validate + re-dedup against the
 * current clients table state (which may have grown between parse
 * and commit).
 *
 * Side-effect surface area: clients.insert only. No emails sent, no
 * Stripe customers, no welcome flow, no marketing/SMS consent flips.
 * Imported clients land with marketing_opt_in=false and
 * sms_consent=false — PR 5 will add a consent-affirmation checkbox
 * that lets the pro flip these per-row, but PR 3 hardcodes false.
 *
 * Concurrency: the status transition `pending_review → committed`
 * is gated by the `.eq("status", "pending_review")` filter on the
 * intermediate "claim" update, so a duplicate POST can't double-insert.
 */

// PostgREST has a 1 MB request body limit by default; chunk inserts
// in batches well below that ceiling. 500 client rows × ~200 bytes/row
// ~= 100 KB — comfortable margin even with verbose notes columns.
const INSERT_BATCH_SIZE = 500;

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

  // Existence-leak posture: same 404 for "doesn't exist" and "not
  // yours" (canonical PR #45 pattern). Don't let response shape
  // distinguish between them.
  const { data: importRow } = await admin
    .from("client_imports")
    .select("id, business_id, status, source_path, column_mapping, businesses(owner_id)")
    .eq("id", id)
    .maybeSingle();

  const row = importRow as unknown as {
    id: string;
    business_id: string;
    status: string;
    source_path: string | null;
    column_mapping: ImportColumnMapping | null;
    businesses: { owner_id: string } | null;
  } | null;

  if (!row || !row.businesses || row.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status !== "pending_review") {
    return NextResponse.json({ error: "invalid_state" }, { status: 409 });
  }
  if (!row.source_path) {
    await markFailed(admin, id, "missing source file");
    return NextResponse.json({ error: "missing_source" }, { status: 400 });
  }
  if (!row.column_mapping) {
    await markFailed(admin, id, "missing column mapping");
    return NextResponse.json({ error: "missing_mapping" }, { status: 400 });
  }

  try {
    // Re-fetch + re-parse the source CSV. The parse route only kept
    // 50 sample rows in preview_data; the source file is the truth.
    const fileText = await fetchSourceFile(admin, row.source_path);
    const parsed = Papa.parse<ParsedRow>(fileText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });

    const normalized = (parsed.data ?? []).map((rawRow, idx) =>
      normalizeRow(rawRow, row.column_mapping!, idx + 1),
    );

    // Re-dedup against current clients table state. The parse pass
    // ran against a snapshot from N minutes/hours ago — the pro may
    // have added clients via the booking flow since then, and we
    // don't want this commit to silently double-insert.
    const existing = await loadExistingContacts(admin, row.business_id);
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();

    type InsertRow = {
      business_id: string;
      name: string;
      email: string | null;
      phone: string | null;
      notes: string | null;
      imported_via_id: string;
      marketing_opt_in: boolean;
      sms_consent: boolean;
    };
    const toInsert: InsertRow[] = [];

    for (const candidate of normalized) {
      // Validation errors (per the shared normalizeRow) take precedence
      // over duplicate flagging — a row missing a name was unimportable
      // at parse time and stays unimportable at commit time.
      if (candidate.errors && candidate.errors.length > 0) continue;
      if (!candidate.name) continue; // belt-and-suspenders; errors path covers this

      const emailKey = candidate.email ?? null;
      const phoneKey = candidate.phone ?? null;

      const isExistingMatch =
        (emailKey && existing.emails.has(emailKey)) ||
        (phoneKey && existing.phones.has(phoneKey));
      const isWithinFileDup =
        (emailKey && seenEmails.has(emailKey)) ||
        (phoneKey && seenPhones.has(phoneKey));
      if (isExistingMatch || isWithinFileDup) continue;

      if (emailKey) seenEmails.add(emailKey);
      if (phoneKey) seenPhones.add(phoneKey);

      toInsert.push({
        business_id: row.business_id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        notes: candidate.notes,
        imported_via_id: id,
        // Hardcoded false per Phase 7 PR 3 spec — imported clients
        // never receive marketing/SMS until the pro explicitly toggles
        // consent on each. PR 5 will add a per-import affirmation
        // checkbox; this PR keeps consent flags closed.
        marketing_opt_in: false,
        sms_consent: false,
      });
    }

    // Atomic claim BEFORE inserting. Flip pending_review → committed
    // with committed_at stamped now; the status filter ensures only
    // one caller wins. clients_created is set to 0 here as a
    // placeholder and updated to the real count after the insert
    // batches finish.
    //
    // Why claim with status='committed' (not an intermediate state):
    // the migration's check constraint has no "committing" value, and
    // re-using pending_parse would trip the cron sweep's auto-fail
    // pass. The brief window where status=committed but
    // clients_created=0 is acceptable — the pro can't observe it
    // unless they refresh during the insert (seconds), and the
    // imported_via_id audit trail makes any partial state recoverable.
    const claimedAt = new Date().toISOString();
    const { data: claimed } = await admin
      .from("client_imports")
      .update({
        status: "committed",
        committed_at: claimedAt,
        clients_created: 0,
        // Clear any prior failure metadata in case we're recovering
        // from an earlier failed attempt that's been kept around.
        error_summary: null,
        failed_at: null,
      })
      .eq("id", id)
      .eq("status", "pending_review")
      .select("id");
    if (!claimed || claimed.length === 0) {
      // Lost the race to a concurrent commit (or pro double-clicked).
      // The other request is either in flight or already finished —
      // surface the invalid state and let the caller refresh to see
      // the result.
      return NextResponse.json({ error: "invalid_state" }, { status: 409 });
    }

    // Bulk insert in chunks. PostgREST accepts arrays; supabase-js
    // packs them into a single round trip per chunk.
    let createdTotal = 0;
    for (let i = 0; i < toInsert.length; i += INSERT_BATCH_SIZE) {
      const chunk = toInsert.slice(i, i + INSERT_BATCH_SIZE);
      const { error: insErr, data: inserted } = await admin
        .from("clients")
        .insert(chunk)
        .select("id");
      if (insErr) {
        // Partial-commit is acceptable per PR 3 spec — imported_via_id
        // marks every row that did land, so a manual cleanup query
        // can find them. Roll the audit row to failed and surface a
        // short summary; subsequent retries are blocked because the
        // status is no longer pending_review.
        await markFailed(
          admin,
          id,
          `insert failed at row ${i}: ${insErr.message}`,
          createdTotal,
        );
        return NextResponse.json(
          { error: "insert_failed", message: insErr.message, partial_count: createdTotal },
          { status: 500 },
        );
      }
      createdTotal += inserted?.length ?? chunk.length;
    }

    // Update clients_created to the real count now that all batches
    // finished. Status is already 'committed' from the claim above.
    await admin
      .from("client_imports")
      .update({ clients_created: createdTotal })
      .eq("id", id);

    return NextResponse.json({
      status: "committed",
      clients_created: createdTotal,
      redirect_to: `/dashboard/clients/imports/${id}`,
    });
  } catch (err) {
    console.error("client-imports commit failed:", err);
    await markFailed(
      admin,
      id,
      err instanceof Error ? err.message : "unknown error",
    );
    return NextResponse.json({ error: "commit_failed" }, { status: 500 });
  }
}

async function markFailed(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  summary: string,
  clientsCreated?: number,
) {
  await admin
    .from("client_imports")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
      error_summary: summary.slice(0, 500),
      // Preserve the partial-insert count so the UI can show
      // "imported 312 of 500 before failing" instead of dropping the
      // count. Only set when the caller actually had a partial number
      // to report; otherwise leave undefined so the existing value
      // (typically null) is preserved.
      ...(typeof clientsCreated === "number" ? { clients_created: clientsCreated } : {}),
    })
    .eq("id", id);
}

async function fetchSourceFile(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
): Promise<string> {
  const { data, error } = await admin.storage.from("client-imports").download(path);
  if (error || !data) {
    throw new Error(`source download failed: ${error?.message ?? "no data"}`);
  }
  return await data.text();
}
