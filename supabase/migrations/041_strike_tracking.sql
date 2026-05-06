-- 041 - Reputation strike tracking (Phase 2.2)
--
-- Two single-purpose timestamp columns on `businesses`. Matches the
-- existing pause-marker convention from migration 034
-- (`unpublished_for_billing_at`) — one column per pause reason, no
-- `paused_reason` enum, no check constraint to maintain.
--
-- Why no `strike_count` / `strike_weighted_total` columns:
--   The threshold rule (per TOS Section 29) is "three strikes OR
--   weighted total ≥ 5 within a 14-day rolling window." A cumulative
--   counter would diverge from that rolling-window value as soon as
--   strikes age out, requiring either a sync mechanism (cron / trigger)
--   or careful coordination on every read/write. Cleaner alternative:
--   compute the count and weighted total at query time from
--   `dispute_inquiries` filtered by `business_id`, `status =
--   'resolved_strike'`, `reporter_type = 'client'`, and
--   `resolved_at > now() - interval '14 days'`. That's a single indexed
--   query (idx_dispute_business already exists from migration 040) and
--   it's the source of truth — no drift possible.
--
-- Section 29 of TOS v1.3 (PR #18) commits to "three strikes or weighted
-- total of five or greater" but does NOT mention the 14-day window.
-- The implementation is strictly more pro-friendly than the TOS as
-- written. Lawyer review of Section 29 (PR 2.4) should decide whether
-- to add the rolling-window language to TOS or remove the 14-day logic
-- to match TOS literally.

alter table public.businesses
  add column if not exists last_strike_at  timestamptz,
  add column if not exists strike_paused_at timestamptz;

-- Partial index over currently-paused businesses for the admin queue
-- and the proxy redirect lookup. Keeps the scan tight.
create index if not exists idx_businesses_strike_paused
  on public.businesses (strike_paused_at)
  where strike_paused_at is not null;

-- Owner-side lookup for the proxy: "does this user own any
-- strike-paused business?" Same shape as
-- idx_businesses_unpublished_for_billing in migration 034.
create index if not exists idx_businesses_owner_strike_paused
  on public.businesses (owner_id)
  where strike_paused_at is not null;
