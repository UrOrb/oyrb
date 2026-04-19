-- Client policies / ban list per business
alter table public.businesses
  add column if not exists client_policies text,
  add column if not exists cancellation_policy text;

-- Email campaign history
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  subject text not null,
  body text not null,
  segment text not null default 'all' check (segment in ('all','winback_30','winback_60','winback_90','custom')),
  recipient_count int not null default 0,
  sent_at timestamptz default now(),
  created_at timestamptz default now() not null
);

alter table public.email_campaigns enable row level security;

create policy "Owners manage own campaigns" on public.email_campaigns
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

create index if not exists email_campaigns_business_id_idx on public.email_campaigns(business_id);
