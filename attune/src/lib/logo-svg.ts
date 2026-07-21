// The Attune brand mark — a speech bubble with a soundwave inside, in the
// blue→purple gradient. Kept as a single source of truth (an SVG string) so the
// in-app logo and the generated app/browser icons stay pixel-identical.

export function attuneMarkSvg({ size = 200, id = "ag" }: { size?: number; id?: string } = {}): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Attune">
  <defs>
    <linearGradient id="${id}" x1="24" y1="30" x2="176" y2="168" gradientUnits="userSpaceOnUse">
      <stop stop-color="#4f77ef"/>
      <stop offset="1" stop-color="#9b6ae8"/>
    </linearGradient>
  </defs>
  <path d="M60 38 H140 a46 46 0 0 1 46 46 v4 a46 46 0 0 1 -46 46 H98 l-13 20 l-3 -20 H60 a46 46 0 0 1 -46 -46 v-4 a46 46 0 0 1 46 -46 Z" stroke="url(#${id})" stroke-width="12" stroke-linejoin="round"/>
  <path d="M44 86 L54 82 L64 93 L73 73 L82 99 L91 49 L100 101 L109 69 L118 93 L128 79 L138 88 L150 85" stroke="url(#${id})" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

/** Brand gradient stops, if needed elsewhere. */
export const BRAND_GRADIENT = { from: "#4f77ef", to: "#9b6ae8" } as const;
