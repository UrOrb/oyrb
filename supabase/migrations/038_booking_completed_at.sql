-- 038 - bookings.completed_at audit column
--
-- Companion to the auto-complete cron at /api/cron/auto-complete-bookings.
-- The cron flips confirmed → completed for bookings whose end_at is at
-- least four hours in the past; completed_at records WHEN the cron fired
-- vs WHEN the booking was originally scheduled to end (end_at).
--
-- Why this column exists separately from end_at: bookings have no
-- updated_at, so without completed_at the only signal that the status
-- flipped is the status value itself — no when. Useful for analytics
-- later ("on average we mark bookings complete X hours after their
-- scheduled end") and for distinguishing future pro-initiated
-- completion (manual "Mark complete" action — not in this PR) from
-- cron-initiated completion via the timestamp pattern.

alter table public.bookings
  add column if not exists completed_at timestamptz;
