import Image from "next/image";
import { pickIndex } from "@/lib/hash";

/**
 * Phase 9 PR 4 — initials avatar for client list rows.
 *
 * Renders a circular tile containing the client's two-letter initials
 * on a soft warm-palette background. Background color is picked
 * deterministically from the (lowercased, trimmed) name, so the same
 * client always gets the same color across sessions, devices, and
 * deploys — a stable visual identity, not a random per-render decoration.
 *
 * Sized for three contexts:
 *   sm (32px) — desktop client-list row
 *   md (40px) — mobile client card top-left anchor
 *   lg (64px) — client detail page header (planned for Phase 9 PR 5)
 *
 * photoUrl is anticipated API surface for a future Phase 9.5+ photo
 * upload feature; currently no callers pass it. When set, the
 * component renders a next/image instead of the initials tile. No
 * `clients.photo_url` column exists yet — adding it (plus consent UX,
 * upload route, storage bucket RLS) is out of scope for this PR.
 *
 * Decorative when paired with a visible name (the universal case in
 * this PR): `aria-hidden="true"` so screen readers don't double-read.
 * If a future surface uses the avatar standalone, callers pass a
 * wrapping element with the appropriate aria-label.
 */

type Size = "sm" | "md" | "lg";

type Props = {
  name: string;
  size?: Size;
  /** Future photo-upload support. Currently null/undefined for every
   *  caller; component falls back to initials tile. */
  photoUrl?: string | null;
  className?: string;
};

const SIZE_PX: Record<Size, number> = {
  sm: 32,
  md: 40,
  lg: 64,
};

const FONT_CLASS: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-xl",
};

/**
 * Avatar background palette. 10 colors, sorted by hue from red
 * around the wheel back to red. All have lightness ≈ 85–92% and
 * saturation ≈ 15–25%, so they harmonize as a set, contrast cleanly
 * with text-[#0A0A0A] (WCAG AAA), and don't compete with the tag
 * pills (VIP amber / Regular emerald / New sky) that live in the
 * adjacent cell.
 *
 * Reordering this array WILL shift every existing client's color —
 * acceptable, but should be a deliberate decision. The hue-sorted
 * order is the schelling point.
 */
const AVATAR_PALETTE = [
  "#F4D5D5", // dusty pink
  "#FCE4D8", // soft peach
  "#E8C8B6", // terracotta
  "#F5EBD8", // cream
  "#E5DDD0", // warm taupe
  "#DEDDC6", // olive
  "#D9E2D4", // sage green
  "#D9DEE5", // dusky blue
  "#E2DAE6", // soft lilac
  "#ECC9CE", // blush rose
] as const;

/**
 * Two-letter (or one-letter for single-name) initials. Edge-case map
 * documented in the Phase 9 PR 4 discovery report §2.
 *
 * Splits on whitespace, hyphens, AND apostrophes so European/Irish
 * surnames ("O'Brien", "D'Angelo") and hyphenated names ("Jean-Paul",
 * "Smith-Jones") yield two initials. Uses Array.from + first char so
 * surrogate pairs (emoji) and CJK characters don't split mid-grapheme.
 *
 * Hard rule: 2 initials max for visual consistency in a 32px circle.
 * 3+ word names ("Mary Lou Smith") use first + LAST (→ MS), which
 * keeps hyphenated last names ("Smith-Jones") readable.
 *
 * Co-located here, not in src/lib/, because there's exactly one
 * consumer. Promote to its own module when a second surface needs
 * initials.
 */
export function getInitials(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  const tokens = trimmed.split(/[\s\-']+/u).filter((t) => t.length > 0);
  if (tokens.length === 0) return "?";
  const firstChar = (s: string) => Array.from(s)[0] ?? "";
  if (tokens.length === 1) return firstChar(tokens[0]).toUpperCase();
  return (
    firstChar(tokens[0]) + firstChar(tokens[tokens.length - 1])
  ).toUpperCase();
}

/**
 * Picks the avatar background. Normalizes the seed (trim +
 * lowercase) so "  Sarah Johnson  " and "SARAH JOHNSON" land on the
 * same color as "Sarah Johnson". Empty / whitespace-only names get
 * the first palette entry; they'll also render "?" as the initial,
 * so visual identity stays consistent.
 */
function pickColor(name: string): string {
  const seed = (name ?? "").trim().toLowerCase();
  if (!seed) return AVATAR_PALETTE[0];
  return AVATAR_PALETTE[pickIndex(seed, AVATAR_PALETTE.length)];
}

export function ClientAvatar({
  name,
  size = "sm",
  photoUrl,
  className,
}: Props) {
  const px = SIZE_PX[size];

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={px}
        height={px}
        className={`shrink-0 rounded-full object-cover ${className ?? ""}`}
      />
    );
  }

  const initials = getInitials(name);
  const bg = pickColor(name);

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-[#0A0A0A] ${FONT_CLASS[size]} ${className ?? ""}`}
      style={{ backgroundColor: bg, width: px, height: px }}
    >
      {initials}
    </span>
  );
}
