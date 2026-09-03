import { Trophy } from "lucide-react";
import type { TopClientsLTVResult } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";

/**
 * Top 5 clients by all-time revenue. Two columns always shown
 * (Bookings + Revenue collected) so pros without Stripe Connect can
 * still rank by booking volume.
 *
 * Auto-fall-back: when revenueCollectedCents === 0 across the top-5
 * candidates, the data layer pivots to ranking-by-booking-volume and
 * sets rankedByBookingVolume=true. Card surfaces the explainer
 * footer in that case.
 *
 * Privacy: client name only — no email/phone here. Those live on
 * /dashboard/clients (operational surface).
 */
export function TopClientsByLTVCard({ data }: { data: TopClientsLTVResult }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Top clients
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">All-time</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Your top clients appear here once you have at least 5 clients with 2+ bookings each.
        </p>
      ) : (
        <>
          <ol className="mt-4 space-y-2">
            {data.rows.map((c, idx) => (
              <li
                key={c.clientId}
                className="rounded-xl border border-[#EDE9E4] bg-white/70 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0A0A0A]">
                      <span className="mr-2 text-[#A3A3A3]">{idx + 1}.</span>
                      {c.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#737373]">
                      Last booked{" "}
                      {c.lastBookingAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-4 tabular-nums">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3]">
                        Bookings
                      </p>
                      <p className="text-sm font-semibold text-[#0A0A0A]">{c.bookingCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3]">
                        Revenue
                      </p>
                      <p className="text-sm font-semibold text-[#0A0A0A]">
                        {formatCents(c.revenueCollectedCents)}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {data.rankedByBookingVolume && (
            <p className="mt-3 text-[11px] text-[#737373]">
              Your clients pay outside OYRB — ranking by booking volume.
            </p>
          )}
        </>
      )}
    </section>
  );
}
