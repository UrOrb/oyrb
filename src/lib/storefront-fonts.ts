// ═════════════════════════════════════════════════════════════════════════
// Storefront fonts — next/font/google integration
//
// Loads all 10 customizable fonts (5 heading + 5 body) once at module
// scope so next/font can self-host them at build time. Each font gets a
// stable CSS variable; the storefront layout attaches every variable
// className to its wrapper, and the dashboard's live preview pane does
// the same. Templates pick the active font for a business by reading
// `business.heading_font` / `business.body_font` and looking up the
// `cssFamily` string here, which expands to `var(--font-X), <fallback>`.
//
// The font catalog lives in src/lib/fonts.ts as a plain data array so
// non-RSC code (server actions, validation) can import it without
// pulling in the next/font runtime.
//
// Constraint: next/font/google must be called at module top level —
// never inside a function, conditional, or hook. Don't refactor these
// calls into a loop.
// ═════════════════════════════════════════════════════════════════════════

import {
  Playfair_Display,
  Cormorant,
  DM_Serif_Display,
  Italiana,
  Abril_Fatface,
  Inter,
  DM_Sans,
  Outfit,
  Manrope,
  Work_Sans,
} from "next/font/google";

import { FONTS, type FontId } from "./fonts";

// ── Heading fonts ─────────────────────────────────────────────────────────
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair-display",
});

const cormorant = Cormorant({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cormorant",
});

// DM Serif Display, Italiana, Abril Fatface are not variable on Google
// Fonts — they ship a single 400 weight, which is plenty for display use.
const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-serif-display",
});

const italiana = Italiana({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-italiana",
});

const abrilFatface = Abril_Fatface({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-abril-fatface",
});

// ── Body fonts ────────────────────────────────────────────────────────────
// Inter is also loaded by the root layout at --font-inter; loading it
// again here under --font-inter-storefront keeps the storefront/dashboard
// preview self-contained (and the underlying .woff2 is fetched once
// thanks to next/font's content-hash deduping).
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-storefront",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-work-sans",
});

// ── Registry ─────────────────────────────────────────────────────────────
// Maps each font id from FONTS to the next/font instance + its
// CSS-ready font-family string with a sensible fallback chain.

type FontRuntime = {
  variableClassName: string;
  cssFamily: string;
};

const SERIF_FALLBACK = "Georgia, 'Times New Roman', serif";
const SANS_FALLBACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const RUNTIME: Record<FontId, FontRuntime> = {
  "playfair-display":  { variableClassName: playfairDisplay.variable,  cssFamily: `var(--font-playfair-display), ${SERIF_FALLBACK}` },
  "cormorant":         { variableClassName: cormorant.variable,        cssFamily: `var(--font-cormorant), ${SERIF_FALLBACK}` },
  "dm-serif-display":  { variableClassName: dmSerifDisplay.variable,   cssFamily: `var(--font-dm-serif-display), ${SERIF_FALLBACK}` },
  "italiana":          { variableClassName: italiana.variable,         cssFamily: `var(--font-italiana), ${SERIF_FALLBACK}` },
  "abril-fatface":     { variableClassName: abrilFatface.variable,     cssFamily: `var(--font-abril-fatface), ${SERIF_FALLBACK}` },
  "inter":             { variableClassName: inter.variable,            cssFamily: `var(--font-inter-storefront), ${SANS_FALLBACK}` },
  "dm-sans":           { variableClassName: dmSans.variable,           cssFamily: `var(--font-dm-sans), ${SANS_FALLBACK}` },
  "outfit":            { variableClassName: outfit.variable,           cssFamily: `var(--font-outfit), ${SANS_FALLBACK}` },
  "manrope":           { variableClassName: manrope.variable,          cssFamily: `var(--font-manrope), ${SANS_FALLBACK}` },
  "work-sans":         { variableClassName: workSans.variable,         cssFamily: `var(--font-work-sans), ${SANS_FALLBACK}` },
};

/**
 * Single space-joined string of every storefront font's variable
 * className. Apply to a wrapper element — every descendant then has
 * `var(--font-X)` available for any of the 10 fonts.
 */
export const ALL_FONT_VARIABLE_CLASSES: string = (Object.keys(RUNTIME) as FontId[])
  .map((id) => RUNTIME[id].variableClassName)
  .join(" ");

/**
 * Returns the CSS `font-family` string to assign to elements rendering
 * with the given font id. Includes a fallback chain so swap-display
 * never falls back to a system serif when a sans was requested (or
 * vice-versa).
 *
 * Falls back to the catalog default when the id is unknown — keeps
 * stale rows from older code paths from breaking the storefront.
 */
export function fontFamilyFor(id: string | null | undefined): string {
  const entry = id && id in RUNTIME ? RUNTIME[id as FontId] : null;
  if (entry) return entry.cssFamily;
  // Unknown id → catalog default for that role. We don't know whether
  // they wanted a heading or body, so return Inter (the safer pick of
  // the two defaults).
  const fallback = FONTS.find((f) => f.id === "inter");
  return fallback ? RUNTIME[fallback.id].cssFamily : SANS_FALLBACK;
}
