// Merge logic for the "merge with existing client" duplicate action
// (Phase 7 PR 4). When a pro flags an imported row as `merge`, the
// commit route runs the row through `mergeClientRecord` to produce
// the UPDATE patch that will overwrite the existing client.
//
// Design choices baked in here (per the discovery report §3.8):
//   - `id`, `business_id`, `created_at` always preserved (they're
//     out of the patch entirely — caller updates by id).
//   - `name` uses the longest-string heuristic. Most exports carry
//     "Last, First" or "First Last"; the longer string is usually
//     more complete. Tie → keep existing.
//   - `phone` only fills if existing was null. Never overwrite a
//     pro's curated phone with whatever the export shipped.
//   - `notes` concatenates with a dated separator so the audit trail
//     of where the imported text came from survives in the row.
//
// Pure function: takes two records, returns a partial UPDATE patch
// + a boolean indicating whether the patch is empty (no changes).
// Caller decides whether to issue the UPDATE based on the boolean.

import type { ExistingClientRow } from "@/lib/client-imports/row-parser";
import type { NormalizedRow } from "@/lib/client-imports/row-parser";

/**
 * Patch shape applied to the existing client row at commit time.
 * `imported_via_id` is always present so rollback can attribute the
 * merge to this import (the `clients_merged > 0` rollback guard
 * prevents auto-undo, but the lineage marker is still useful for
 * support's manual cleanup queries).
 */
export type MergePatch = {
  name?: string;
  phone?: string;
  notes?: string;
  imported_via_id: string;
};

/**
 * Build the UPDATE patch for merging `incoming` (a parsed import row)
 * into `existing` (the matching client already in the DB).
 *
 *   - `incoming.name` is required upstream (validation rejects empty
 *     names), so we always have something to compare against.
 *   - `mergedAtIso` is the date stamp embedded in the notes
 *     concatenation; pass `new Date().toISOString().slice(0, 10)`
 *     for the canonical YYYY-MM-DD format.
 *
 * Returns `{ patch, hasChanges }`. The caller uses `hasChanges` to
 * decide whether to skip the UPDATE entirely (no-op merges happen
 * when the imported row carries nothing new).
 */
export function mergeClientRecord(
  existing: ExistingClientRow,
  incoming: NormalizedRow,
  importId: string,
  mergedAtIso: string,
): { patch: MergePatch; hasChanges: boolean } {
  const patch: MergePatch = { imported_via_id: importId };
  let hasChanges = false;

  // Name: longest-string heuristic. Tie keeps existing. Imported
  // name is guaranteed non-null (parse-time validation).
  if (incoming.name && incoming.name.length > existing.name.length) {
    patch.name = incoming.name;
    hasChanges = true;
  }

  // Phone: only fill if existing was null. The pro's curated phone,
  // if present, wins — exports often carry stale or outdated numbers.
  if (incoming.phone && !existing.phone) {
    patch.phone = incoming.phone;
    hasChanges = true;
  }

  // Notes: concatenate with a dated separator. The "[Imported {date}]"
  // marker preserves the audit trail of where the imported text came
  // from inside the row's free-text field, so the pro can later see
  // "this paragraph came from my CSV import" without leaving the
  // client detail page.
  if (incoming.notes) {
    const stamp = `[Imported ${mergedAtIso}]: ${incoming.notes}`;
    patch.notes = existing.notes
      ? `${existing.notes}\n\n${stamp}`
      : stamp;
    hasChanges = true;
  }

  // imported_via_id flip: even if name/phone/notes don't change,
  // we still want to mark the row as touched by this import so the
  // rollback guard (`clients_merged > 0` → refuse) and any future
  // audit query can find it. So `hasChanges` is true if EITHER a
  // value changed OR the existing row wasn't already attributed to
  // this import.
  if (existing.imported_via_id !== importId) {
    hasChanges = true;
  }

  return { patch, hasChanges };
}
