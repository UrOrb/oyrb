import { UserPlus } from "lucide-react";
import type { NewClientsTrend } from "@/lib/business-brain";
import { AreaChart } from "../../_charts/area-chart";

/**
 * Phase 9 PR 6 — New clients trend as a spline area chart.
 *
 * Replaces NewClientsTrendCard's text/bar treatment with a proper
 * area chart of monthly new-client counts. Same NEW_CLIENTS_TREND_
 * MONTHS buckets, oldest-first ordering.
 */
export function NewClientsTrendAreaCard({
  trend,
}: {
  trend: NewClientsTrend;
}) {
  if (!trend.hasEnoughData) {
    return (
      <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
        <Header />
        <p className="mt-4 text-sm text-[#737373]">
          New clients trend appears once you have your first new-client booking in window.
        </p>
      </section>
    );
  }

  const data = trend.buckets.map((b) => ({
    label: b.label,
    count: b.count,
  }));

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <Header />
      <p className="font-display mt-3 text-3xl font-medium tracking-tight text-[#0A0A0A]">
        {trend.totalNew}
      </p>
      <p className="mt-0.5 text-xs text-[#737373]">
        new client{trend.totalNew === 1 ? "" : "s"} over {trend.buckets.length} months
      </p>
      <div className="mt-4">
        <AreaChart
          data={data}
          xKey="label"
          yKey="count"
          formatY={(v) => `${v}`}
          height={140}
          ariaLabel="Monthly new clients"
        />
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <UserPlus size={16} className="text-[#737373]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          New clients trend
        </h2>
      </div>
      <p className="text-[11px] text-[#A3A3A3]">Monthly</p>
    </header>
  );
}
