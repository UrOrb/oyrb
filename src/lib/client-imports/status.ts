// Canonical set of `status` values written to public.client_imports.
// Single source of truth — the DB check constraint at migration 049
// references these exact strings. Adding a new status requires both
// updating this const AND writing a migration that alters the check
// constraint to include the new value.
//
// Stored as free text in the DB so a future status can ship via a
// straightforward `alter table ... drop constraint ... add constraint`
// migration without a column rewrite. Mirrors the
// notification_log.purpose / KNOWN_PURPOSES convention from
// src/lib/notification-purposes.ts.

export const IMPORT_STATUS_VALUES = [
  "pending_upload",
  "pending_parse",
  "pending_review",
  "committed",
  "cancelled",
  "rolled_back",
  "failed",
] as const;

export type ImportStatus = (typeof IMPORT_STATUS_VALUES)[number];
