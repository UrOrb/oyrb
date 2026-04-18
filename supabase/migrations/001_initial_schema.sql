-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- profiles: one per auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- businesses
create table if not exists public.businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  slug text unique not null,
  subscription_tier text check (subscription_tier in ('starter','studio','scale')) default 'starter',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text default 'inactive',
  created_at timestamptz default now() not null
);

alter table public.businesses enable row level security;
create policy "Owners can manage own business" on public.businesses
  for all using (auth.uid() = owner_id);

create index if not exists businesses_owner_id_idx on public.businesses(owner_id);
create index if not exists businesses_slug_idx on public.businesses(slug);

-- services
create table if not exists public.services (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  duration_minutes int not null default 60,
  price_cents int not null default 0,
  deposit_cents int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now() not null
);

alter table public.services enable row level security;
create policy "Business owners manage services" on public.services
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = services.business_id and b.owner_id = auth.uid()
    )
  );
create policy "Public can view active services" on public.services
  for select using (active = true);

create index if not exists services_business_id_idx on public.services(business_id);

-- clients
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now() not null
);

alter table public.clients enable row level security;
create policy "Business owners manage clients" on public.clients
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = clients.business_id and b.owner_id = auth.uid()
    )
  );

create index if not exists clients_business_id_idx on public.clients(business_id);

-- bookings
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text check (status in ('pending','confirmed','cancelled','completed')) default 'pending',
  deposit_paid boolean default false,
  stripe_payment_intent_id text,
  created_at timestamptz default now() not null
);

alter table public.bookings enable row level security;
create policy "Business owners manage bookings" on public.bookings
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = bookings.business_id and b.owner_id = auth.uid()
    )
  );

create index if not exists bookings_business_id_idx on public.bookings(business_id);
create index if not exists bookings_start_at_idx on public.bookings(start_at);
