// ═════════════════════════════════════════════════════════════════════════
// OYRB storefront font catalog
//
// Plain data — no React or next/font imports — so this can be pulled in
// from server actions, validation helpers, and the dashboard form
// without dragging the next/font runtime along. Pair this with
// src/lib/storefront-fonts.ts (which calls next/font/google for each
// id below) to actually render with the chosen font.
//
// Adding a font:
//   1. Add a new entry here with a unique id (lowercase-dash).
//   2. Add the matching next/font/google call + RUNTIME map row in
//      storefront-fonts.ts.
// Removing a font is harder — existing rows in `businesses` may still
// reference the id. Migrate those before deleting an entry.
// ═════════════════════════════════════════════════════════════════════════

export type FontType = "heading" | "body";

export type FontDef = {
  /** Persisted slug (matches DB column value). Lowercase + dashes. */
  id: string;
  /** Human label shown in the picker dropdown. */
  label: string;
  /** Exact Google Fonts family name — used for documentation only. */
  googleFontName: string;
  /** Whether this font appears in the heading or body picker. */
  type: FontType;
};

export const FONTS: readonly FontDef[] = [
  // Heading
  { id: "playfair-display", label: "Playfair Display", googleFontName: "Playfair Display", type: "heading" },
  { id: "cormorant",        label: "Cormorant",        googleFontName: "Cormorant",        type: "heading" },
  { id: "dm-serif-display", label: "DM Serif Display", googleFontName: "DM Serif Display", type: "heading" },
  { id: "italiana",         label: "Italiana",         googleFontName: "Italiana",         type: "heading" },
  { id: "abril-fatface",    label: "Abril Fatface",    googleFontName: "Abril Fatface",    type: "heading" },
  // Body
  { id: "inter",            label: "Inter",            googleFontName: "Inter",            type: "body" },
  { id: "dm-sans",          label: "DM Sans",          googleFontName: "DM Sans",          type: "body" },
  { id: "outfit",           label: "Outfit",           googleFontName: "Outfit",           type: "body" },
  { id: "manrope",          label: "Manrope",          googleFontName: "Manrope",          type: "body" },
  { id: "work-sans",        label: "Work Sans",        googleFontName: "Work Sans",        type: "body" },
] as const;

export type FontId = (typeof FONTS)[number]["id"];

export const HEADING_FONTS: readonly FontDef[] = FONTS.filter((f) => f.type === "heading");
export const BODY_FONTS: readonly FontDef[] = FONTS.filter((f) => f.type === "body");

export const DEFAULT_HEADING_FONT_ID = "playfair-display";
export const DEFAULT_BODY_FONT_ID = "inter";

const HEADING_IDS = new Set(HEADING_FONTS.map((f) => f.id));
const BODY_IDS = new Set(BODY_FONTS.map((f) => f.id));

/** Returns true when `id` is a known heading-font slug. */
export function isHeadingFontId(id: unknown): id is FontId {
  return typeof id === "string" && HEADING_IDS.has(id);
}

/** Returns true when `id` is a known body-font slug. */
export function isBodyFontId(id: unknown): id is FontId {
  return typeof id === "string" && BODY_IDS.has(id);
}

export function findFont(id: string | null | undefined): FontDef | undefined {
  if (!id) return undefined;
  return FONTS.find((f) => f.id === id);
}
