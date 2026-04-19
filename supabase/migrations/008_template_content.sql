-- Template copy overrides keyed by template element id (e.g. "hero_kicker",
-- "stat_1_value"). Defaults live in the template code; any row-level overrides
-- stored here are merged on render. One JSONB blob avoids a schema migration
-- every time we expose a new editable string.
alter table businesses
  add column if not exists template_content jsonb default '{}'::jsonb;
