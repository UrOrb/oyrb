-- Per-account template entitlements.
--
-- Studio/Scale continue to unlock every template. Starter keeps the default
-- starter themes, plus any exact template bought or granted through another
-- channel such as Etsy. An unlock is normally layout_id + theme_id; layout_id
-- may be NULL for a rare all-layout theme grant.

create table if not exists public.template_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  layout_id text,
  theme_id text not null,
  source text not null default 'admin'
    check (source in ('etsy', 'admin', 'promo', 'migration')),
  external_order_id text,
  created_at timestamptz not null default now(),
  unique (business_id, layout_id, theme_id)
);

create index if not exists template_unlocks_user_id_idx
  on public.template_unlocks(user_id);

create index if not exists template_unlocks_business_id_idx
  on public.template_unlocks(business_id);

create unique index if not exists template_unlocks_external_order_uidx
  on public.template_unlocks(source, external_order_id)
  where external_order_id is not null;

alter table public.template_unlocks enable row level security;

drop policy if exists "Owners can view template unlocks" on public.template_unlocks;
create policy "Owners can view template unlocks" on public.template_unlocks
  for select using (
    auth.uid() = user_id
    and exists (
      select 1 from public.businesses b
      where b.id = template_unlocks.business_id
        and b.owner_id = auth.uid()
    )
  );
