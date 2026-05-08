-- 047 - Storefront view tracking (Phase 5 closer)
--
-- Closes the gap identified in PRs #33, #35, #36: until now, OYRB
-- had no record of how many people visited a pro's storefront —
-- only how many actually booked. This migration adds the table that
-- captures every meaningful storefront view, deduplicated within a
-- 30-minute session window, with referral signals captured for
-- downstream attribution analytics.
--
-- Separate table (not a column on bookings) because views are
-- 1-to-many with bookings — most viewers don't book, and a single
-- booker may generate multiple views.
--
-- Storage estimate: a busy pro getting 1000 views/month = 12K rows
-- per pro per year. The platform at 100 active pros for a year =
-- 1.2M rows. Trivial for Postgres with the indexes below.
--
-- Capture architecture (this PR):
--   src/app/s/[slug]/page.tsx server component schedules a
--   fire-and-forget INSERT via Next.js 16's after() — runs after
--   the response is committed, so view tracking never blocks
--   storefront rendering. The page already has business.id loaded
--   and the admin Supabase client wired up; doing it here keeps
--   the proxy lean and naturally restricts tracking to the landing
--   page (sub-routes have their own page.tsx files that don't
--   schedule the after() call).
--
-- Privacy:
--   - No raw IP stored. ip_hash is SHA-256 of (salt + ip) where
--     salt comes from STOREFRONT_VIEW_IP_HASH_SALT env var. Hash
--     is one-way — never reverse-able without the salt; never
--     displayed in any UI.
--   - user_agent stored as-is for future bot-pattern analysis
--     ONLY. Never displayed.
--   - referrer_url stripped of query string + fragment by the
--     proxy at cookie-set time (hostname + pathname only).
--
-- Session deduplication:
--   - session_id is sticky across the cookie's 24-hour life
--     (proxy preserves it across last-touch overwrites — see
--     src/proxy.ts and src/lib/referrer-classifier.ts).
--   - The 30-minute dedup window is enforced via the
--     viewed_at index lookup at INSERT time, not by cookie expiry.
--     A returning client across multiple 30-min windows in a
--     single day generates multiple rows — each "engagement
--     window" gets one row, which is the intended signal.

create table if not exists public.storefront_views (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  session_id text not null,
  referrer_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer_business_id uuid references public.businesses(id) on delete set null,
  user_agent text,
  ip_hash text
);

-- Per-pro analytics queries. The (business_id, viewed_at desc)
-- order matches "show me last 90 days of views for this business"
-- which is the query shape every analytics card uses.
create index if not exists idx_storefront_views_business_id_viewed_at
  on public.storefront_views(business_id, viewed_at desc);

-- Session dedup lookup at INSERT time. Combined with the
-- business_id filter and viewed_at >= cutoff, this produces a tight
-- index-only scan.
create index if not exists idx_storefront_views_session_id
  on public.storefront_views(session_id);

alter table public.storefront_views enable row level security;

-- Pros read their own storefront's views via the businesses table's
-- owner_id check. Service-role admin client (used by the view-tracking
-- INSERT path) bypasses RLS as expected.
create policy "Pros can read their own storefront views"
  on public.storefront_views for select
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = storefront_views.business_id
      and businesses.owner_id = auth.uid()
    )
  );
