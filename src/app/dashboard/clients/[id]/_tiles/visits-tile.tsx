/* eslint-disable react-hooks/purity */
import { BentoTile } from "../../../_components/bento-tile";

/**
 * Visits tile — total count + last-visit date + suggested-next.
 *
 * Suggested-next is amber when overdue (>1 day past). Real signal pros
 * need at a glance; matches the convention from the clients list page
 * where "Suggested next" lights up amber when past-due.
 *
 * Total count uses font-display text-3xl per Phase 9 tile typography.
 * Empty state: "0 visits — first appointment will show up here."
 */
type Props = {
  totalVisits: number;
  lastVisitAt: Date | null;
  suggestedNext: Date | null;
};

export function VisitsTile({
  totalVisits,
  lastVisitAt,
  suggestedNext,
}: Props) {
  const empty = totalVisits === 0;
  const overdue =
    suggestedNext !== null && suggestedNext.getTime() < Date.now();

  return (
    <BentoTile
      className="col-span-1 sm:col-span-2 lg:col-span-2"
      ariaLabel="Visits"
    >
      <p className="text-sm font-semibold text-[#0A0A0A]">Visits</p>

      {empty ? (
        <p className="mt-2 text-xs leading-relaxed text-[#737373]">
          0 visits — first appointment will show up here.
        </p>
      ) : (
        <>
          <p className="font-display mt-3 text-3xl font-medium tracking-tight text-[#0A0A0A]">
            {totalVisits.toLocaleString("en-US")}
          </p>
          {lastVisitAt && (
            <p className="mt-1 text-xs text-[#737373]">
              Last visit {lastVisitAt.toLocaleDateString()}
            </p>
          )}
          {suggestedNext && (
            <p
              className={`mt-0.5 text-xs ${
                overdue ? "font-semibold text-amber-700" : "text-[#737373]"
              }`}
            >
              {overdue ? "Overdue — " : "Suggested next: "}
              {suggestedNext.toLocaleDateString()}
            </p>
          )}
        </>
      )}
    </BentoTile>
  );
}
