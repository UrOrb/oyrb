-- 042 - Public reputation stats opt-in (Phase 2.3)
--
-- One column. Defaults to false so no existing storefront silently
-- starts displaying reputation signals on deploy. Pros explicitly
-- enable from /dashboard/settings after reading the opt-in copy that
-- describes what does and does not show publicly.
--
-- Closes Phase 2 of OYRB v2 (Dispute Inquiry + Strikes + Public stats).
-- Phase 3 (Service timing pings) is the next master spec item.

alter table public.businesses
  add column if not exists public_stats_enabled boolean not null default false;
