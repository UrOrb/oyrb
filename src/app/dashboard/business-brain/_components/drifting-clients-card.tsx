import Link from "next/link";
import { Wind } from "lucide-react";
import type { DriftingClients } from "@/lib/business-brain";

/**
 * Win-back opportunity card. Lists clients who used to be regulars
 * (3+ historical bookings) and went silent 60-180 days ago. Sorted
 * by historical revenue contribution. Top 5 visible.
 *
 * Distinct from /dashboard/clients's "Inactive" tag (which fires for
 * anyone past 60 days regardless of booking history). Drifting is
 * a SUBSET — pros who have a track record AND recently went quiet,
 * which is the actionable cohort. Pros can drop to /dashboard/clients
 * for contact details via the footer link.
 *
 * Voice: "These regulars haven't booked in a while" — observational,
 * never punishing. No projected revenue lost; pros draw their own
 * conclusions.
 */
export function DriftingClientsCard({ data }: { data: DriftingClients }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wind size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Drifting clients
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">60–180 day gap</p>
      </header>

      {data.totalCount === 0 ? (
        <p className="mt-4 text-sm text-[#737373]">
          No drifting clients to flag — your regulars are sticking around.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-[#525252]">
            These clients had 3+ bookings historically and haven&apos;t booked in 60–180 days.
          </p>
          <ul className="mt-3 space-y-2">
            {data.rows.map((c) => (
              <li
                key={c.clientId}
                className="rounded-xl border border-[#EDE9E4] bg-white/70 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0A0A0A]">{c.name}</p>
                    <p className="mt-0.5 text-[11px] text-[#737373]">
                      {c.historicalBookingCount} booking
                      {c.historicalBookingCount === 1 ? "" : "s"} all-time · last on{" "}
                      {c.lastBookingAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 tabular-nums">
                    {c.daysSinceLastBooking} days
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {data.totalCount > data.rows.length && (
            <p className="mt-3 text-[11px] text-[#737373]">
              +{data.totalCount - data.rows.length} more drifting client
              {data.totalCount - data.rows.length === 1 ? "" : "s"} beyond the top {data.rows.length}.
            </p>
          )}
          <p className="mt-4 border-t border-[#F5F5F4] pt-3 text-[11px] text-[#737373]">
            <Link
              href="/dashboard/clients"
              className="text-[#B8896B] underline-offset-2 hover:underline"
            >
              View contact details on the operational clients page →
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
