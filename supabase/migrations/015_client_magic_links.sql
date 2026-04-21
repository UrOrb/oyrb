-- ═════════════════════════════════════════════════════════════════════════
-- 015 — Client-facing magic links, communication preferences, age gate
--
-- Phase 1 of the client portal: let clients access their booking via a
-- time-limited magic link emailed at booking time. No passwords, no
-- persistent accounts yet. Honor unsubscribe globally (keyed by email).
-- ═════════════════════════════════════════════════════════════════════════

-- ── Magic link tokens (per-booking, 7-day expiry) ───────────────────────
create table if not exists public.booking_access_tokens (
  token              text primary key,
  booking_id         uuid not null references public.bookings(id) on delete cascade,
  client_email       text not null,
  expires_at         timestamptz not null,
  accessed_count     integer not null default 0,
  last_accessed_at   timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists idx_bat_client_email on public.booking_access_tokens (lower(client_email));
create index if not exists idx_bat_booking on public.booking_access_tokens (booking_id);
create index if not exists idx_bat_expires on public.booking_access_tokens (expires_at);

alter table public.booking_access_tokens enable row level security;

-- No policies — only service-role reads/writes. Anonymous clients resolve
-- tokens via server-side /booking/[token] route, never via the public API.

-- ── Communication preferences (keyed by email, not user) ────────────────
-- Phase 1 has no client accounts, so preferences travel with the email
-- address. Apply to every email send across all pros.
create table if not exists public.communication_preferences (
  email                       text primary key,
  rebook_reminders_enabled    boolean not null default true,
  marketing_enabled           boolean not null default false,
  data_deletion_requested_at  timestamptz,
  unsubscribed_at             timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists idx_commpref_deletion on public.communication_preferences (data_deletion_requested_at)
  where data_deletion_requested_at is not null;

alter table public.communication_preferences enable row level security;

-- ── Per-pro rebook interval overrides ───────────────────────────────────
-- Defaults live in app code (src/lib/rebook-intervals.ts). Rows here are
-- only created when a pro customizes a category away from the default.
create table if not exists public.pro_rebook_intervals (
  pro_user_id       uuid not null references auth.users(id) on delete cascade,
  service_category  text not null,
  interval_days     integer not null check (interval_days between 3 and 365),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (pro_user_id, service_category)
);

alter table public.pro_rebook_intervals enable row level security;

create policy "pro manages own rebook intervals"
  on public.pro_rebook_intervals
  for all
  using (auth.uid() = pro_user_id)
  with check (auth.uid() = pro_user_id);

-- ── Booking-side additions ──────────────────────────────────────────────
alter table public.bookings
  add column if not exists age_confirmed_at    timestamptz,
  add column if not exists age_is_minor        boolean not null default false,
  add column if not exists guardian_name       text,
  add column if not exists rebook_reminder_sent_at timestamptz,
  add column if not exists cancelled_at        timestamptz,
  add column if not exists cancelled_by        text check (cancelled_by in ('client', 'pro') or cancelled_by is null),
  add column if not exists cancel_reason       text;

-- Rebook cron selects confirmed bookings past their end_at where no
-- reminder has fired yet. Index speeds that scan.
create index if not exists idx_bookings_rebook_scan
  on public.bookings (end_at)
  where status = 'confirmed' and rebook_reminder_sent_at is null;

-- ── Token generation rate-limit scaffolding ─────────────────────────────
-- Track generation attempts per email in a 1h sliding window. The lib
-- enforces ≤10/hr before inserting the real token.
create table if not exists public.token_generation_audit (
  id           bigserial primary key,
  client_email text not null,
  booking_id   uuid references public.bookings(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists idx_tga_email_time on public.token_generation_audit (lower(client_email), created_at desc);

alter table public.token_generation_audit enable row level security;

-- ── updated_at trigger for communication_preferences ────────────────────
create or replace function public.touch_commpref_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_commpref_touch on public.communication_preferences;
create trigger trg_commpref_touch
  before update on public.communication_preferences
  for each row execute function public.touch_commpref_updated_at();

drop trigger if exists trg_rebookint_touch on public.pro_rebook_intervals;
create trigger trg_rebookint_touch
  before update on public.pro_rebook_intervals
  for each row execute function public.touch_commpref_updated_at();
