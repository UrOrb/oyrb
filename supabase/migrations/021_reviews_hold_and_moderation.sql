-- ═════════════════════════════════════════════════════════════════════════
-- 021 — Review 24h hold + moderation columns
--
-- Existing reviews table (007) used an `approved` boolean that flipped to
-- true immediately on submit. New model:
--   · every submission enters status='pending_24h_hold' (or 'flagged' if
--     the sanitizer catches PII/spam — those skip the hold and go
--     straight to the admin queue).
--   · daily cron flips pending → live once created_at + 24h elapses.
--   · pros flag a live review → status='flagged' (stays publicly visible
--     until admin decides; flagging is a signal, not a takedown).
--   · admin approve → status='live'; admin remove → status='removed'.
--
-- `approved` stays for backwards compatibility with any code that hasn't
-- been ported to the status enum yet — it's dual-written to match status.
-- ═════════════════════════════════════════════════════════════════════════

alter table public.reviews
  add column if not exists status text not null default 'pending_24h_hold'
    check (status in ('pending_24h_hold','live','flagged','removed')),
  add column if not exists pro_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists client_email text,
  add column if not exists reviewer_first_name text,
  add column if not exists reviewer_last_initial text,
  add column if not exists flagged_at timestamptz,
  add column if not exists flagged_reason text
    check (flagged_reason in ('spam','inappropriate','false_info','offensive','other') or flagged_reason is null),
  add column if not exists flagged_by_user_id uuid references auth.users(id),
  add column if not exists admin_reviewed_at timestamptz,
  add column if not exists admin_decision text
    check (admin_decision in ('kept','removed','more_info') or admin_decision is null),
  add column if not exists admin_reviewer_user_id uuid references auth.users(id),
  add column if not exists published_at timestamptz;

-- Backfill: existing approved rows are live, unapproved ones are removed.
update public.reviews
  set status = case when approved then 'live' else 'removed' end,
      published_at = case when approved then coalesce(created_at, now()) else null end
  where status = 'pending_24h_hold';

-- Backfill pro_user_id from the business owner so dashboard queries can
-- use a single indexed column instead of joining through businesses.
update public.reviews r
  set pro_user_id = b.owner_id
  from public.businesses b
  where r.business_id = b.id and r.pro_user_id is null;

-- Backfill reviewer name split. client_name is "First Last" or a single
-- token; we store the first token + first letter of any subsequent
-- tokens. Anything malformed falls back to "A." so reviews still render.
update public.reviews
  set
    reviewer_first_name = coalesce(
      nullif(split_part(client_name, ' ', 1), ''),
      'Anonymous'
    ),
    reviewer_last_initial = coalesce(
      nullif(left(split_part(client_name, ' ', 2), 1), ''),
      ''
    )
  where reviewer_first_name is null;

-- Backfill client_email via clients join.
update public.reviews r
  set client_email = c.email
  from public.clients c
  where r.client_id = c.id and r.client_email is null;

-- Hot-path indexes for the public display (live only), pro dashboard
-- (by pro), and hold-release cron (pending past cutoff).
create index if not exists idx_reviews_business_live
  on public.reviews (business_id, created_at desc)
  where status in ('live','flagged');

create index if not exists idx_reviews_pro
  on public.reviews (pro_user_id, created_at desc);

create index if not exists idx_reviews_hold_release
  on public.reviews (created_at)
  where status = 'pending_24h_hold';

create index if not exists idx_reviews_flagged_for_admin
  on public.reviews (flagged_at desc)
  where status = 'flagged';
