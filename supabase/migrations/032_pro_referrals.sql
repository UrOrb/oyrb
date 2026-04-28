-- 032 - Pass the Torch (Trusted Pros)
-- Per-business mutual referrals. Pros vouch for up to 5 OYRB peers; both
-- sides must consent. Storefront surfaces the list when the pro is fully
-- booked, on vacation, or doesn't offer the requested service.
--
-- Adds columns to businesses (specialty, master toggle, vacation mode)
-- and creates pro_referrals + pro_invites with RLS.

-- 1. businesses additions
alter table public.businesses
  add column if not exists primary_specialty text
    check (primary_specialty in ('hair','nails','lashes','brows','makeup','skincare','barber','medical-spa')),
  add column if not exists pass_the_torch_enabled boolean not null default true,
  add column if not exists vacation_start timestamptz,
  add column if not exists vacation_end timestamptz,
  add column if not exists vacation_message text;

-- 2. pro_referrals
create table if not exists public.pro_referrals (
  id uuid primary key default gen_random_uuid(),
  requesting_business_id uuid not null references public.businesses(id) on delete cascade,
  receiving_business_id  uuid not null references public.businesses(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','blocked')),
  position int not null default 0,
  vouch_note text check (char_length(vouch_note) <= 80),
  referral_specialty text
    check (referral_specialty in ('hair','nails','lashes','brows','makeup','skincare','barber','medical-spa')),
  -- audit timestamps for both sides of the consent handshake
  requester_acknowledged_at timestamptz,
  receiver_acknowledged_at  timestamptz,
  -- 30-day cooldown after a decline before re-request is allowed
  decline_cooldown_until timestamptz,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requesting_business_id, receiving_business_id),
  check (requesting_business_id != receiving_business_id)
);

create index if not exists idx_pro_referrals_requester
  on public.pro_referrals (requesting_business_id);
create index if not exists idx_pro_referrals_receiver
  on public.pro_referrals (receiving_business_id);
create index if not exists idx_pro_referrals_status
  on public.pro_referrals (status);

-- 3. pro_invites (non-OYRB invitees)
create table if not exists public.pro_invites (
  id uuid primary key default gen_random_uuid(),
  requesting_business_id uuid not null references public.businesses(id) on delete cascade,
  invitee_email text not null,
  vouch_note text check (char_length(vouch_note) <= 80),
  -- opaque token used in /invite/[token] URLs (server-generated, unique)
  token text not null unique,
  status text not null default 'pending'
    check (status in ('pending','accepted','expired')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (requesting_business_id, invitee_email)
);

create index if not exists idx_pro_invites_token
  on public.pro_invites (token);
create index if not exists idx_pro_invites_email
  on public.pro_invites (invitee_email);

-- 4. RLS
alter table public.pro_referrals enable row level security;
alter table public.pro_invites    enable row level security;

-- pro_referrals policies

-- Either party can read the row.
create policy "pros see their own referrals"
  on public.pro_referrals for select using (
    requesting_business_id in (select id from public.businesses where owner_id = auth.uid())
    or receiving_business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- Public storefronts (anon) render only accepted rows.
create policy "public sees accepted referrals"
  on public.pro_referrals for select to anon
  using (status = 'accepted');

-- Inserts only as the requester.
create policy "pros create their own referrals"
  on public.pro_referrals for insert with check (
    requesting_business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- Only the receiver accepts/declines/blocks.
create policy "pros update referrals they receive"
  on public.pro_referrals for update using (
    receiving_business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- Either side can walk away.
create policy "either party can delete"
  on public.pro_referrals for delete using (
    requesting_business_id in (select id from public.businesses where owner_id = auth.uid())
    or receiving_business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- pro_invites policies

create policy "pros see their own invites"
  on public.pro_invites for select using (
    requesting_business_id in (select id from public.businesses where owner_id = auth.uid())
  );

create policy "pros create their own invites"
  on public.pro_invites for insert with check (
    requesting_business_id in (select id from public.businesses where owner_id = auth.uid())
  );

create policy "pros delete their own invites"
  on public.pro_invites for delete using (
    requesting_business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- Note: no anon SELECT policy on pro_invites by design. The
-- /invite/[token] page uses the service-role client to look up by token.
