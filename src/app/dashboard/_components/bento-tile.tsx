import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared chrome for a bento tile.
 *
 * When `href` is provided, the tile is a click target into another
 * route (dashboard root pattern from PR #62 — every tile navigates
 * into a tab). When `href` is omitted, the tile renders as a static
 * display surface (client detail page pattern from PR 5 — most tiles
 * are pure data display, the page is the destination).
 *
 * Hover + focus styles only apply in the Link variant. Static tiles
 * don't pretend to be interactive — no border-color shift, no
 * focus ring, no cursor change.
 *
 * Spans are passed via `className` so the parent page controls each
 * tile's responsive footprint. The wrapper just owns padding, border,
 * background, the click target (when applicable), and the badge slot.
 *
 * Tones:
 *   default — bg-white, primary tiles
 *   soft    — bg-[#FAFAF9], used for tiles that should sit visually
 *             quieter (Goal meter wrapper, Trusted Pros, Notes —
 *             the "less prominent" ones)
 *
 * Optional `badge` renders a small pill in the top-right (e.g.
 * pending Trusted Pros count). Color comes from the caller; the
 * chrome just positions it.
 */
export function BentoTile({
  href,
  children,
  className = "",
  tone = "default",
  badge,
  ariaLabel,
}: {
  /** Optional. When omitted, the tile renders as a static <div>
   *  instead of a navigating Link. */
  href?: string;
  children: ReactNode;
  /** Responsive col-span + row-span classes per tile. */
  className?: string;
  tone?: "default" | "soft";
  badge?: ReactNode;
  ariaLabel?: string;
}) {
  const bg = tone === "soft" ? "bg-[#FAFAF9]" : "bg-[#FFFCF8]";
  const baseChrome = `group relative flex min-h-[120px] flex-col rounded-xl border border-[#E7E5E4] ${bg} p-5 shadow-[0_14px_40px_rgba(10,10,10,0.035)]`;

  if (!href) {
    return (
      <div
        aria-label={ariaLabel}
        className={`${baseChrome} ${className}`}
      >
        {badge !== undefined && (
          <span className="absolute right-3 top-3">{badge}</span>
        )}
        {children}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`${baseChrome} transition-colors hover:border-[#B8896B]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8896B] ${className}`}
    >
      {badge !== undefined && (
        <span className="absolute right-3 top-3">{badge}</span>
      )}
      {children}
    </Link>
  );
}

export function TileTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">
      {children}
    </p>
  );
}

export function EmptyTileState({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-[#D7CFC8] bg-white/60 p-3 text-xs leading-relaxed text-[#737373]">
      {icon && (
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1EFEC] text-[#B8896B]">
          {icon}
        </span>
      )}
      <p>{children}</p>
    </div>
  );
}
