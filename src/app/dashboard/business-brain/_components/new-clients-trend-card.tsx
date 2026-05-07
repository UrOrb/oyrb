import { Sparkles } from "lucide-react";
import type { NewClientsTrend } from "@/lib/business-brain";

/**
 * 6-month bar chart of new-client acquisitions per month. A "new
 * client" is one whose FIRST booking on this business happened in
 * that month — derived from min(bookings.start_at) per client_id,
 * NOT from clients.created_at (which can drift when pros pre-create
 * client records via manual booking entry).
 *
 * Sample-size: ≥1 month with new clients to render. Otherwise the
 * empty state explains what populates it.
 *
 * Latest month bar is highlighted in accent so direction-of-trend is
 * visible at a glance.
 */
const MIN_BAR_HEIGHT_PX = 4;
const MAX_BAR_HEIGHT_PX = 96;

export function NewClientsTrendCard({ data }: { data: NewClientsTrend }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            New clients
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 6 months</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Your monthly new-client trend appears here as clients book for the first time.
        </p>
      ) : (
        <>
          <div className="mt-5 flex h-32 items-end justify-between gap-2">
            {data.buckets.map((b, idx) => {
              const max = data.buckets.reduce(
                (m, x) => Math.max(m, x.count),
                0,
              );
              const isLatest = idx === data.buckets.length - 1;
              const heightPx =
                max === 0
                  ? MIN_BAR_HEIGHT_PX
                  : Math.max(
                      MIN_BAR_HEIGHT_PX,
                      Math.round((b.count / max) * MAX_BAR_HEIGHT_PX),
                    );
              return (
                <div
                  key={b.monthKey}
                  className="flex flex-1 flex-col items-center gap-1.5"
                  title={`${b.label}: ${b.count} new client${b.count === 1 ? "" : "s"}`}
                >
                  <span
                    className={`text-[10px] font-semibold tabular-nums ${
                      isLatest ? "text-[#B8896B]" : "text-[#525252]"
                    }`}
                  >
                    {b.count > 0 ? b.count : ""}
                  </span>
                  <div
                    className={`w-full rounded-t ${isLatest ? "bg-[#B8896B]" : "bg-[#0A0A0A]"}`}
                    style={{ height: `${heightPx}px` }}
                  />
                  <span
                    className={`text-[10px] uppercase tracking-wider ${
                      isLatest ? "font-semibold text-[#B8896B]" : "text-[#A3A3A3]"
                    }`}
                  >
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-[#737373]">
            {data.totalNew} new client{data.totalNew === 1 ? "" : "s"} acquired across the last 6
            months. Latest month highlighted.
          </p>
        </>
      )}
    </section>
  );
}
