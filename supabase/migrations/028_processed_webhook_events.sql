-- Stripe webhook idempotency ledger. Stripe re-delivers events on any
-- non-2xx response, so a flaky handler can fire the same event_id multiple
-- times. We treat the event_id as a primary key here — duplicate inserts
-- raise a unique-violation, which the helper turns into a no-op.
--
-- Status field tracks the outcome:
--   pending — row inserted, handler still running (or crashed mid-run)
--   success — handler completed without throwing
--   failed  — handler threw; Stripe will retry; the retry will see the
--             existing row, see status='failed', and re-attempt processing
create table if not exists public.processed_webhook_events (
  event_id      text primary key,
  event_type    text not null,
  processed_at  timestamptz not null default now(),
  status        text not null default 'pending'
                check (status in ('pending','success','failed')),
  payload       jsonb,
  error_message text
);

create index if not exists idx_processed_events_type
  on public.processed_webhook_events(event_type);
create index if not exists idx_processed_events_processed_at
  on public.processed_webhook_events(processed_at);

-- The webhook handler runs as the service role (bypasses RLS), but we still
-- enable RLS so anon/auth roles can never read or write through PostgREST.
alter table public.processed_webhook_events enable row level security;
