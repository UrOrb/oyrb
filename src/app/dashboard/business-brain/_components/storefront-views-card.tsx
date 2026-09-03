import { Eye } from "lucide-react";
import type { ViewsData } from "@/lib/business-brain";

/**
 * Total storefront views in the last 90 days plus an 8-week trend
 * chart. Hand-rolled bar chart matches the schedule density / money
 * trend / new clients trend patterns. Latest week highlighted in
 * accent.
 *
 * Sample-size guard: ≥10 views in 90 days. Below threshold the card
 * surfaces an honest "Currently N." count.
 */
const MIN_BAR_HEIGHT_PX = 4;
const MAX_BAR_HEIGHT_PX = 96;

export function StorefrontViewsCard({ data }: { data: ViewsData }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Storefront views
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Storefront views appear here once you have at least 10 in the last 90 days. Currently{" "}
          {data.totalViews}.
        </p>
      ) : (
        <>
          <div className="mt-4">
            <p className="font-display text-3xl font-medium text-[#0A0A0A] tabular-nums">
              {data.totalViews.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-[#737373]">
              {data.totalViews === 1 ? "view" : "views"} over the last 90 days
            </p>
          </div>

          <div className="mt-5 flex h-32 items-end justify-between gap-1.5">
            {data.trend.map((p, idx) => {
              const max = data.trend.reduce((m, x) => Math.max(m, x.count), 0);
              const isLatest = idx === data.trend.length - 1;
              const heightPx =
                max === 0
                  ? MIN_BAR_HEIGHT_PX
                  : Math.max(
                      MIN_BAR_HEIGHT_PX,
                      Math.round((p.count / max) * MAX_BAR_HEIGHT_PX),
                    );
              return (
                <div
                  key={p.label}
                  className="flex flex-1 flex-col items-center gap-1.5"
                  title={`Week of ${p.label}: ${p.count} view${p.count === 1 ? "" : "s"}`}
                >
                  <span
                    className={`text-[9px] tabular-nums ${
                      isLatest ? "font-semibold text-[#B8896B]" : "text-[#A3A3A3]"
                    }`}
                  >
                    {p.count > 0 ? p.count : ""}
                  </span>
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
          <p className="mt-3 text-[11px] leading-relaxed text-[#A3A3A3]">
            Views are deduplicated within a 30-minute session — a client refreshing your
            storefront five times in 10 minutes counts as one engaged session, not five views.
          </p>
        </>
      )}
    </section>
  );
}
