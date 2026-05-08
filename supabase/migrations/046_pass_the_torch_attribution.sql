-- 046 - Pass the Torch attribution persistence (Phase 5 closer)
--
-- Single new nullable FK column on bookings. Captures which other
-- OYRB business referred this booking via the ?ref=<slug> URL flow.
-- Closes the gap identified in PRs #33 and #35: referrer_slug was
-- captured at booking time and used for email composition + Stripe
-- metadata, but never persisted on the booking row, so analytics
-- couldn't surface "% of bookings from Trusted Pros referrals."
--
-- ON DELETE SET NULL: if a referring pro deletes their account, the
-- booking row stays intact but loses attribution. Acceptable
-- trade-off — historical analytics may show fewer Pass the Torch
-- numbers retroactively after a pro leaves the platform, but
-- orphaning a booking row would be worse.
--
-- Persistence vs. email display — important distinction:
--   - PERSISTENCE captures historical fact. The pre-insert lookup
--     resolves the referrer slug regardless of the referring pro's
--     current is_published state. A referral that happened, happened.
--   - EMAIL DISPLAY keeps the existing is_published gate (a paused
--     pro shouldn't be named in fresh confirmation emails).
-- Two intentionally different concerns. Code comments at the insert
-- sites flag this so future maintainers don't accidentally collapse
-- them.
--
-- Self-referral guard: a pro cannot refer themselves. Resolved at
-- insert time by comparing resolved business.id to the booking's
-- business.id. If equal, persisted as NULL.
--
-- No backfill — historical bookings stay NULL since we never had
-- this data. NULL means "we don't know" — analytics gracefully
-- classifies as the next-priority signal (UTM, referrer URL, etc.)
-- per the 5-tier source attribution chain in business-brain.ts.

alter table public.bookings
  add column if not exists referrer_business_id uuid
    references public.businesses(id) on delete set null;

-- Partial index — most bookings have NULL referrer_business_id so the
-- index stays small and the analytics queries (which filter to
-- referrer_business_id IS NOT NULL) hit it efficiently.
create index if not exists idx_bookings_referrer_business_id
  on public.bookings(referrer_business_id)
  where referrer_business_id is not null;
