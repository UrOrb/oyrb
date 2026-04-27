// ═════════════════════════════════════════════════════════════════════════
// Storefront fonts — next/font/google integration
//
// Loads all 23 catalog fonts (see src/lib/fonts.ts) once at module
// scope so next/font can self-host them at build time. Each call gets
// a stable CSS variable; the storefront layout attaches every variable
// className to its wrapper, and the dashboard's font picker preview
// does the same. Templates pick the active font for a business by
// reading `business.heading_font` / `business.body_font` and looking
// up the matching `cssFamily` here, which expands to
// `var(--font-<slug>), <fallback>`. When the business value is null,
// the storefront falls back to the active theme's displayFont/bodyFont
// instead — see resolveFontFamily() below.
//
// Performance note: `preload: false` on every font keeps the storefront
// from emitting 23 <link rel="preload"> tags per page. Each storefront
// uses exactly 2 of the 23, and `display: swap` ensures the browser
// fetches the matching .woff2 the moment a CSS rule references it.
// Self-hosting is preserved either way — the upside (deliverability +
// privacy: no Google CDN hit) doesn't depend on preload.
//
// Constraint: next/font/google must be called at module top level —
// never inside a function, conditional, or hook. Don't refactor these
// calls into a loop.
// ═════════════════════════════════════════════════════════════════════════

import {
  Fraunces,
  Playfair_Display,
  Libre_Caslon_Text,
  Archivo_Black,
  Instrument_Serif,
  Archivo,
  Darker_Grotesque,
  Cormorant_Garamond,
  DM_Serif_Display,
  Plus_Jakarta_Sans,
  Syne,
  Space_Grotesk,
  Bungee,
  Inter,
  Cormorant,
  Italiana,
  Abril_Fatface,
  Work_Sans,
  Raleway,
  DM_Sans,
  Nunito,
  Manrope,
  Outfit,
} from "next/font/google";

import type { FontId } from "./fonts";

// ── Theme-set fonts ──────────────────────────────────────────────────────
// Variable fonts skip `weight`; non-variable families pin weight(s).
const fraunces = Fraunces({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-fraunces",
});
const playfairDisplay = Playfair_Display({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-playfair-display",
});
const libreCaslonText = Libre_Caslon_Text({
  weight: ["400", "700"], style: ["normal", "italic"], subsets: ["latin"],
  display: "swap", preload: false, variable: "--font-libre-caslon-text",
});
const archivoBlack = Archivo_Black({
  weight: "400", subsets: ["latin"], display: "swap", preload: false,
  variable: "--font-archivo-black",
});
const instrumentSerif = Instrument_Serif({
  weight: "400", style: ["normal", "italic"], subsets: ["latin"],
  display: "swap", preload: false, variable: "--font-instrument-serif",
});
const archivo = Archivo({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-archivo",
});
const darkerGrotesque = Darker_Grotesque({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-darker-grotesque",
});
const cormorantGaramond = Cormorant_Garamond({
  weight: ["300", "400", "500", "600", "700"], style: ["normal", "italic"],
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-cormorant-garamond",
});
const dmSerifDisplay = DM_Serif_Display({
  weight: "400", subsets: ["latin"], display: "swap", preload: false,
  variable: "--font-dm-serif-display",
});
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-plus-jakarta-sans",
});
const syne = Syne({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-syne",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-space-grotesk",
});
const bungee = Bungee({
  weight: "400", subsets: ["latin"], display: "swap", preload: false, variable: "--font-bungee",
});
const inter = Inter({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-inter",
});
const workSans = Work_Sans({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-work-sans",
});
const raleway = Raleway({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-raleway",
});
const dmSans = DM_Sans({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-dm-sans",
});
const nunito = Nunito({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-nunito",
});
const manrope = Manrope({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-manrope",
});

// ── New additions ────────────────────────────────────────────────────────
const cormorant = Cormorant({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-cormorant",
});
const italiana = Italiana({
  weight: "400", subsets: ["latin"], display: "swap", preload: false,
  variable: "--font-italiana",
});
const abrilFatface = Abril_Fatface({
  weight: "400", subsets: ["latin"], display: "swap", preload: false,
  variable: "--font-abril-fatface",
});
const outfit = Outfit({
  subsets: ["latin"], display: "swap", preload: false, variable: "--font-outfit",
});

// ── Registry ─────────────────────────────────────────────────────────────
type FontRuntime = { variableClassName: string; cssFamily: string };

const SERIF_FALLBACK = "Georgia, 'Times New Roman', serif";
const SANS_FALLBACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const DISPLAY_FALLBACK = SERIF_FALLBACK; // fits all our display-only oddities

