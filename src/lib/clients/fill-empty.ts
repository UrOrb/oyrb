// Fill-empty-only helper for the booking flow's "upsert existing client"
// path. Used by the three booking sites (public widget, magic-link
// confirm, dashboard manual entry) so a returning client booking with a
// different name/phone/notes can no longer silently overwrite the pro's
// curated record.
//
// Mirrors the spirit of mergeClientRecord (src/lib/client-imports/merge.ts)
// for the simpler "incoming form data" case: only fill values that are
// missing on the existing row, never overwrite anything the pro has
// already curated.
//
// Pure function. Caller normalizes phone (via normalizeToE164) before
// passing in if it wants string-equality comparisons to be stable across
// formats — the helper itself doesn't know about phone formats.

/**
 * Existing client values relevant to the fill-empty decision. Caller
 * passes whatever subset it has from the DB; missing entries treated
 * as null.
 */
export type ClientFillExisting = {
  name?: string | null;
  phone?: string | null;
  notes?: string | null;
};

/**
 * Incoming form values from the booking flow. Caller passes whatever
 * the form provided; undefined means "not part of this submission" and
 * is skipped entirely.
 */
export type ClientFillIncoming = {
  name?: string | null;
  phone?: string | null;
  notes?: string | null;
};

/**
 * Return shape:
 *   - `patch`      — keys to spread into the .update() call. Only
 *                    contains fields where existing was empty AND
 *                    incoming had a value to fill with. Empty object
 *                    means "issue no UPDATE for these fields".
 *   - `suppressed` — fields where existing already had a value AND
 *                    incoming was different. Used by the dashboard
 *                    manual-booking form to surface a "this client's
 *                    phone is on file as X — edit the client to
 *                    change it" inline notice. Public booking sites
 *                    ignore this side of the return.
 */
export type ClientFillResult = {
  patch: { name?: string; phone?: string; notes?: string };
  suppressed: {
    name?: { existing: string; incoming: string };
    phone?: { existing: string; incoming: string };
    notes?: { existing: string; incoming: string };
  };
};

const isNonEmpty = (v: string | null | undefined): v is string =>
  typeof v === "string" && v.trim().length > 0;

/**
 * Compute the fill-empty patch for one field. Returns:
 *   - `{ patch: incoming }` if existing is empty and incoming is non-empty
 *   - `{ suppressed: { existing, incoming } }` if both are non-empty and
 *     differ (pro has curated a value; incoming is different)
 *   - `{}` otherwise (both empty, both equal, or incoming missing)
 */
function fillOne(
  existing: string | null | undefined,
  incoming: string | null | undefined,
):
  | { patch: string }
  | { suppressed: { existing: string; incoming: string } }
  | Record<string, never> {
  if (!isNonEmpty(incoming)) return {};
  if (!isNonEmpty(existing)) return { patch: incoming.trim() };
  if (existing.trim() === incoming.trim()) return {};
  return { suppressed: { existing: existing.trim(), incoming: incoming.trim() } };
}

/**
 * Build the UPDATE patch (and the suppressed-fields summary) for a
 * returning-client booking. The returned `patch` object is safe to
 * spread directly into supabase `.update({...})` — when there are no
 * fill-empty fields the patch is empty and the caller can skip the
 * update entirely.
 *
 * Consent fields (sms_consent, marketing_opt_in, etc.) are NOT touched
 * by this helper. Callers handle those separately via `consentFields`
 * objects, mirroring the existing booking-flow pattern.
 */
export function fillEmptyClientFields(
  existing: ClientFillExisting,
  incoming: ClientFillIncoming,
): ClientFillResult {
  const result: ClientFillResult = { patch: {}, suppressed: {} };

  for (const field of ["name", "phone", "notes"] as const) {
    const decision = fillOne(existing[field], incoming[field]);
    if ("patch" in decision) result.patch[field] = decision.patch;
    else if ("suppressed" in decision) result.suppressed[field] = decision.suppressed;
  }

  return result;
}
