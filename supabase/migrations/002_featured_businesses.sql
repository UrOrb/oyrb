-- Add location + featured fields to businesses
alter table public.businesses
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_until timestamptz;

-- Allow public to read active featured businesses (no auth required for homepage display)
create policy "Public can view featured businesses" on public.businesses
  for select using (
    is_featured = true and featured_until > now()
  );

-- Indexes for the 3-level fallback query
create index if not exists businesses_city_featured_idx
  on public.businesses(city, state, is_featured, featured_until)
  where is_featured = true;

create index if not exists businesses_state_featured_idx
  on public.businesses(state, is_featured, featured_until)
  where is_featured = true;
