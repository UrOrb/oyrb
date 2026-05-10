-- 052 - Client imports `clients_merged` audit column (Phase 7 PR 4 of 5)
--
-- PR 4 introduces per-row duplicate-handling actions: pros can mark
-- a flagged duplicate as "skip" (default, current behavior), "merge"
-- (combine with the existing client record), or "create_anyway"
-- (insert a new row alongside the existing one).
--
-- The commit route already counts inserts via clients_created
-- (migration 051). Merge writes are a different operation — UPDATEs
-- against existing rows, not INSERTs — so they need their own
-- counter:
--
--   clients_merged — populated by /commit when at least one
--     duplicate row had its action set to "merge" before commit.
--     Drives:
--       a) The committed-state banner ("X imported, Y merged")
--       b) The rollback guard — rollback refuses with 409
--          { error: "rollback_blocked_merges_present" } when
--          clients_merged > 0, since we don't snapshot pre-merge
--          state and undoing an UPDATE is materially different from
--          undoing an INSERT.
--
-- Idempotent additive migration; same shape as 051. Manual
-- post-merge run via Supabase SQL Editor required.

alter table public.client_imports
  add column if not exists clients_merged int;
