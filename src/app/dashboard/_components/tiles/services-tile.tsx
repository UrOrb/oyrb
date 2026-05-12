import { Plus } from "lucide-react";
import { BentoTile } from "../bento-tile";

/**
 * Services tile — top 3 active services by name. Sized as a tall
 * narrow tile on desktop (1 col × 1 row in the bottom row); takes
 * 2 cols on tablet/mobile so the names don't truncate.
 *
 * "Top" here just means the first 3 returned by created_at desc —
 * a future PR can rank by booking count, but that requires a join
 * + group-by that isn't worth the cost for v1.
 */

export type ServiceTileItem = {
  id: string;
  name: string;
  priceCents: number;
};

export function ServicesTile({
  services,
}: {
  services: ServiceTileItem[];
}) {
  const empty = services.length === 0;
  return (
    <BentoTile
      href="/dashboard/services"
      className="col-span-1 sm:col-span-2 lg:col-span-1"
      ariaLabel="Services"
    >
      <p className="text-sm font-semibold text-[#0A0A0A]">Services</p>

      {empty ? (
        <div className="mt-2">
          <p className="text-xs leading-relaxed text-[#737373]">
            Add your first service to start taking bookings.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#0A0A0A]">
            <Plus size={11} strokeWidth={1.5} /> Add service
          </span>
        </div>
      ) : (
        <ul className="mt-2 space-y-1">
          {services.slice(0, 3).map((s) => (
            <li
              key={s.id}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <span className="truncate text-[#525252]">{s.name}</span>
              <span className="shrink-0 font-mono text-[#737373]">
                ${(s.priceCents / 100).toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </BentoTile>
  );
}
