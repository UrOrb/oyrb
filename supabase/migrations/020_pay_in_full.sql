-- ═════════════════════════════════════════════════════════════════════════
-- 020 — Pay-in-full tracking on bookings
--
-- The existing deposit_paid + stripe_payment_intent_id columns track only
-- the deposit half. This adds parallel fields for the pre-appointment
-- "pay the rest now" flow kicked off from the confirmation email:
--   · paid_in_full_at    — timestamp when the balance was collected
--   · paid_amount_cents  — actual cents captured (balance, not price_cents)
--   · pay_now_session_id — idempotency key so webhook retries can't
--                          double-charge or double-mark as paid
-- ═════════════════════════════════════════════════════════════════════════

alter table public.bookings
  add column if not exists paid_in_full_at   timestamptz,
  add column if not exists paid_amount_cents integer,
  add column if not exists pay_now_session_id text;

-- Cheap existence index for the webhook idempotency lookup.
create index if not exists idx_bookings_pay_now_session
  on public.bookings (pay_now_session_id)
  where pay_now_session_id is not null;
