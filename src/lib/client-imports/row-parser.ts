// Row-normalization helpers shared between the parse route (PR #49)
// and the commit route (PR 3). Keeping these in one module guarantees
// that the preview a pro reviews and the rows that actually land in
// public.clients pass through identical validation + normalization —
// no risk of drift introducing "the preview said valid, the commit
// rejected it" surprises.
//
// All helpers here are pure (or pure-ish — `loadExistingContacts`
// hits the DB but is read-only). They never write to client_imports
// or clients; route handlers own that orchestration.

import { normalizeToE164 } from "@/lib/sms";
import type {
  ImportColumnMapping,
} from "@/lib/client-imports/types";
import type { createAdminClient } from "@/lib/supabase/server";

export type ParsedRow = Record<string, string | undefined>;

export type NormalizedRow = {
  row_index: number;
  status: "valid" | "duplicate" | "error";
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  errors?: string[];
};

/**
 * Apply a column mapping to a raw CSV row, normalize the values, and
 * run validation. Returns a `NormalizedRow` with status="valid" by
 * default; the caller flips to "duplicate" or "error" based on the
 * dedup pass.
 *
 * Multiple columns mapped to "name" are concatenated with a space in
 * iteration order (this is how Acuity's First Name + Last Name end up
 * as a single OYRB record). Email is lowercased; phone is normalized
 * to E.164 via the shared sms helper.
 */
export function normalizeRow(
  raw: ParsedRow,
  mapping: ImportColumnMapping,
  rowIndex: number,
): NormalizedRow {
  const nameParts: string[] = [];
  let email: string | null = null;
  let phoneRaw: string | null = null;
  let notes: string | null = null;

  for (const [header, target] of Object.entries(mapping)) {
    const value = (raw[header] ?? "").toString().trim();
    if (!value) continue;
    switch (target) {
      case "name":
        nameParts.push(value);
        break;
      case "email":
        if (!email) email = value.toLowerCase();
        break;
      case "phone":
        if (!phoneRaw) phoneRaw = value;
        break;
      case "notes":
        if (!notes) notes = value;
        break;
      case "ignore":
        break;
    }
  }

  const name = nameParts.length > 0 ? nameParts.join(" ").trim() : null;
  const phone = phoneRaw ? normalizeToE164(phoneRaw) : null;

  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (!email && !phone) {
    errors.push("Either email or phone is required.");
  }
  if (phoneRaw && !phone) {
    errors.push("Phone number could not be normalized.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Email address is malformed.");
    email = null;
  }

  return {
    row_index: rowIndex,
    status: "valid",
    name,
    email,
    phone,
    notes,
    ...(errors.length > 0 ? { errors } : {}),
  };
}

/**
 * Lightweight bucketing so structured `errors[]` entries point at the
 * field the pro should look at, instead of collapsing every error
 * into "row-level" and forcing the UI to grep messages.
 */
export function classifyErrorField(message: string): string {
  const lower = message.toLowerCase();
  if (lower.startsWith("name")) return "name";
  if (lower.includes("email")) return "email";
  if (lower.includes("phone")) return "phone";
  return "row";
}

/**
 * Existing client row shape returned by loadExistingContacts. Carries
 * everything the merge step needs (id, name, phone, notes, plus the
 * audit columns the commit route writes back). Wider than parse-only
 * dedup needs, but the cost is small (~10k rows max per business)
 * and centralizing it here keeps parse and commit reading identical
 * data.
 */
export type ExistingClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  imported_via_id: string | null;
};

/**
 * Indexed view of every existing client for a business. Maps from
 * dedup keys (lowercased email + E.164-normalized phone) to the full
 * row, so:
 *
 *   - Parse / commit dedup checks use `byEmail.has(...)` /
 *     `byPhone.has(...)` for O(1) presence detection
 *   - Commit's merge action uses `byEmail.get(...)` /
 *     `byPhone.get(...)` to reach the existing row's full shape
 *     without a second round trip
 *
 * Both Maps reference the same row objects — checking either index
 * surfaces the same client. Mutating the returned objects is fine
 * (commit does this when staging merge updates) but no caller should
 * rely on map identity for invariants.
 */
export type ExistingClientIndex = {
  byEmail: Map<string, ExistingClientRow>;
  byPhone: Map<string, ExistingClientRow>;
};

/**
 * Single round-trip read of every existing client for a business,
 * indexed by both email (lowercased) and phone (E.164). Phones are
 * normalized on read so they compare on the same shape we use during
 * parse/commit.
 *
 * Caller is responsible for using a privileged client (admin or
 * RLS-allowed) — this helper just runs the query.
 */
export async function loadExistingContacts(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
): Promise<ExistingClientIndex> {
  const { data } = await admin
    .from("clients")
    .select("id, name, email, phone, notes, imported_via_id")
    .eq("business_id", businessId);
  const byEmail = new Map<string, ExistingClientRow>();
  const byPhone = new Map<string, ExistingClientRow>();
  for (const r of (data ?? []) as ExistingClientRow[]) {
    if (r.email) byEmail.set(r.email.toLowerCase(), r);
    if (r.phone) {
      const norm = normalizeToE164(r.phone);
      if (norm) byPhone.set(norm, r);
    }
  }
  return { byEmail, byPhone };
}
