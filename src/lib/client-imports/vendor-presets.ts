// Vendor presets for CSV imports from competitor platforms. When a
// pro uploads a CSV, the parse route looks at the header row and tries
// to match it against one of these presets. A confident match (≥2
// expected headers present, case-insensitive) auto-fills the column
// mapping; otherwise the pro maps columns manually (PR 4 — for now we
// just surface the unknown-format warning and a read-only mapping).
//
// Adding a new vendor:
//   1. Add a new entry to VENDOR_PRESETS below
//   2. Add a numbered export-instructions tab in
//      src/app/dashboard/clients/imports/new/page.tsx
//   3. (Optional) bump the detection threshold if the new vendor
//      shares header names with an existing one
//
// Header strings here are best-guess based on real exports we've seen.
// Mark them as fuzzy — vendors change export columns without notice,
// so the auto-detector is a convenience, not a contract.

import type { ImportTargetField, ImportColumnMapping } from "@/lib/client-imports/types";

/**
 * Canonical vendor identifier. Persisted to client_imports.vendor_hint
 * (free text). Adding a new value here doesn't require a migration —
 * the DB column is intentionally untyped, mirroring the
 * notification_log.purpose convention.
 */
export const VENDOR_IDS = ["acuity", "glossgenius", "booksy", "stylesheat"] as const;
export type VendorId = (typeof VENDOR_IDS)[number];

export type VendorPreset = {
  id: VendorId;
  label: string;
  /**
   * Source CSV header (case-insensitive match) → OYRB target field.
   *
   * Multiple columns mapped to "name" are concatenated with a space at
   * parse time (in declaration order). This is how Acuity's separate
   * "First Name" + "Last Name" columns become a single OYRB `name`
   * value without needing a sentinel field type.
   */
  headerMap: Record<string, ImportTargetField>;
};

export const VENDOR_PRESETS: VendorPreset[] = [
  {
    id: "acuity",
    // Acuity exports name as two separate columns. Both map to "name";
    // the parser concatenates them in iteration order so the OYRB
    // record reads "First Last".
    label: "Acuity",
    headerMap: {
      "First Name": "name",
      "Last Name": "name",
      "Email": "email",
      "Phone": "phone",
      "Notes": "notes",
    },
  },
  {
    id: "glossgenius",
    label: "GlossGenius",
    headerMap: {
      "Client Name": "name",
      "Email": "email",
      "Phone Number": "phone",
      "Client Notes": "notes",
    },
  },
  {
    id: "booksy",
    label: "Booksy",
    headerMap: {
      "Customer Name": "name",
      "Email Address": "email",
      "Phone": "phone",
      "Note": "notes",
    },
  },
  {
    id: "stylesheat",
    label: "StyleSeat",
    headerMap: {
      "Name": "name",
      "Email": "email",
      "Phone Number": "phone",
      "Note": "notes",
    },
  },
];

export type VendorHint = {
  id: VendorId;
  label: string;
  /** Number of expected headers we matched in the source CSV — surfaced in the UI. */
  matchedColumns: number;
};

const DETECT_THRESHOLD = 2;

/**
 * Inspect the parsed CSV header row and pick the best-matching vendor.
 * Returns null when nothing matches confidently — the pro maps columns
 * manually in that case.
 *
 * Match rules:
 *   - case-insensitive on header names (vendors capitalize inconsistently)
 *   - ≥2 expected headers present → confident match
 *   - tie-break: highest count wins; further tie → first preset declared
 */
export function detectVendor(headers: string[]): VendorHint | null {
  const normalized = new Set(headers.map((h) => h.trim().toLowerCase()));

  let best: VendorHint | null = null;
  for (const preset of VENDOR_PRESETS) {
    let matched = 0;
    for (const expected of Object.keys(preset.headerMap)) {
      if (normalized.has(expected.toLowerCase())) matched += 1;
    }
    if (matched >= DETECT_THRESHOLD && (!best || matched > best.matchedColumns)) {
      best = { id: preset.id, label: preset.label, matchedColumns: matched };
    }
  }
  return best;
}

/**
 * Build the persistable column_mapping for a detected vendor. The map
 * goes source-CSV-header → OYRB target field, exactly mirroring the
 * preset's headerMap but keyed off the actual headers found in the CSV
 * (case-insensitive). Headers absent from the preset get mapped to
 * "ignore" so the pro sees every column accounted for in the preview.
 */
export function buildInitialMapping(
  vendorId: VendorId,
  csvHeaders: string[],
): ImportColumnMapping {
  const preset = VENDOR_PRESETS.find((p) => p.id === vendorId);
  if (!preset) return {};

  const lowerToTarget = new Map<string, ImportTargetField>();
  for (const [header, target] of Object.entries(preset.headerMap)) {
    lowerToTarget.set(header.toLowerCase(), target);
  }

  const mapping: ImportColumnMapping = {};
  for (const header of csvHeaders) {
    const trimmed = header.trim();
    if (!trimmed) continue;
    mapping[trimmed] = lowerToTarget.get(trimmed.toLowerCase()) ?? "ignore";
  }
  return mapping;
}
