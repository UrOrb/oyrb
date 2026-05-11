import Papa from "papaparse";

/**
 * Shared CSV serialization for every export under
 * src/lib/exports/*. Centralizes the two non-obvious decisions that
 * every export has to get right:
 *
 *   1. UTF-8 BOM (﻿) prepended so Excel auto-detects encoding.
 *      Without it, Windows Excel reads the file as Windows-1252 and
 *      mangles non-ASCII names. macOS Numbers, Google Sheets, and
 *      LibreOffice all detect with or without the BOM.
 *
 *   2. Papa.unparse object form ({ fields, data }) — NOT the array
 *      form. The array form short-circuits to serialize(null, [], …)
 *      on empty input and skips the header entirely (papaparse.js:307).
 *      The object form goes through the fields-aware branch and
 *      always emits the header. Verified by PR #56's zero-row fix
 *      (commit 4c9d11b). Locks column order even when row keys are
 *      added/reordered in the caller.
 *
 * Pure function. Takes the column list and the row objects; returns
 * the serialized CSV plus row count + byte size for the data_exports
 * audit row.
 *
 * Extracted at N=3 (contacts, bookings, income) per PR #56's
 * deferred-extraction plan — N=2 would have been premature
 * abstraction. Callers stay free to compose their own per-row
 * objects; this helper only owns the BOM + serialization concern.
 */

export type CsvOutput = {
  csv: string;
  rowCount: number;
  byteSize: number;
};

export function formatCsvWithBom<T extends Record<string, unknown>>(
  fields: readonly string[],
  rows: T[],
): CsvOutput {
  const csvBody = Papa.unparse({
    fields: fields as unknown as string[],
    data: rows,
  });
  const csv = "﻿" + csvBody;
  const byteSize = Buffer.byteLength(csv, "utf8");
  return { csv, rowCount: rows.length, byteSize };
}
