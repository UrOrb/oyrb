-- Phase 2 features: FAQ, reviews, loyalty, inquiries, recurring appts, client logins

-- 1. Business-level columns (FAQ, loyalty opt-in)
alter table businesses
  add column if not exists faq_json jsonb default '[]'::jsonb,
  add column if not exists loyalty_enabled boolean default false,
  add column if not exists loyalty_threshold int default 6,
  add column if not exists loyalty_reward_text text default '20% off your next visit';

-- 2. Reviews table
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  client_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  approved boolean default true
);
create index if not exists idx_reviews_business on reviews(business_id, created_at desc);

-- 3. Inquiries table (pre-booking questions)
create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  client_phone text,
  message text not null,
  photos_json jsonb default '[]'::jsonb,
  answered boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_inquiries_business on inquiries(business_id, created_at desc);

-- 4. Recurring appointments: store the recurrence metadata on bookings
alter table bookings
  add column if not exists series_id uuid,
  add column if not exists series_interval_weeks int;
create index if not exists idx_bookings_series on bookings(series_id) where series_id is not null;

-- 5. Client loyalty counter column
alter table clients
  add column if not exists visit_count int default 0,
  add column if not exists loyalty_reward_available boolean default false;

-- 6. Review request tracking on bookings (so cron doesn't re-email)
alter table bookings
  add column if not exists review_request_sent_at timestamptz;

-- Public read policy for reviews (approved only)
alter table reviews enable row level security;
drop policy if exists "public_read_approved_reviews" on reviews;
create policy "public_read_approved_reviews" on reviews
  for select using (approved = true);

-- Business owners can manage their reviews
drop policy if exists "owners_manage_reviews" on reviews;
create policy "owners_manage_reviews" on reviews
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- Inquiries RLS: only owners can read
alter table inquiries enable row level security;
drop policy if exists "owners_read_inquiries" on inquiries;
create policy "owners_read_inquiries" on inquiries
  for select using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
drop policy if exists "owners_update_inquiries" on inquiries;
create policy "owners_update_inquiries" on inquiries
  for update using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
