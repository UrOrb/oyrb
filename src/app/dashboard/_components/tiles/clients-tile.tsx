import { BentoTile } from "../bento-tile";

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
      <p className="text-sm font-semibold text-[#0A0A0A]">Clients</p>

      {totalClients === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-[#737373]">
          Your client list starts at zero. Import past clients from{" "}
          <span className="font-medium text-[#525252]">
            /dashboard/clients/imports
          </span>
          .
        </p>
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
