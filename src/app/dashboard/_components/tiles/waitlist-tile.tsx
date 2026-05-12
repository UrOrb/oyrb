import { BentoTile } from "../bento-tile";

/**
 * Waitlist tile — just the count. Compact stat tile (1 col on desktop).
 */
export function WaitlistTile({ count }: { count: number }) {
  return (
    <BentoTile
      href="/dashboard/waitlist"
      className="col-span-1 sm:col-span-1 lg:col-span-1"
      ariaLabel="Waitlist"
    >
      <p className="text-sm font-semibold text-[#0A0A0A]">Waitlist</p>

      {count === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-[#737373]">
          No one on your waitlist.
        </p>
      ) : (
        <>
          <p className="font-display mt-3 text-3xl font-medium tracking-tight text-[#0A0A0A]">
            {count}
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            {count === 1 ? "person waiting" : "people waiting"}
          </p>
        </>
      )}
    </BentoTile>
  );
}
