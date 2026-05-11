// Canonical set of `export_type` values written to data_exports. Single
// source of truth — new export variants pick a value from EXPORT_TYPES
// (or extend it). Stored as free text in the DB so the next export
// variant can ship without a migration; the const + the asExportType()
// guard give us type-safety on the write side.
//
// Matches the notification_log.purpose convention from
// lib/notification-purposes.ts. No Zod here — the project doesn't pull
// Zod and a string-union + a const-array narrowing helper is sufficient
// for the one write site we have.

export const EXPORT_TYPES = ["contacts", "bookings", "income"] as const;

export type ExportType = (typeof EXPORT_TYPES)[number];

export function isExportType(value: string): value is ExportType {
  return (EXPORT_TYPES as readonly string[]).includes(value);
}
