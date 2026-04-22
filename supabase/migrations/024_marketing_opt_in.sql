-- ═════════════════════════════════════════════════════════════════════════
-- 024 — Marketing opt-in + campaign audit hardening
--
-- Three additions:
--   1. clients.marketing_opt_in — explicit per-pro consent captured at
--      booking time. Default FALSE (CAN-SPAM: opt-in, not opt-out). We
--      keep a timestamp + source for the audit trail.
--   2. email_campaigns.pro_user_id + status + is_admin_send — pins each
--      campaign to its sender (pro vs. admin) for audit + rate limits.
--      pro_user_id is a soft denormalization of businesses.owner_id so
--      rate-limit queries don't always have to join.
--   3. marketing_send_log — one row per recipient per campaign, used for
--      daily per-pro rate limiting (≤1000/day) + spam-complaint forensics.
-- ═════════════════════════════════════════════════════════════════════════

-- 1. Per-client per-pro marketing consent
alter table public.clients
  add column if not exists marketing_opt_in         boolean not null default false,
  add column if not exists marketing_opt_in_at      timestamptz,
  add column if not exists marketing_opt_in_source  text
    check (marketing_opt_in_source in ('booking_form','manual_add','import','other') or marketing_opt_in_source is null);

-- Fast filter for "opted-in, still wants email" segment queries.
create index if not exists idx_clients_business_optin
  on public.clients (business_id)
  where marketing_opt_in = true;


-- 2. Campaign audit additions
alter table public.email_campaigns
  add column if not exists pro_user_id   uuid references auth.users(id) on delete cascade,
  add column if not exists status        text not null default 'sent'
    check (status in ('draft','sent','failed','partial')),
  add column if not exists is_admin_send boolean not null default false;

-- Backfill pro_user_id from the owner of the business on each existing row
update public.email_campaigns ec
  set pro_user_id = b.owner_id
  from public.businesses b
  where ec.business_id = b.id and ec.pro_user_id is null;

create index if not exists idx_email_campaigns_pro_sent
  on public.email_campaigns (pro_user_id, sent_at desc);


-- 3. Per-recipient send log (rate-limit + forensics)
create table if not exists public.marketing_send_log (
  id              bigserial primary key,
  campaign_id     uuid references public.email_campaigns(id) on delete cascade,
  pro_user_id     uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  sent_at         timestamptz not null default now(),
  -- Captured for admin investigation; NOT the body.
  subject_at_send text
);

-- Count sends per pro per day cheaply.
create index if not exists idx_msl_pro_day
  on public.marketing_send_log (pro_user_id, sent_at desc);
create index if not exists idx_msl_recipient
  on public.marketing_send_log (lower(recipient_email));

alter table public.marketing_send_log enable row level security;
-- Service role only — pros don't read their send log directly (it's shown
-- to them via server-side aggregation on the campaigns page).
