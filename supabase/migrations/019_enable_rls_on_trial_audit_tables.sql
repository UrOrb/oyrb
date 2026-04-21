-- ═════════════════════════════════════════════════════════════════════════
-- 019 — Enable RLS on trial audit tables
--
-- The linter flagged trial_reminders_sent (idempotency log for trial
-- reminder emails) and trial_ban_runs (audit log for the auto-ban
-- detector) as public tables without RLS enabled.
--
-- Both are only touched by server code via the service-role admin
-- client — trial-emails.ts does the reminder idempotency check/insert,
-- cron/trial-bans writes run stats, and the admin dashboard page reads
-- the run history. Service role bypasses RLS, so enabling RLS with no
-- policies locks out anon/authenticated (closing the PostgREST hole
-- the linter cares about) without breaking any app functionality.
-- ═════════════════════════════════════════════════════════════════════════

alter table public.trial_reminders_sent enable row level security;
alter table public.trial_ban_runs       enable row level security;
