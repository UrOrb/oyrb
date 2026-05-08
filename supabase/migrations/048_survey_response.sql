-- 048 - Survey response (Phase 5 closer — last referral-foundation gap)
--
-- Single nullable text column. Captures the client's self-reported
-- answer to the booking widget's optional "How did you hear about
-- us?" dropdown. Storage format: lowercase enum codes (matches
-- PR #35's utm_source convention) — display labels are looked up
-- from src/lib/survey-options.ts at render time.
--
-- Allowlist (validated at write time in both
-- /api/public/bookings/route.ts and confirm/route.ts):
--   instagram, tiktok, word_of_mouth, google_search, walked_by,
--   other, prefer_not_to_say
--
-- Anything outside the allowlist → NULL on insert. Defense in depth
-- — the dropdown is the only input mechanism but routes still
-- validate.
--
-- Source attribution priority (canonical 6-tier chain in
-- src/lib/business-brain.ts attributeSource):
--   1. Survey response (this column)         ← new priority 1
--   2. Pass the Torch (referrer_business_id) ← migration 046
--   3. utm_source                            ← migration 045
--   4. Classified referrer (referrer_url)    ← migration 045
--   5. "Direct" (booking_source = public_widget + nothing else)
--   6. "Unknown" (legacy or manual)
--
-- One subtlety: 'prefer_not_to_say' is recorded but treated as
-- silent in source attribution — the analytics layer falls through
-- to the next priority tier rather than bucketing under "Prefer
-- not to say." Aligns with the client's intent (they declined to
-- share signal); an analytics bucket of "told us nothing" would
-- contradict that.
--
-- Conversion analytics (ConversionBySourceCard from PR #37) uses a
-- separate 5-tier chain (attributeSourceForConversion) that skips
-- this column entirely. Reason: storefront_views don't carry survey
-- responses (the survey only appears at booking time). If a booking
-- attributed to "Instagram (self-reported)" couldn't be matched to
-- any view-side bucket of the same name, conversion math would
-- produce nonsense ("0 views, 3 bookings, ∞%"). The 5-tier helper
-- buckets bookings and views consistently for funnel calculations.
--
-- No backfill — historical bookings stay NULL since we never
-- collected this data.

alter table public.bookings
  add column if not exists survey_response text;

-- Partial index for the analytics queries that filter to
-- survey-tagged rows. Most rows have NULL so the index stays small.
create index if not exists idx_bookings_survey_response
  on public.bookings(survey_response)
  where survey_response is not null;
