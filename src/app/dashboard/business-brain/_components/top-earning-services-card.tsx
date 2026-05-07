import { Trophy } from "lucide-react";
import type { TopService } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";

/**
 * Top 5 services by gross revenue over the last 90 days.
 *
 * Sample-size guard: requires ≥3 distinct services with bookings in
 * window. Below that, the empty state renders instead. Reasoning: a
 * pro with 1-2 services in their book gets no useful "ranking" signal
 * from a top-5 list — it's just their full menu. The list shines once
 * a pro has a varied service menu and wants to see which lines drive
 * revenue.
 */
export function TopEarningServicesCard({
  services,
  hasEnoughData,
}: {
  services: TopService[];
  hasEnoughData: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Top-earning services
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Your top earners will appear here as you build booking history with a varied service menu.
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {services.map((s, idx) => {
            const max = services[0]?.totalRevenueCents ?? 0;
            const widthPct = max > 0 ? Math.max(8, (s.totalRevenueCents / max) * 100) : 0;
            return (
              <li
                key={s.serviceId}
                className="rounded-lg border border-[#F5F5F4] bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0A0A0A]">
                      <span className="mr-2 text-[#A3A3A3]">{idx + 1}.</span>
                      {s.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#737373]">
                      {s.bookingCount} booking{s.bookingCount === 1 ? "" : "s"} · avg{" "}
                      {formatCents(s.avgPriceCents)}
                    </p>
                  </div>
                  <p className="font-display text-base font-medium text-[#0A0A0A] tabular-nums">
                    {formatCents(s.totalRevenueCents)}
                  </p>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#F5F5F4]">
                  <div
                    className="h-full bg-[#B8896B]"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
