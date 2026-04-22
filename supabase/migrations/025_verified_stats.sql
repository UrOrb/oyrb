-- ═════════════════════════════════════════════════════════════════════════
-- 025 — Verified Stats Strip (Original layout)
--
-- Replaces the prior free-text stat_N_value keys (stored inside
-- businesses.template_content) with three enum-constrained columns that
-- select WHICH verified platform metric to display. Labels stay editable
-- in template_content; sanitization (no digits, no %, no ★) happens in
-- the server action.
--
-- Existing stat_*_value values in template_content are NOT deleted —
-- they're ignored by the new render path. This preserves the audit
-- trail without exposing fake numbers on live sites.
--
-- stats_migration_acknowledged_at: set to now() the first time a pro
-- views /dashboard/site with the migration-notice banner dismissed.
-- Until then, a banner prompts them to review their selections.
-- ═════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists stat_1_type text
    check (stat_1_type in (
      'verified_rating','verified_reviews','completed_bookings',
      'years_on_oyrb','services_offered','specialty',
      'location','client_retention'
    ) or stat_1_type is null),
  add column if not exists stat_2_type text
    check (stat_2_type in (
      'verified_rating','verified_reviews','completed_bookings',
      'years_on_oyrb','services_offered','specialty',
      'location','client_retention'
    ) or stat_2_type is null),
  add column if not exists stat_3_type text
    check (stat_3_type in (
      'verified_rating','verified_reviews','completed_bookings',
      'years_on_oyrb','services_offered','specialty',
      'location','client_retention'
    ) or stat_3_type is null),
  add column if not exists stats_migration_acknowledged_at timestamptz;

-- Safe default for every existing pro: three always-available stats
-- (specialty/services/location). No history or review threshold needed,
-- so every pro gets a visually complete strip right after migration.
update public.businesses
  set
    stat_1_type = coalesce(stat_1_type, 'specialty'),
    stat_2_type = coalesce(stat_2_type, 'services_offered'),
    stat_3_type = coalesce(stat_3_type, 'location');
