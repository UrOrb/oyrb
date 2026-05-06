-- 037 - Magic-link SMS opt-in (Phase 1.6)
--
-- We've stored sms_consent + sms_consent_at on public.clients since
-- migration 006. This phase ADDS the legal-record metadata columns
-- needed for documented opt-in via the magic-link booking page (and
-- the public booking widget, going forward):
--
--   sms_consent_ip          inet   — captured at click-through time
--   sms_consent_user_agent  text   — captured at click-through time
--   sms_consent_source      text   — 'booking_widget' / 'magic_link'
--                                    / 'imported_pre_consent'
--
-- Backfill: existing rows where sms_consent=true predate metadata
-- capture. We mark them with source='imported_pre_consent' so the
-- audit trail records that the consent is real but its provenance
-- (IP/UA) is not preserved. We deliberately do NOT fabricate fake
-- IP/UA values — corrupting the legal record would be worse than
-- leaving the historical capture blank.

alter table public.clients
  add column if not exists sms_consent_ip         inet,
  add column if not exists sms_consent_user_agent text,
  add column if not exists sms_consent_source     text
    check (sms_consent_source in ('booking_widget','magic_link','imported_pre_consent'));

-- One-shot backfill of consent provenance for rows that already
-- carry sms_consent=true but no source. Idempotent — once source is
-- set, the WHERE clause excludes the row on re-run.
update public.clients
  set sms_consent_source = 'imported_pre_consent'
  where sms_consent = true
    and sms_consent_source is null;
