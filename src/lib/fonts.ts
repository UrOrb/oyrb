// ═════════════════════════════════════════════════════════════════════════
// OYRB storefront font catalog
//
// Plain data — no React or next/font imports — so this can be pulled in
// from server actions, validation helpers, and the dashboard form
// without dragging the next/font runtime along. The matching next/font
// calls live in src/lib/storefront-fonts.ts; that module reads this list
// to wire each id to its CSS variable + family string.
//
// Two orthogonal facets per font:
//
//   `roles` — which dropdowns the font appears in. A font with
//   ["heading", "body"] appears in both pickers (Inter, Fraunces, Syne,
//   Plus Jakarta Sans, Archivo, etc. — these were all used in both
//   roles by existing themes, so it would be a regression to limit
//   them to one).
//
//   `origin` — "theme" if at least one of the 30 baked-in themes uses
//   this font, "new" if it was added on top of the theme set. The
//   dashboard groups options under "— Theme fonts —" / "— New
//   additions —" headings using this flag so pros can scan the list.
//
// Adding a font:
//   1. Add a new entry here with a unique id (lowercase-dash slug),
//      label, googleFontName, roles, and origin.
//   2. Add the matching next/font/google call + RUNTIME map row in
//      storefront-fonts.ts.
// Removing a font is harder — existing rows in `businesses` may still
// reference the id. Migrate those before deleting an entry.
// ═════════════════════════════════════════════════════════════════════════

export type FontRole = "heading" | "body";
export type FontOrigin = "theme" | "new";

export type FontDef = {
  /** Persisted slug (matches DB column value). Lowercase + dashes. */
  id: string;
  /** Human label shown in the picker dropdown. */
  label: string;
  /** Exact Google Fonts family name — used for documentation only. */
  googleFontName: string;
  /** Which picker(s) this font appears in. A font may sit in both. */
  roles: readonly FontRole[];
  /** Whether at least one OYRB theme uses this font today. */
  origin: FontOrigin;
};

export const FONTS: readonly FontDef[] = [
  // ── Already used by one or more OYRB themes ─────────────────────────────
  // Headings / dual-role
  { id: "fraunces",            label: "Fraunces",            googleFontName: "Fraunces",            roles: ["heading", "body"], origin: "theme" },
  { id: "playfair-display",    label: "Playfair Display",    googleFontName: "Playfair Display",    roles: ["heading"],         origin: "theme" },
  { id: "libre-caslon-text",   label: "Libre Caslon Text",   googleFontName: "Libre Caslon Text",   roles: ["heading"],         origin: "theme" },
  { id: "archivo-black",       label: "Archivo Black",       googleFontName: "Archivo Black",       roles: ["heading"],         origin: "theme" },
  { id: "instrument-serif",    label: "Instrument Serif",    googleFontName: "Instrument Serif",    roles: ["heading"],         origin: "theme" },
  { id: "archivo",             label: "Archivo",             googleFontName: "Archivo",             roles: ["heading", "body"], origin: "theme" },
  { id: "darker-grotesque",    label: "Darker Grotesque",    googleFontName: "Darker Grotesque",    roles: ["heading", "body"], origin: "theme" },
  { id: "cormorant-garamond",  label: "Cormorant Garamond",  googleFontName: "Cormorant Garamond",  roles: ["heading", "body"], origin: "theme" },
  { id: "dm-serif-display",    label: "DM Serif Display",    googleFontName: "DM Serif Display",    roles: ["heading"],         origin: "theme" },
  { id: "plus-jakarta-sans",   label: "Plus Jakarta Sans",   googleFontName: "Plus Jakarta Sans",   roles: ["heading", "body"], origin: "theme" },
  { id: "syne",                label: "Syne",                googleFontName: "Syne",                roles: ["heading", "body"], origin: "theme" },
  { id: "space-grotesk",       label: "Space Grotesk",       googleFontName: "Space Grotesk",       roles: ["heading", "body"], origin: "theme" },
  { id: "bungee",              label: "Bungee",              googleFontName: "Bungee",              roles: ["heading"],         origin: "theme" },
  { id: "inter",               label: "Inter",               googleFontName: "Inter",               roles: ["heading", "body"], origin: "theme" },
  // Body-only (still used by themes — never seen as a heading anywhere)
  { id: "work-sans",           label: "Work Sans",           googleFontName: "Work Sans",           roles: ["body"],            origin: "theme" },
  { id: "raleway",             label: "Raleway",             googleFontName: "Raleway",             roles: ["body"],            origin: "theme" },
  { id: "dm-sans",             label: "DM Sans",             googleFontName: "DM Sans",             roles: ["body"],            origin: "theme" },
  { id: "nunito",              label: "Nunito",              googleFontName: "Nunito",              roles: ["body"],            origin: "theme" },
  { id: "manrope",             label: "Manrope",             googleFontName: "Manrope",             roles: ["body"],            origin: "theme" },
  // ── Added on top of the theme set ───────────────────────────────────────
  { id: "cormorant",           label: "Cormorant",           googleFontName: "Cormorant",           roles: ["heading", "body"], origin: "new" },
  { id: "italiana",            label: "Italiana",            googleFontName: "Italiana",            roles: ["heading"],         origin: "new" },
  { id: "abril-fatface",       label: "Abril Fatface",       googleFontName: "Abril Fatface",       roles: ["heading"],         origin: "new" },
  { id: "outfit",              label: "Outfit",              googleFontName: "Outfit",              roles: ["body"],            origin: "new" },
] as const;

export type FontId = (typeof FONTS)[number]["id"];

/** All fonts that may appear in the heading dropdown. */
export const HEADING_FONTS: readonly FontDef[] = FONTS.filter((f) => f.roles.includes("heading"));
/** All fonts that may appear in the body dropdown. */
export const BODY_FONTS: readonly FontDef[] = FONTS.filter((f) => f.roles.includes("body"));

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

/**
 * Pulls the first font name out of a CSS font-stack string. Used to
 * label the "Use theme default (X)" option with whatever family the
 * active theme would render. The string shapes we care about look
 * like `'"Fraunces", "Cormorant Garamond", Georgia, serif'`.
 *
 * Falls back to "default" if parsing fails — preferable to crashing
 * the dropdown render path over a malformed theme entry.
 */
export function firstFontInStack(cssFontFamily: string): string {
  const m = cssFontFamily.match(/^\s*["']?([^"',]+)["']?/);
  return m ? m[1].trim() : "default";
}
