-- 045 - Referral signals (Phase 5 UTM parsing)
--
-- Four nullable text columns capturing referral attribution signals
-- on bookings created through the public widget. Independent of
-- booking_source from migration 044 — both stay populated.
--
--   utm_source    — utm_source URL parameter at storefront load
--   utm_medium    — utm_medium URL parameter
--   utm_campaign  — utm_campaign URL parameter
--   referrer_url  — HTTP Referer header at storefront load, with
--                   query string + fragment stripped (hostname +
--                   pathname only, lowercased, capped at 255 chars).
--                   Self-referrals (oyrb.space → oyrb.space) are
--                   filtered to NULL at capture time per industry-
--                   standard analytics convention.
--
-- All values pass through a two-pass sanitizer at write time:
--   Pass 1 — hard reject (→ NULL): contains \n, \r, \0, any other
--            control character, OR pre-truncation length > 2048
--   Pass 2 — normalize: lowercase, trim whitespace, truncate to 255
--
-- Lossy lowercase trade-off: campaign names like "Spring-Promo"
-- become "spring-promo" — case is lost. Normalized lowercase makes
-- aggregation honest (Instagram + instagram + INSTAGRAM bucket
-- together) at the cost of original casing. Acceptable since UTM
-- values are typically lowercase or kebab-case already.
--
-- No backfill. Existing rows stay NULL — analytics classify them as
-- "Unknown" (via the booking_source = 'manual' fallback) or "Direct"
-- (when booking_source = 'public_widget' but all referral columns
-- are NULL — i.e., the booking pre-dates this migration).
--
-- Source attribution priority at display time (documented in
-- src/lib/business-brain.ts):
--   1. utm_source (highest specificity, explicit from URL)
--   2. classified referrer derived from referrer_url
--   3. "Direct" if booking_source = 'public_widget' AND no UTM/referrer
--   4. "Unknown" for legacy or manual bookings

alter table public.bookings
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists referrer_url text;

-- Partial index over UTM-tagged bookings for the UTM Campaigns card.
-- Most bookings have NULL utm_source so the index stays tiny.
create index if not exists idx_bookings_utm_source
  on public.bookings(utm_source)
  where utm_source is not null;
