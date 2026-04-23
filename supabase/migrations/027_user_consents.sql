-- Versioned consent log for Terms of Service + Privacy Policy acceptance.
-- Directory opt-in already has its own table (directory_consent_log added in
-- migration 014) — this one covers the platform-wide TOS/Privacy click-through
-- captured at signup. Immutable: one row per (user, consent_type, version)
-- acceptance event. We never UPDATE; we INSERT a new row when the version
-- bumps and the user re-accepts.
create table if not exists public.user_consents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  consent_type  text not null check (consent_type in ('tos','privacy','directory_listing')),
  version       text not null,
  accepted_at   timestamptz not null default now(),
  ip_address    inet,
  user_agent    text
);

create index if not exists user_consents_user_idx
  on public.user_consents(user_id, consent_type, accepted_at desc);

alter table public.user_consents enable row level security;

-- Users can read their own consent history
create policy "Users read own consents"
  on public.user_consents for select
  using (auth.uid() = user_id);

-- Inserts go through a server action with the service role; no direct client
-- writes. Service role bypasses RLS so no INSERT policy is needed.
