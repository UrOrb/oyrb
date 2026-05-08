import { Filter } from "lucide-react";
import type { ConversionBySourceResult } from "@/lib/business-brain";

/**
 * Per-source conversion rate. Reveals which traffic sources actually
 * convert — Instagram might drive lots of views with low conversion,
 * while Pass the Torch might drive fewer views but at much higher
 * conversion. Operationally: which channel actually ships clients to
 * a confirmed booking.
 *
 * Source attribution uses the same priority chain as bookings
 * (attributeSource): Pass the Torch > UTM > classified referrer >
 * Direct > Unknown.
 *
 * Sample-size guard: ≥10 views per source row. A source with 2 views
 * and 1 booking would show 50% which is statistical noise. The data
 * layer drops sources below that floor.
 *
 * Voice: pure observation. "Instagram: 120 views, 3 bookings, 2.5%"
 * is a fact. The pro decides whether 2.5% is good for their business.
 */
export function ConversionBySourceCard({
  data,
}: {
  data: ConversionBySourceResult;
}) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Conversion by source
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Per-source conversion appears here once at least one source crosses 10 views in the
          last 90 days. Sources below that threshold are dropped to avoid noisy ratios.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {data.rows.map((r) => (
            <li
              key={r.source}
              className="rounded-lg border border-[#F5F5F4] bg-white p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-[#0A0A0A]">{r.source}</p>
                <p className="font-display text-base font-medium text-[#0A0A0A] tabular-nums">
                  {(r.conversionRate * 100).toFixed(1)}%
                </p>
              </div>
              <p className="mt-0.5 text-[11px] text-[#737373] tabular-nums">
                {r.views.toLocaleString()} view{r.views === 1 ? "" : "s"} →{" "}
                {r.bookings.toLocaleString()} booking{r.bookings === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
