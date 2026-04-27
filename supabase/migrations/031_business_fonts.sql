-- ═════════════════════════════════════════════════════════════════════════
-- 031 — Per-business font customization (overrides only)
--
-- Pros pick a heading font + body font for their public storefront from
-- a curated catalog (see src/lib/fonts.ts). The columns here store the
-- override:
--   · NULL  → use the active theme's font (whatever template_themes.ts
--             defines as displayFont / bodyFont for the chosen theme).
--             Existing rows land here on day one — appearance unchanged.
--   · slug  → override the theme; storefront renders the picked font.
--
-- Why nullable instead of a default: every theme already ships its own
-- typography choices. Forcing a global default ("Playfair Display + Inter")
-- on every existing business would silently change 30 themes' look. NULL
-- = "trust the theme" preserves design intent.
--
-- The slug values are validated in TypeScript (src/lib/fonts.ts) at write
-- time. No CHECK constraint on the column so we can iterate the catalog
-- without coordinated migrations.
-- ═════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists heading_font text,
  add column if not exists body_font    text;
