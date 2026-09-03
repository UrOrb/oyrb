-- Allow 'redemption' as a template_unlocks.source.
--
-- Etsy buyers now unlock a template by entering a redemption code in the
-- dashboard (see 063_template_redemption_codes.sql). Those unlock rows are
-- tagged source = 'redemption' so they are distinguishable from direct
-- 'etsy' order webhooks, 'admin' grants, 'promo' campaigns, and the
-- one-time 'migration' backfill.
--
-- The inline CHECK from 060_template_unlocks.sql auto-named itself
-- template_unlocks_source_check; drop and recreate it with the wider set.

alter table public.template_unlocks
  drop constraint if exists template_unlocks_source_check;

alter table public.template_unlocks
  add constraint template_unlocks_source_check
  check (source in ('etsy', 'admin', 'promo', 'migration', 'redemption'));
