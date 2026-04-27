-- ═════════════════════════════════════════════════════════════════════════
-- 031 — Per-business font customization
--
-- Pros pick a heading font + body font for their public storefront from
-- a curated list of 10 Google fonts (5 heading, 5 body). The IDs stored
-- here are slugs from src/lib/fonts.ts — keep that registry in sync if
-- you add or remove options.
--
-- Defaults: Playfair Display (headings) + Inter (body). Existing rows
-- get the same defaults via the column-level DEFAULT, so this migration
-- is safe to run on production data without a separate UPDATE pass.
--
-- No CHECK constraint on values: the allowed list lives in TypeScript
-- and is enforced at write time by updateSite(). Keeping the DB column
-- permissive avoids a coordinated migration every time we tweak the
-- catalog (add/remove a font option).
-- ═════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists heading_font text not null default 'playfair-display',
  add column if not exists body_font    text not null default 'inter';
