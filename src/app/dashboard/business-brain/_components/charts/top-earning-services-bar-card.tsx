import { Trophy } from "lucide-react";
import type { TopService } from "@/lib/business-brain";
import { HorizontalBar } from "../../_charts/horizontal-bar";

/**
 * Phase 9 PR 6 — replaces the ranked-text TopEarningServicesCard
 * with a horizontal bar chart. Same data, same empty-state guard
 * (needs ≥3 distinct services with bookings in window).
 *
 * Bar lengths visualize relative revenue contribution. Hovering a
 * bar shows the dollar total via the chart's Tooltip; values are
 * formatted as USD without cents (the bar chart isn't where
 * cents-precision matters).
 */
export function TopEarningServicesBarCard({
  services,
  hasEnoughData,
}: {
  services: TopService[];
  hasEnoughData: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
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
        <div className="mt-4">
          <HorizontalBar
            data={services.map((s) => ({
              label: s.name,
              // Pre-convert cents → dollars; <HorizontalBar> takes a
              // `format="currency"` hint and trusts the caller to pass
              // dollar-shaped numbers. (Server components can't pass
              // formatter functions to client components.)
              value: s.totalRevenueCents / 100,
            }))}
            format="currency"
            height={Math.max(120, services.length * 36)}
            ariaLabel="Top earning services"
          />
        </div>
      )}
    </section>
  );
}
