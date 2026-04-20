-- ═════════════════════════════════════════════════════════════════════════
-- 014 — Public beauty-pro directory at /find
--
-- Pros opt in with an explicit agreement (tracked with version + timestamp),
-- then choose granularly which fields are public. Everything defaults OFF
-- except business name. Agreement row is load-bearing for auth —
-- listings without a current agreement are never surfaced publicly.
-- ═════════════════════════════════════════════════════════════════════════

create table if not exists public.directory_listings (
  user_id                       uuid primary key references auth.users(id) on delete cascade,
  -- Master switch. No public output whatsoever when false.
  is_listed                     boolean not null default false,

  -- Consent tracking. Every public render requires agreement_version to
  -- equal the server's DIRECTORY_AGREEMENT_VERSION — when we rev the
  -- terms, existing listings silently hide until the user re-accepts.
  agreement_accepted_at         timestamptz,
  agreement_version             text,

  -- Granular visibility toggles. All default to the most private option.
  show_business_name            boolean not null default true,   -- required for any listing
  show_avatar                   boolean not null default false,
  show_profession               boolean not null default false,
  show_city                     boolean not null default false,
  show_specialty_tags           boolean not null default false,
  show_bio                      boolean not null default false,
  show_booking_link             boolean not null default false,
  show_instagram                boolean not null default false,
  show_tiktok                   boolean not null default false,
  show_full_site_link           boolean not null default false,
  show_gallery                  boolean not null default false,
  show_accepting_clients        boolean not null default false,
  show_price_range              boolean not null default false,

  -- Search-engine indexing is a separate opt-in — default noindex.
  allow_search_engine_indexing  boolean not null default false,

  -- Pro-supplied public content. Sanitized on save (no email/phone/address).
  profession                    text,         -- single tag, e.g. "Hair Stylist"
  city                          text,
  state                         text,
  specialties                   text[],
  bio                           text,              -- 200 char limit enforced app-side
  booking_url                   text,              -- auto-filled from OYRB site
  full_site_url                 text,
  instagram_handle              text,
  tiktok_handle                 text,
  accepting_clients             boolean default true,
  price_range                   text check (price_range in ('$', '$$', '$$$') or price_range is null),

  -- Public URL slug. Unique across all listings.
  slug                          text unique,

  -- Abuse moderation.
  report_count                  integer not null default 0,
  is_hidden_pending_review      boolean not null default false,

  -- Timestamps.
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  delisted_at                   timestamptz
);

alter table public.directory_listings enable row level security;

-- Owner can read + update + insert their own listing.
create policy "owner reads own listing"
  on public.directory_listings for select
  using (user_id = auth.uid());
create policy "owner inserts own listing"
  on public.directory_listings for insert
  with check (user_id = auth.uid());
create policy "owner updates own listing"
  on public.directory_listings for update
  using (user_id = auth.uid());

-- Public read access for listings that are actually live. Requires
-- is_listed, an accepted agreement, and no moderation hold. Used by
-- anonymous visitors browsing /find — RLS enforces it.
create policy "public reads live listings"
  on public.directory_listings for select
  to anon, authenticated
  using (
    is_listed = true
    and agreement_accepted_at is not null
    and is_hidden_pending_review = false
  );

create index if not exists directory_listings_live_idx
  on public.directory_listings(is_listed)
  where is_listed = true and is_hidden_pending_review = false;

create index if not exists directory_listings_city_idx
  on public.directory_listings(city);

create index if not exists directory_listings_slug_idx
  on public.directory_listings(slug);

-- Auto-bump updated_at on any change.
create or replace function public.touch_directory_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists directory_touch on public.directory_listings;
create trigger directory_touch before update on public.directory_listings
  for each row execute function public.touch_directory_updated_at();


-- ─────────────────────────────────────────────────────────────────────────
-- Reports queue for admin review.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.directory_reports (
  id            uuid primary key default uuid_generate_v4(),
  listing_id    uuid not null references public.directory_listings(user_id) on delete cascade,
  reporter_ip   text,                     -- coarse IP only (first 3 octets), for rate-limiting repeat reports
  reason        text,
  handled       boolean not null default false,
  handled_at    timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.directory_reports enable row level security;

-- Anyone can file a report (RLS allows anon insert); nobody reads except
-- service role (admin code uses the admin client).
create policy "anyone reports"
  on public.directory_reports for insert
  to anon, authenticated
  with check (true);

create index if not exists directory_reports_listing_idx
  on public.directory_reports(listing_id);
create index if not exists directory_reports_unhandled_idx
  on public.directory_reports(handled)
  where handled = false;


-- ─────────────────────────────────────────────────────────────────────────
-- Consent audit log. Immutable. One row per (user, version, acceptance).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.directory_consent_log (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete set null,
  agreement_version text not null,
  accepted_at     timestamptz not null default now(),
  ip_hash         text                       -- SHA-256 of IP; not the raw address
);

alter table public.directory_consent_log enable row level security;

create policy "owner reads own consent log"
  on public.directory_consent_log for select
  using (user_id = auth.uid());

create policy "service role writes consent log"
  on public.directory_consent_log for insert
  with check (auth.uid() = user_id);

create index if not exists directory_consent_log_user_idx
  on public.directory_consent_log(user_id, accepted_at desc);
