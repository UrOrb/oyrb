// Shared types for the Phase 7 client-import pipeline. Consumed by
// the upload, parse, preview, commit, and rollback routes shipping in
// PRs 2–5. Kept narrow on purpose — only what subsequent PRs will
// actually consume; speculation about future fields is deliberately
// out of scope.

import type { ImportStatus } from "@/lib/client-imports/status";

/**
 * Canonical OYRB fields a CSV column can be mapped to.
 *   - `name`  → clients.name (the only non-null required field)
 *   - `email` → clients.email (lowercased + trimmed at parse time)
 *   - `phone` → clients.phone (normalized to E.164 via src/lib/sms.ts)
 *   - `notes` → clients.notes (free text, no normalization)
 *   - `ignore` → column dropped from the import
 *
 * Future fields (loyalty visit_count, birthday, etc.) are deferred
 * until v1.1 per the discovery report.
 */
export type ImportTargetField = "name" | "email" | "phone" | "notes" | "ignore";

/**
 * Map of source-CSV header → OYRB target field. Set at parse time
 * via header auto-detection + vendor presets, overridable by the pro
 * before commit. Persisted to client_imports.column_mapping (jsonb).
 */
export type ImportColumnMapping = Record<string, ImportTargetField>;

/**
 * Per-row state captured at parse time and rendered in the preview UI.
 *   - `valid`     → row passed validation; will be inserted on commit
 *   - `duplicate` → matched an existing client by email or phone;
 *                   default action is skip, pro can override
 *   - `error`     → row failed validation (no name, malformed email,
 *                   etc.); will be skipped on commit
 *
 * Persisted as one entry of client_imports.preview_data (jsonb array,
 * truncated to ≤50 rows for UI bounds). The full row set lives in
 * the source file in storage until commit time.
 */
export type ImportPreviewRow = {
  row_index: number;
  status: "valid" | "duplicate" | "error";
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  errors?: string[];
};

/**
 * Per-row error captured at parse time and surfaced to the pro in
 * the review UI. Persisted as one entry of client_imports.errors
 * (jsonb array). `field` references the OYRB target field, not the
 * source CSV header.
 */
export type ImportError = {
  row_index: number;
  field: string;
  message: string;
};

/**
 * Row shape returned by Supabase queries against public.client_imports.
 * Timestamps come back as ISO strings; uuids as strings; jsonb columns
 * as the typed shapes above. Nullable columns mirror the migration's
 * NOT NULL declarations.
 */
export type ClientImport = {
  id: string;
  business_id: string;
  initiated_by_user_id: string;
  source_filename: string;
  source_path: string | null;
  source_mime: string | null;
  source_size_bytes: number | null;
  vendor_hint: string | null;
  status: ImportStatus;
  column_mapping: ImportColumnMapping | null;
  total_rows: number | null;
  valid_rows: number | null;
  duplicate_rows: number | null;
  error_rows: number | null;
  preview_data: ImportPreviewRow[] | null;
  errors: ImportError[] | null;
  consent_affirmed: boolean;
  created_at: string;
  parsed_at: string | null;
  committed_at: string | null;
  rolled_back_at: string | null;
  cancelled_at: string | null;
};
