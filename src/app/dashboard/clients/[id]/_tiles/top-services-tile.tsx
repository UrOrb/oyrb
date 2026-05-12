import { BentoTile } from "../../../_components/bento-tile";

/**
 * Top services tile — top 3 services this client has booked, ranked
 * by booking count.
 *
 * "Top" is by count of non-cancelled bookings. Deleted services
 * fall back to "(deleted service)" label so the tile doesn't crash
 * when the pro removed a service after a booking.
 */

export type TopService = {
  name: string;
  count: number;
};

type Props = {
  services: TopService[];
};

export function TopServicesTile({ services }: Props) {
  const empty = services.length === 0;

  return (
    <BentoTile
      className="col-span-2 sm:col-span-2 lg:col-span-2"
      ariaLabel="Top services"
    >
      <p className="text-sm font-semibold text-[#0A0A0A]">Top services</p>

      {empty ? (
        <p className="mt-2 text-xs leading-relaxed text-[#737373]">
          Nothing booked yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {services.slice(0, 3).map((s) => (
            <li
              key={s.name}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <span className="truncate text-[#525252]">{s.name}</span>
              <span className="shrink-0 font-mono text-[#737373]">
                {s.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </BentoTile>
  );
}
