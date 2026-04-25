-- ═════════════════════════════════════════════════════════════════════════
-- 030 — Connect-mode webhook event log
--
-- Stripe delivers two kinds of webhooks:
--   1. Platform events — about OYRB's own account (subscriptions, the
--      tier checkout flow). Already idempotency-tracked in
--      processed_webhook_events (migration 028).
--   2. Connect events — about a connected pro's account (account.updated
--      when KYC progresses, payment_intent.succeeded when their client
--      pays them, charge.dispute.created, etc.). These carry an
--      `event.account` field with the acct_… that originated the event.
--
-- This table logs Connect events so we can:
--   - Forensically debug a specific pro's payment flow
--   - Confirm idempotency (re-delivered events are no-ops)
--   - Inspect raw payloads when a pro asks "where did my money go"
-- ═════════════════════════════════════════════════════════════════════════

create table if not exists public.stripe_connect_events (
  -- Stripe's evt_… is globally unique. Using it as the PK makes
  -- idempotency a uniqueness violation we can catch and ignore.
  event_id          text primary key,
  event_type        text not null,
  -- The connected account this event is about (event.account from Stripe).
  -- NOT a foreign key to businesses — Stripe may deliver events for
  -- accounts we've already deleted/disconnected and we still want to log them.
  account_id        text not null,
  -- Denormalized FK for fast lookup. Nullable because if a pro disconnects
  -- and we set businesses.stripe_connect_account_id = NULL, future events
  -- for their old account_id won't resolve to a row but should still log.
  business_id       uuid references public.businesses(id) on delete set null,
  payload           jsonb not null,
  status            text not null default 'pending'
                    check (status in ('pending','success','failed')),
  error_message     text,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz
);

create index if not exists stripe_connect_events_account_idx
  on public.stripe_connect_events (account_id);
create index if not exists stripe_connect_events_type_idx
  on public.stripe_connect_events (event_type);
create index if not exists stripe_connect_events_received_idx
  on public.stripe_connect_events (received_at desc);

-- Service-role-only writes/reads. The webhook handler runs as service role
-- (bypasses RLS); we still enable RLS so the anon and authenticated roles
-- can never read raw Stripe payloads via PostgREST.
alter table public.stripe_connect_events enable row level security;
