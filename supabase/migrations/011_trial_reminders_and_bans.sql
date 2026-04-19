-- Idempotency table for trial reminder emails.
-- One row per (subscription, reminder type) — the unique constraint is the
-- whole guarantee. The reminder cron checks this before sending and inserts
-- after a successful send.
create table if not exists trial_reminders_sent (
  id uuid primary key default gen_random_uuid(),
  stripe_subscription_id text not null,
  reminder_type text not null check (reminder_type in ('7_day','3_day','1_day')),
  sent_at timestamptz default now(),
  unique (stripe_subscription_id, reminder_type)
);

-- Audit log for the auto-ban detector. Every run captures stats so we can
-- monitor in production and debug quietly-failing schedules. Errors are
-- recorded but don't stop the next run.
create table if not exists trial_ban_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz default now(),
  attempts_scanned int not null default 0,
  bans_created int not null default 0,
  duration_ms int,
  error text
);

-- Augment trial_ban_list with the audit-trail fields the detector + admin
-- override need. `trigger_reason` is a short tag ("duplicate_phone",
-- "duplicate_email", "device_fingerprint_threshold", "manual"); the
-- triggering attempt ids let support look back at exactly which audit rows
-- caused the ban when a user disputes.
alter table trial_ban_list
  add column if not exists trigger_reason text,
  add column if not exists triggering_attempt_ids uuid[];
