-- 044 - Booking source column (Phase 4.5)
--
-- Single new column: bookings.booking_source. Captures which code
-- path created each booking — replacing the brittle
-- age_confirmed_at-as-proxy hack the analytics layer would otherwise
-- have to use.
--
-- Values populated at insert time by the booking-creation paths:
--   'public_widget'  — /api/public/bookings/route.ts (single + series),
--                      /api/public/bookings/confirm/route.ts (post-deposit).
--   'manual'         — src/app/dashboard/bookings/actions.ts (pro
--                      manually entering a booking).
--
-- Future Phase 5 PRs can extend the value space cleanly without
-- another schema migration:
--   'pass_the_torch'    (when Pass the Torch attribution is persisted
--                        instead of just reflected in email metadata)
--   'utm:instagram'     (when UTM parsing on the public widget ships)
--   etc.
--
-- Backfill rationale: rows >6 months old fall outside any 90-day
-- analytics window anyway, so backfilling via the age_confirmed_at
-- proxy is correct-enough for the data the cards will surface. NULL
-- after backfill means "we genuinely don't know" — analytics
-- gracefully treats it as Unknown.

alter table public.bookings
  add column if not exists booking_source text;

-- Backfill existing rows. age_confirmed_at was set ONLY by the public
-- booking routes (post-PR-#15), so its presence is a reliable proxy
-- for "publicly booked" on rows that pre-date this migration. Rows
-- before PR #15 have NULL on both — they stay NULL after backfill,
-- which is correct (we genuinely don't know their source).
update public.bookings
   set booking_source = case
     when age_confirmed_at is not null then 'public_widget'
     else 'manual'
   end
 where booking_source is null
   and (age_confirmed_at is not null or created_at >= '2024-09-01'::timestamptz);
-- The created_at floor avoids stamping ancient pre-PR-#15 rows that
-- have no age_confirmed_at signal — better to keep them NULL than
-- guess "manual" for them.

create index if not exists idx_bookings_booking_source
  on public.bookings(booking_source)
  where booking_source is not null;
