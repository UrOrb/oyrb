import { LineChart } from "lucide-react";
import type { MoneyTrend } from "@/lib/business-brain";
import { AreaChart } from "../../_charts/area-chart";

/**
 * Phase 9 PR 6 — replaces the hand-rolled-bar MoneyTrendCard with a
 * Recharts spline area chart. Same MoneyTrend data, same empty-state
 * copy and ≥4-weeks-of-data threshold; only the visualization changes.
 *
 * The hero metric (total over the visible window) sits as a stat
 * above the chart so glance-readers get the headline before the trend.
 */
export function MoneyTrendAreaCard({ trend }: { trend: MoneyTrend }) {
  if (!trend.hasEnoughData) {
    return (
      <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
        <Header />
        <p className="mt-4 text-sm text-[#737373]">
          Building trend data — your weekly revenue chart shows up after at least 4 weeks of bookings.
        </p>
      </section>
    );
  }

  const total = trend.points.reduce((s, p) => s + p.grossCents, 0);
  // Pre-convert cents → whole dollars before handing to the chart;
  // <AreaChart> can't take a formatter function across the server →
  // client boundary (Next.js 16 / React 19 serializability rule), so
  // it accepts a `format="currency"` hint and trusts the caller to
  // pass dollar-shaped numbers.
  const data = trend.points.map((p) => ({
    label: p.label,
    dollars: p.grossCents / 100,
  }));

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <Header />

      <p className="font-display mt-3 text-3xl font-medium tracking-tight text-[#0A0A0A]">
        ${(total / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}
      </p>
      <p className="mt-0.5 text-xs text-[#737373]">
        Gross over {trend.points.length} weeks
      </p>

      <div className="mt-4">
        <AreaChart
          data={data}
          xKey="label"
          yKey="dollars"
          format="currency"
          height={140}
          ariaLabel="Weekly revenue trend"
        />
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <LineChart size={16} className="text-[#737373]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Revenue trend
        </h2>
      </div>
      <p className="text-[11px] text-[#A3A3A3]">Weekly</p>
    </header>
  );
}
