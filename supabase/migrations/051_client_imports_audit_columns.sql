-- 051 - Client imports audit columns (Phase 7 PR 3 of 5 — commit + rollback)
--
-- The commit/rollback/cron-sweep routes shipping in PR 3 need a few
-- audit fields on client_imports that PR #46's foundation didn't
-- include. Splitting them into their own migration (rather than
-- amending 049) keeps the deploy story honest: 049 ran first and
-- has been live since PR #46 — this is the strict additive follow-up.
--
--   clients_created — populated by /commit. Number of rows inserted
--     into public.clients at commit time. Drives the "47 imported"
--     badge on the imports list page so we don't have to recount via
--     `select count(*) where imported_via_id = X` on every render.
--
--   clients_deleted — populated by /rollback. Number of rows deleted
--     during a successful rollback. Surfaces in the "Rolled back"
--     state copy so the pro can tell at a glance how much got undone.
--
--   error_summary — populated by /commit (on failure) and the cron
--     sweep (on auto-fail of stuck pending_parse rows). Free text,
--     short, surfaced to the pro in the "Failed" state copy. Different
--     from the existing `errors` jsonb (which carries per-row parse
--     errors) — this is the route-level "why we couldn't finish"
--     message.
--
--   failed_at — sibling timestamp to committed_at / rolled_back_at /
--     cancelled_at. Captures when the row entered the failed terminal
--     state. Lets the cron sweep distinguish "auto-failed today" from
--     "auto-failed last week" without parsing error_summary.
--
-- All four are nullable / NOT NULL not enforced — null means "this
-- transition hasn't happened (yet)". Idempotent on rerun via
-- `add column if not exists`.

alter table public.client_imports
  add column if not exists clients_created int,
  add column if not exists clients_deleted int,
  add column if not exists error_summary   text,
  add column if not exists failed_at       timestamptz;
