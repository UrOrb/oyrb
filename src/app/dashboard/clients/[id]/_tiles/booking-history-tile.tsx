import Link from "next/link";
import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { BentoTile } from "../../../_components/bento-tile";

/**
 * Booking history tile — last 12 bookings for this client.
 *
 * Each row is a Link to /dashboard/bookings/[id]. Compact 1-line
 * layout: date · time · service · status icon · price. Status
 * differentiation via small lucide icons rather than text pills
 * (the tile is dense enough already).
 *
 * Truncated to last 12 with a footer "Showing last 12 of N" when
 * truncated. No "View all" link in v1 — a dedicated per-client
 * bookings page doesn't exist yet (future PR).
 *
 * Empty state: "No bookings yet. Their first appointment will
 * appear here."
 */

export type HistoryBooking = {
  id: string;
  startAt: Date;
  serviceName: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | string;
  priceCents: number | null;
};

type Props = {
  bookings: HistoryBooking[];
  totalCount: number;
};

export function BookingHistoryTile({ bookings, totalCount }: Props) {
  const empty = bookings.length === 0;
  const truncated = totalCount > bookings.length;

  return (
    <BentoTile
      className="col-span-2 sm:col-span-4 lg:col-span-4 lg:row-span-2"
      ariaLabel="Booking history"
    >
      <p className="text-sm font-semibold text-[#0A0A0A]">Booking history</p>

      {empty ? (
        <p className="mt-2 text-xs leading-relaxed text-[#737373]">
          No bookings yet. Their first appointment will appear here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[#F0EFEC]">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link
                href={`/dashboard/bookings/${b.id}`}
                className="flex items-baseline gap-3 py-2 text-sm text-[#525252] hover:text-[#0A0A0A]"
              >
                <span className="w-24 shrink-0 font-mono text-xs text-[#737373]">
                  {formatWhen(b.startAt)}
                </span>
                <span className="flex-1 truncate">
                  <StatusIcon status={b.status} />
                  <span className={b.status === "cancelled" ? "line-through" : ""}>
                    {b.serviceName}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-[#737373]">
                  {b.priceCents != null
                    ? `$${(b.priceCents / 100).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}`
                    : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {truncated && (
        <p className="mt-3 text-[11px] text-[#A3A3A3]">
          Showing last {bookings.length} of {totalCount} bookings.
        </p>
      )}
    </BentoTile>
  );
}

function StatusIcon({ status }: { status: string }) {
  const common = "mr-1.5 inline-block align-middle";
  if (status === "completed") {
    return (
      <CheckCircle2
        size={12}
        strokeWidth={2}
        className={`${common} text-emerald-600`}
        aria-label="completed"
      />
    );
  }
  if (status === "cancelled") {
    return (
      <XCircle
        size={12}
        strokeWidth={2}
        className={`${common} text-[#A3A3A3]`}
        aria-label="cancelled"
      />
    );
  }
  if (status === "pending") {
    return (
      <Clock
        size={12}
        strokeWidth={2}
        className={`${common} text-amber-600`}
        aria-label="pending"
      />
    );
  }
  // confirmed (default)
  return (
    <Circle
      size={12}
      strokeWidth={2}
      className={`${common} text-sky-600`}
      aria-label="confirmed"
    />
  );
}

function formatWhen(start: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  }).format(start);
}
