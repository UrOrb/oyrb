-- ═════════════════════════════════════════════════════════════════════════
-- 023 — Booking scheduling controls + gift cards
--
-- Two independent additions, same migration for deploy atomicity:
--   1. Booking rule columns on businesses — interval / cutoff / break /
--      daily block array. Defaults preserve current behavior (no rule
--      change for existing pros).
--   2. gift_cards table + index, used by the public /s/[slug]/gift-cards
--      purchase flow. Codes are unique strings generated at purchase
--      time; `redeemed_at` is nullable (Phase 1 tracks purchase only).
-- ═════════════════════════════════════════════════════════════════════════

-- ── 1. Booking rules on businesses ────────────────────────────────────
alter table public.businesses
  add column if not exists booking_interval_minutes integer not null default 30
    check (booking_interval_minutes in (15, 30, 45, 60, 120)),
  add column if not exists allow_last_minute_booking boolean not null default true,
  add column if not exists last_minute_cutoff_hours integer not null default 2
    check (last_minute_cutoff_hours in (1, 2, 4, 8, 12, 24, 48)),
  add column if not exists break_between_appointments_minutes integer not null default 15
    check (break_between_appointments_minutes in (0, 5, 10, 15, 20, 30, 45, 60)),
  -- daily_break_blocks is a JSON array of {start:"HH:MM", end:"HH:MM", days:["mon",…]}
  -- Shape validated in application code — storing as jsonb gives us the
  -- flexibility pros need (multiple lunch/break windows per day).
  add column if not exists daily_break_blocks jsonb not null default '[]'::jsonb;


-- ── 2. gift_cards table ───────────────────────────────────────────────
create table if not exists public.gift_cards (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique,
  pro_user_id           uuid not null references auth.users(id) on delete cascade,
  business_id           uuid not null references public.businesses(id) on delete cascade,
  amount_cents          integer not null check (amount_cents >= 500), -- Stripe min
  purchased_by_email    text not null,
  purchased_by_name     text,
  recipient_email       text,                   -- for Phase 2 gift-to-another
  recipient_name        text,
  message               text,                   -- optional note from buyer
  stripe_session_id     text unique,            -- webhook idempotency
  stripe_payment_intent_id text,
  purchased_at          timestamptz not null default now(),
  redeemed_at           timestamptz,
  redeemed_booking_id   uuid references public.bookings(id) on delete set null
);

create index if not exists idx_gift_cards_pro
  on public.gift_cards (pro_user_id, purchased_at desc);

create index if not exists idx_gift_cards_buyer
  on public.gift_cards (lower(purchased_by_email), purchased_at desc);

create index if not exists idx_gift_cards_unredeemed
  on public.gift_cards (code)
  where redeemed_at is null;

-- RLS: service role owns all writes (via webhook + purchase route). The
-- pro can read their own issued gift cards to see sales.
alter table public.gift_cards enable row level security;

drop policy if exists "pro reads own gift cards" on public.gift_cards;
create policy "pro reads own gift cards"
  on public.gift_cards for select
  using (auth.uid() = pro_user_id);
