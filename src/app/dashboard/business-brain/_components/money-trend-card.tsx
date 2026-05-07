import { LineChart } from "lucide-react";
import type { MoneyTrend } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";

/**
 * Hand-rolled bar chart of weekly gross revenue over the last 4-12
 * weeks. No chart library — Tailwind divs with dynamic heights, same
 * pattern as the schedule-density card.
 *
 * Sample-size guard: needs ≥4 weeks of data. The lib trims leading
 * zero-revenue weeks (so a brand-new pro doesn't see 8 empty bars
 * before their first booking week), but always keeps at least 4
 * weeks if available — gives the trend chart enough context to be
 * meaningful.
 */
const MIN_BAR_HEIGHT_PX = 4;
const MAX_BAR_HEIGHT_PX = 96;

export function MoneyTrendCard({ trend }: { trend: MoneyTrend }) {
  if (!trend.hasEnoughData) {
    return (
      <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
        <Header />
        <p className="mt-4 text-sm text-[#737373]">
          Building trend data — your weekly revenue chart shows up after at least 4 weeks of
          bookings.
        </p>
      </section>
    );
  }

  const max = trend.points.reduce((m, p) => Math.max(m, p.grossCents), 0);
  const total = trend.points.reduce((s, p) => s + p.grossCents, 0);

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <Header />

      <div className="mt-5 flex h-32 items-end justify-between gap-1.5">
        {trend.points.map((p, idx) => {
          const isLatest = idx === trend.points.length - 1;
          const heightPx =
            max === 0
              ? MIN_BAR_HEIGHT_PX
              : Math.max(
                  MIN_BAR_HEIGHT_PX,
                  Math.round((p.grossCents / max) * MAX_BAR_HEIGHT_PX),
                );
          return (
            <div
              key={p.label}
              className="flex flex-1 flex-col items-center gap-1.5"
              title={`Week of ${p.label}: ${formatCents(p.grossCents)}`}
            >
              <div
                className={`w-full rounded-t ${isLatest ? "bg-[#B8896B]" : "bg-[#0A0A0A]"}`}
                style={{ height: `${heightPx}px` }}
              />
              <span
                className={`text-[9px] uppercase tracking-wider ${
                  isLatest ? "font-semibold text-[#B8896B]" : "text-[#A3A3A3]"
                }`}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-[#737373]">
        {trend.points.length}-week total:{" "}
        <strong className="text-[#0A0A0A] tabular-nums">{formatCents(total)}</strong>. Latest
        week highlighted.
      </p>
    </section>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <LineChart size={16} className="text-[#737373]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Weekly revenue trend
        </h2>
      </div>
      <p className="text-[11px] text-[#A3A3A3]">Gross on calendar</p>
    </header>
  );
}