const RUNTIME: Record<FontId, FontRuntime> = {
  // Theme-set
  "fraunces":           { variableClassName: fraunces.variable,           cssFamily: `var(--font-fraunces), ${SERIF_FALLBACK}` },
  "playfair-display":   { variableClassName: playfairDisplay.variable,    cssFamily: `var(--font-playfair-display), ${SERIF_FALLBACK}` },
  "libre-caslon-text":  { variableClassName: libreCaslonText.variable,    cssFamily: `var(--font-libre-caslon-text), ${SERIF_FALLBACK}` },
  "archivo-black":      { variableClassName: archivoBlack.variable,       cssFamily: `var(--font-archivo-black), ${SANS_FALLBACK}` },
  "instrument-serif":   { variableClassName: instrumentSerif.variable,    cssFamily: `var(--font-instrument-serif), ${SERIF_FALLBACK}` },
  "archivo":            { variableClassName: archivo.variable,            cssFamily: `var(--font-archivo), ${SANS_FALLBACK}` },
  "darker-grotesque":   { variableClassName: darkerGrotesque.variable,    cssFamily: `var(--font-darker-grotesque), ${SANS_FALLBACK}` },
  "cormorant-garamond": { variableClassName: cormorantGaramond.variable,  cssFamily: `var(--font-cormorant-garamond), ${SERIF_FALLBACK}` },
  "dm-serif-display":   { variableClassName: dmSerifDisplay.variable,     cssFamily: `var(--font-dm-serif-display), ${SERIF_FALLBACK}` },
  "plus-jakarta-sans":  { variableClassName: plusJakartaSans.variable,    cssFamily: `var(--font-plus-jakarta-sans), ${SANS_FALLBACK}` },
  "syne":               { variableClassName: syne.variable,               cssFamily: `var(--font-syne), ${SANS_FALLBACK}` },
  "space-grotesk":      { variableClassName: spaceGrotesk.variable,       cssFamily: `var(--font-space-grotesk), ${SANS_FALLBACK}` },
  "bungee":             { variableClassName: bungee.variable,             cssFamily: `var(--font-bungee), ${DISPLAY_FALLBACK}` },
  "inter":              { variableClassName: inter.variable,              cssFamily: `var(--font-inter), ${SANS_FALLBACK}` },
  "work-sans":          { variableClassName: workSans.variable,           cssFamily: `var(--font-work-sans), ${SANS_FALLBACK}` },
  "raleway":            { variableClassName: raleway.variable,            cssFamily: `var(--font-raleway), ${SANS_FALLBACK}` },
  "dm-sans":            { variableClassName: dmSans.variable,             cssFamily: `var(--font-dm-sans), ${SANS_FALLBACK}` },
  "nunito":             { variableClassName: nunito.variable,             cssFamily: `var(--font-nunito), ${SANS_FALLBACK}` },
  "manrope":            { variableClassName: manrope.variable,            cssFamily: `var(--font-manrope), ${SANS_FALLBACK}` },
  // New additions
  "cormorant":          { variableClassName: cormorant.variable,          cssFamily: `var(--font-cormorant), ${SERIF_FALLBACK}` },
  "italiana":           { variableClassName: italiana.variable,           cssFamily: `var(--font-italiana), ${SERIF_FALLBACK}` },
  "abril-fatface":      { variableClassName: abrilFatface.variable,       cssFamily: `var(--font-abril-fatface), ${DISPLAY_FALLBACK}` },
  "outfit":             { variableClassName: outfit.variable,             cssFamily: `var(--font-outfit), ${SANS_FALLBACK}` },
};

/**
 * Single space-joined string of every catalog font's variable className.
 * Apply to a wrapper element — every descendant then has
 * `var(--font-<slug>)` available for any of the 23 fonts.
 */
export const ALL_FONT_VARIABLE_CLASSES: string = (Object.keys(RUNTIME) as FontId[])
  .map((id) => RUNTIME[id].variableClassName)
  .join(" ");

/**
 * Returns the CSS `font-family` string for a known catalog id, or
 * `null` when the id is missing/unknown. Callers that need a guaranteed
 * string should use resolveFontFamily() instead, which also handles
 * the "fall back to the theme's font" path.
 */
export function fontFamilyFor(id: string | null | undefined): string | null {
  if (!id) return null;
  const entry = id in RUNTIME ? RUNTIME[id as FontId] : null;
  return entry ? entry.cssFamily : null;
}

/**
 * Resolves the font-family string a storefront element should render
 * with. The picker stores `null` to mean "use whatever the active theme
 * decided" — this helper walks that fall-through:
 *
 *   resolveFontFamily(business.heading_font, theme.displayFont)
 *
 *   · slug present + valid  → optimised next/font CSS variable
 *   · slug null / unknown   → the theme's original font-stack string
 *
 * Existing storefronts (heading_font = NULL after migration 031) keep
 * the exact font-family they had before this feature shipped.
 */
export function resolveFontFamily(
  pickerId: string | null | undefined,
  themeFallback: string,
): string {
  return fontFamilyFor(pickerId) ?? themeFallback;
}
