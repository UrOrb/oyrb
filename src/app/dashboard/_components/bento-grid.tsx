import type { ReactNode } from "react";

/**
 * Phase 9 PR 3 — Dashboard bento wrapper.
 *
 * Plain CSS Grid using col-span / row-span Tailwind utilities per tile.
 * No grid-template-areas — children specify their own spans, which
 * keeps the responsive behavior co-located with each tile and avoids
 * a separate CSS module just to declare areas.
 *
 * Three breakpoints, all matching Tailwind defaults:
 *
 *   < 640px (mobile)        2 cols
 *   ≥ 640px (tablet, sm)    4 cols
 *   ≥ 1024px (desktop, lg)  6 cols
 *
 * Auto row sizing — each row's height is the tallest tile in it. The
 * hero takes row-span-2 on sm/lg so it dominates visually.
 *
 * Tile JSX order matters: CSS Grid auto-placement fills row-by-row,
 * so the layout is encoded in (a) the order of `children` passed and
 * (b) each tile's span classes. The dashboard page passes tiles in a
 * specific order; reordering them changes the bento layout.
 */
export function BentoGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
      {children}
    </div>
  );
}
