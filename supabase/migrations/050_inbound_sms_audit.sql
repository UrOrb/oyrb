-- 050 - Inbound SMS audit columns
--
-- Twilio's "A message comes in" webhook for OYRB's toll-free number was
-- previously pointed at Twilio's demo URL — client replies (including
-- TCPA-mandated STOP keywords) never reached OYRB's database. The
-- inbound handler at /api/twilio/sms/inbound (PR adding this migration)
-- closes that gap. To support the inbound flow this migration extends
-- two CHECK constraints:
--
--   1. clients.sms_consent_source — add 'inbound_stop' so the handler
--      can record opt-outs originating from a client texting STOP. The
--      existing canonical values (booking_widget, magic_link,
--      imported_pre_consent) are unchanged.
--
--   2. notification_log.status — add 'received' so inbound rows can be
--      distinguished from outbound. The existing values (sent,
--      delivered, failed, undelivered, bounced) are all outbound-
--      lifecycle states; 'received' is the inbound terminal state.
--
-- Forward-only with idempotency guards (drop constraint if exists, then
-- add). Matches every existing OYRB migration.

-- ── clients.sms_consent_source — add 'inbound_stop' ────────────────────
alter table public.clients
  drop constraint if exists clients_sms_consent_source_check;

alter table public.clients
  add constraint clients_sms_consent_source_check
    check (sms_consent_source in (
      'booking_widget',
      'magic_link',
      'imported_pre_consent',
      'inbound_stop'
    ));

-- ── notification_log.status — add 'received' ──────────────────────────
alter table public.notification_log
  drop constraint if exists notification_log_status_check;

alter table public.notification_log
  add constraint notification_log_status_check
    check (status in (
      'sent',
      'delivered',
      'failed',
      'undelivered',
      'bounced',
      'received'
    ));
