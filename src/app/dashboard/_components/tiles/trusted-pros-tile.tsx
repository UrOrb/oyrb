import { Flame } from "lucide-react";
import { BentoTile, EmptyTileState, TileTitle } from "../bento-tile";

/**
 * Trusted Pros tile — accepted count + pending badge.
 *
 * The pending count is already computed in dashboard/layout.tsx
 * (passed down to the sidebar nav badge) — the page reuses that
 * value so we don't run a duplicate query.
 *
 * Warm-brown badge is the ONE place in the bento where the brand
 * accent (#B8896B) shows up, mirroring the sidebar badge convention
 * from nav-links.tsx.
 */
export function TrustedProsTile({
  acceptedCount,
  pendingCount,
}: {
  acceptedCount: number;
  pendingCount: number;
}) {
  const empty = acceptedCount === 0 && pendingCount === 0;

  return (
    <BentoTile
      href="/dashboard/pass-the-torch"
      className="col-span-2 sm:col-span-1 lg:col-span-1"
      tone="soft"
      badge={
        pendingCount > 0 ? (
          <span
            aria-label={`${pendingCount} pending`}
            className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#B8896B] px-1.5 text-[11px] font-semibold text-white"
          >
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        ) : undefined
      }
      ariaLabel="Trusted Pros"
    >
      <TileTitle>Trusted Pros</TileTitle>

      {empty ? (
        <EmptyTileState icon={<Flame size={13} strokeWidth={1.6} />}>
          Build your trusted-pros circle.
        </EmptyTileState>
      ) : (
        <>
          <p className="font-display mt-3 text-3xl font-medium tracking-tight text-[#0A0A0A]">
            {acceptedCount}
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            {acceptedCount === 1 ? "trusted pro" : "trusted pros"}
          </p>
        </>
      )}
    </BentoTile>
  );
}
