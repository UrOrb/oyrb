import { BentoTile } from "../../../_components/bento-tile";

/**
 * Spend tile — lifetime spend + average per visit.
 *
 * Mirrors the Visits tile shape. "Spend" here is gross — sum of
 * services.price_cents on non-cancelled bookings. Same math the
 * clients list page already uses for the spend column.
 */

function dollars(cents: number): string {
  if (cents === 0) return "$0";
  return `$${(cents / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

type Props = {
  lifetimeCents: number;
  totalVisits: number;
};

export function SpendTile({ lifetimeCents, totalVisits }: Props) {
  const empty = lifetimeCents === 0;
  const avgCents = totalVisits > 0 ? Math.round(lifetimeCents / totalVisits) : 0;

  return (
    <BentoTile
      className="col-span-1 sm:col-span-2 lg:col-span-2"
      ariaLabel="Spend"
    >
      <p className="text-sm font-semibold text-[#0A0A0A]">Spend</p>

      {empty ? (
        <p className="mt-2 text-xs leading-relaxed text-[#737373]">
          $0 — no purchases yet.
        </p>
      ) : (
        <>
          <p className="font-display mt-3 text-3xl font-medium tracking-tight text-[#0A0A0A]">
            {dollars(lifetimeCents)}
          </p>
          {totalVisits > 0 && (
            <p className="mt-1 text-xs text-[#737373]">
              Avg {dollars(avgCents)} / visit
            </p>
          )}
        </>
      )}
    </BentoTile>
  );
}
