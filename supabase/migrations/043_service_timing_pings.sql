-- 043 - Service timing pings (Phase 3)
--
-- Two pro-tapped real-world signals about the actual service event:
--
--   service_started_at  — when the pro tapped "Start service" (client
--                         arrived, service began).
--   service_ended_at    — when the pro tapped "Stop service" (service
--                         finished). Only writable AFTER
--                         service_started_at is set.
--
-- Phase 3 is opt-in usage, not enforced. Pros who skip the buttons
-- leave both columns NULL — Phase 4's analytics will treat that as
-- "missing data" and exclude those bookings from duration metrics.
--
-- Naming note (important): this column is `service_ended_at`, not
-- `service_completed_at`. We intentionally avoided the latter because
-- migration 038 already added a `completed_at` column for the
-- auto-complete cron's bookkeeping stamp — having a second column
-- whose name was one underscore away would be a footgun. The
-- semantics of these two timestamps are different:
--
--   bookings.completed_at         (PR #21 / migration 038)
--     SET BY  : the auto-complete cron at /api/cron/auto-complete-bookings
--     MEANING : when the SYSTEM marked the row's status='completed'
--               (4-hour buffer after end_at). Bookkeeping.
--
--   bookings.service_ended_at     (this migration)
--     SET BY  : the pro tapping "Stop service" on the booking detail page
--     MEANING : when the SERVICE actually ended (real-world signal).
--               Independent of the row's status.
--
-- Auto-complete cron is unchanged. It still flips status='completed'
-- and stamps `completed_at` purely on `end_at + 4h`. service_ended_at
-- stays NULL on bookings the pro never tapped Stop on, even after
-- auto-completion fires.

alter table public.bookings
  add column if not exists service_started_at timestamptz,
  add column if not exists service_ended_at   timestamptz;

-- Partial index for future analytics queries (Phase 4 will join on
-- this; index keeps the scan tight). NULL rows aren't indexed.
create index if not exists idx_bookings_service_started_at
  on public.bookings(service_started_at)
  where service_started_at is not null;
