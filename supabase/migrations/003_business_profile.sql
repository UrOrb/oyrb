-- Extend businesses with full profile fields
alter table public.businesses
  add column if not exists tagline text,
  add column if not exists bio text,
  add column if not exists phone text,
  add column if not exists contact_email text,
  add column if not exists instagram_url text,
  add column if not exists hero_image_url text,
  add column if not exists profile_image_url text,
  add column if not exists template_layout text default 'studio',
  add column if not exists template_theme text default 'aura',
  add column if not exists service_category text default 'hair',
  add column if not exists timezone text default 'America/New_York',
  add column if not exists gallery_photos jsonb default '[]'::jsonb,
  add column if not exists is_published boolean not null default false;

-- Business hours (one row per day of week)
create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sun
  is_open boolean not null default false,
  open_time time,
  close_time time,
  unique(business_id, day_of_week)
);

alter table public.business_hours enable row level security;

create policy "Owners manage own hours" on public.business_hours
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy "Public can view hours of published businesses" on public.business_hours
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.is_published = true)
  );

create index if not exists business_hours_business_id_idx on public.business_hours(business_id);

-- Allow public read of published businesses by slug (for /s/[slug])
drop policy if exists "Public can view published businesses" on public.businesses;
create policy "Public can view published businesses" on public.businesses
  for select using (is_published = true);

-- Allow public read of active services for published businesses
drop policy if exists "Public can view active services" on public.services;
create policy "Public can view active services" on public.services
  for select using (
    active = true
    and exists (select 1 from public.businesses b where b.id = services.business_id and b.is_published = true)
  );

-- Allow public insert of bookings (the booking form posts directly)
create policy "Public can create bookings" on public.bookings
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.is_published = true)
  );

-- Allow public insert of clients (via the booking flow)
create policy "Public can create clients via booking" on public.clients
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.is_published = true)
  );
