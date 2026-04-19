-- Waitlist — clients wanting a slot when one opens up
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  -- preferred date/time flexibility (free text for now)
  preferred_window text,
  notes text,
  -- status lifecycle
  status text not null default 'waiting' check (status in ('waiting','notified','booked','cancelled')),
  notified_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.waitlist enable row level security;

create policy "Owners manage own waitlist" on public.waitlist
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

create policy "Public can join waitlist" on public.waitlist
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.is_published = true)
  );

create index if not exists waitlist_business_id_idx on public.waitlist(business_id);
create index if not exists waitlist_status_idx on public.waitlist(status);

-- Track reminder dispatch so we don't double-send
alter table public.bookings
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists sms_reminder_sent_at timestamptz;

-- SMS opt-in consent (TCPA compliance — a client must explicitly agree to receive SMS)
alter table public.clients
  add column if not exists sms_consent boolean not null default false,
  add column if not exists sms_consent_at timestamptz;
