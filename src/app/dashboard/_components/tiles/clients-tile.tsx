import { Users } from "lucide-react";
import { BentoTile, EmptyTileState, TileTitle } from "../bento-tile";

/**
 * Clients tile — total client count + new-this-week. "New" is
 * `clients.created_at >= weekStart`, where weekStart is the same
 * Mon-anchored boundary the rest of the bento uses (passed in from
 * the parent page so the math stays consistent with the Money tile).
 */
export function ClientsTile({
  totalClients,
  newThisWeek,
}: {
  totalClients: number;
  newThisWeek: number;
}) {
  return (
    <BentoTile
      href="/dashboard/clients"
      className="col-span-1 sm:col-span-2 lg:col-span-2"
      ariaLabel="Clients"
    >
      <TileTitle>Clients</TileTitle>

      {totalClients === 0 ? (
        <EmptyTileState icon={<Users size={13} strokeWidth={1.6} />}>
          Your client list starts at zero. Import past clients from{" "}
          <span className="font-medium text-[#525252]">
            /dashboard/clients/imports
          </span>
          .
        </EmptyTileState>
      ) : (
        <>
          <p className="font-display mt-3 text-3xl font-medium tracking-tight text-[#0A0A0A]">
            {totalClients.toLocaleString("en-US")}
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            {newThisWeek > 0
              ? `+${newThisWeek} new this week`
              : "active client list"}
          </p>
        </>
      )}
    </BentoTile>
  );
}
