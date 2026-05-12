import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared chrome for a bento tile.
 *
 * Always wraps content in a <Link href> — every tile in the bento is a
 * click target into its respective dashboard tab. Hover state mirrors
 * the existing nav-tile convention (border softens to #A3A3A3) without
 * the warm-brown accent used elsewhere — the bento stays neutral.
 *
 * Spans are passed via `className` so the parent page controls each
 * tile's responsive footprint. The wrapper just owns padding, border,
 * background, hover, focus ring, and the click target.
 *
 * Tones:
 *   default — bg-white, primary tiles (Hero, Money, Clients, etc.)
 *   soft    — bg-[#FAFAF9], used for tiles that should sit visually
 *             quieter (Goal meter wrapper, Trusted Pros — the "less
 *             actionable from this surface" ones)
 *
 * Optional `badge` renders a small pill in the top-right (e.g. pending
 * Trusted Pros count). Color comes from the caller; the chrome just
 * positions it.
 */
export function BentoTile({
  href,
  children,
  className = "",
  tone = "default",
  badge,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  /** Responsive col-span + row-span classes per tile. */
  className?: string;
  tone?: "default" | "soft";
  badge?: ReactNode;
  ariaLabel?: string;
}) {
  const bg = tone === "soft" ? "bg-[#FAFAF9]" : "bg-white";
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`group relative flex min-h-[120px] flex-col rounded-lg border border-[#E7E5E4] ${bg} p-5 transition-colors hover:border-[#A3A3A3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D946EF] ${className}`}
    >
      {badge !== undefined && (
        <span className="absolute right-3 top-3">{badge}</span>
      )}
      {children}
    </Link>
  );
}
