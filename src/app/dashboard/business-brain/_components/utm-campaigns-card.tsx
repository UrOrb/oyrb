import { Tag } from "lucide-react";
import type { UtmCampaignsResult } from "@/lib/business-brain";

/**
 * Top 5 explicit UTM campaigns by booking count, last 90 days.
 * Renders only when the pro has actively tagged campaigns — most
 * pros' first weeks of post-Phase-5 traffic will sit below the
 * sample-size guard, which is fine.
 *
 * Sample-size: ≥5 UTM-tagged bookings. Below threshold the card
 * surfaces a softer empty state inviting pros to tag their links.
 *
 * Voice: "campaign X drove N bookings" — observation, not a
 * recommendation. The pro decides whether that result was good.
 */
export function UtmCampaignsCard({ data }: { data: UtmCampaignsResult }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            UTM campaigns
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <div className="mt-4 rounded-lg bg-[#FAFAF9] p-4 text-sm text-[#525252]">
          <p className="leading-relaxed">
            Campaign breakdown appears here once at least 5 bookings come in via URLs tagged
            with <code className="rounded bg-[#FAFAF9] px-1.5 py-0.5 text-[11px] text-[#0A0A0A]">?utm_campaign=...</code>
            in the last 90 days.
          </p>
          <p className="mt-2 leading-relaxed">
            Add UTM tags to your storefront links anywhere you share them — bio link, paid ad,
            promo email, QR code on a flyer. Each tag becomes a row here.
          </p>
          {data.totalUtmTaggedBookings > 0 && (
            <p className="mt-3 text-[11px] text-[#737373]">
              {data.totalUtmTaggedBookings} of 5 needed so far.
            </p>
          )}
        </div>
      ) : (
        <ol className="mt-4 space-y-2">
          {data.rows.map((r, idx) => (
            <li
              key={r.utmCampaign}
              className="rounded-xl border border-[#EDE9E4] bg-white/70 p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0A0A0A]">
                    <span className="mr-2 text-[#A3A3A3]">{idx + 1}.</span>
                    <code className="text-[#0A0A0A]">{r.utmCampaign}</code>
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#737373]">
                    {r.utmSource ? `via ${r.utmSource}` : "no utm_source paired"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-[#0A0A0A] tabular-nums">
                  {r.bookingCount} booking{r.bookingCount === 1 ? "" : "s"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
