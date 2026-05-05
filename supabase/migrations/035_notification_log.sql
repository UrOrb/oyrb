-- 035 - Notification delivery log (Phase 1.3)
--
-- Every outbound SMS and email written by OYRB writes a row here at the
-- moment of send (status='sent', provider id captured). Provider webhooks
-- (Twilio status callbacks, Resend Svix events) update the row's status
-- through the lifecycle so pros can see exactly when and how the system
-- attempted to reach the client.
--
-- Privacy: recipient_address_redacted stores partially-masked values only
-- (e.g. ***-***-1234, j***@example.com). Full PII never lands here — the
-- writer does the redaction; the DB does not enforce shape.
--
-- RLS: pros read their own rows (joined to businesses.owner_id). Writes
-- are service-role only — every insert/update path uses createAdminClient,
-- so no public INSERT/UPDATE policy exists by design.

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('client','pro')),
  channel text not null check (channel in ('sms','email')),
  -- purpose is intentionally free-text. Canonical values live in the
  -- KNOWN_PURPOSES const in src/lib/notification-purposes.ts; using a TS
  -- const instead of a DB enum lets new templates ship without a migration
  -- and keeps a single source of truth in code.
  purpose text not null,
  provider_message_id text,
  status text not null default 'sent'
    check (status in ('sent','delivered','failed','undelivered','bounced')),
  status_detail text,
  recipient_address_redacted text,
  sent_at timestamptz not null default now(),
  status_updated_at timestamptz
);

create index if not exists idx_notif_log_booking
  on public.notification_log (booking_id);
create index if not exists idx_notif_log_business
  on public.notification_log (business_id);
-- Webhook lookup path — providers identify the row by their message id.
create index if not exists idx_notif_log_provider_message_id
  on public.notification_log (provider_message_id)
  where provider_message_id is not null;

alter table public.notification_log enable row level security;

create policy "pros see own notification log"
  on public.notification_log for select using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
