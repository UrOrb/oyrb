-- 059 — Influencer / creator attribution MVP
--
-- Captures an optional creator code from storefront URL parameters
-- (?ref=, ?creator=, ?influencer=) and stores it on bookings. Nullable by
-- design: bookings without explicit creator attribution remain unchanged.

alter table public.bookings
  add column if not exists influencer_code text;

create index if not exists idx_bookings_influencer_code
  on public.bookings(influencer_code)
  where influencer_code is not null;

comment on column public.bookings.influencer_code is
  'Optional sanitized creator/influencer attribution code captured from storefront URL params.';
