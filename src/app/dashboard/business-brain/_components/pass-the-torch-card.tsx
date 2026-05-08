import { Flame } from "lucide-react";
import type { PassTheTorchData } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";

/**
 * Pass the Torch attribution card. Surfaces bookings that came in
 * via the platform-internal ?ref=<slug> referral flow.
 *
 * Sample-size guard: ≥1 booking in the 90-day window. Pass the Torch
 * is rare enough that we surface it as soon as it exists — pros want
 * to know the moment a Trusted Pro sends them work.
 *
 * Shows total bookings, total revenue collected through OYRB on those
 * bookings (via aggregateMoney for consistency with the Money tab),
 * and the top 3 referring pros by booking count.
 *
 * Privacy note: showing referring pro names is intentional. The
 * referring pro chose to share their booking link with someone — the
 * fact of that referral is not private information, and the receiving
 * pro genuinely benefits from knowing who's sending work their way.
 *
 * Visual: OYRB accent (#B8896B) framing makes this card recognizable
 * as the platform's own referral mechanism, distinct from external
 * sources (Instagram, Google, etc.) that get their own brand colors
 * on the Top Sources card.
 */
export function PassTheTorchCard({ data }: { data: PassTheTorchData }) {
  return (
    <section className="rounded-2xl border border-[#B8896B]/40 bg-[#FAFAF9] p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-[#B8896B]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Pass the Torch referrals
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasAny ? (
        <p className="mt-4 text-sm text-[#737373]">
          Your Pass the Torch referrals will appear here once a Trusted Pro sends a client your
          way. Share your booking link with your Trusted Pros.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Stat
              label="Bookings"
              value={data.bookingCount.toString()}
              sublabel={
                data.uniqueReferringPros === 1
                  ? "from 1 referring pro"
                  : `from ${data.uniqueReferringPros} referring pros`
              }
            />
            <Stat
              label="Revenue collected"
              value={formatCents(data.revenueCollectedCents)}
              sublabel={
                data.revenueCollectedCents === 0
                  ? "Collected outside OYRB"
                  : "Through OYRB"
              }
            />
            <Stat
              label="Top referrer"
              value={data.topReferrers[0]?.name ?? "—"}
              sublabel={
                data.topReferrers[0]
                  ? `${data.topReferrers[0].bookingCount} booking${
                      data.topReferrers[0].bookingCount === 1 ? "" : "s"
                    }`
                  : ""
              }
            />
          </div>

          {data.topReferrers.length > 1 && (
            <div className="mt-4 border-t border-[#E7E5E4] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                All referring pros
              </p>
              <ol className="mt-2 space-y-1.5">
                {data.topReferrers.map((r, idx) => (
                  <li
                    key={r.referrerBusinessId}
                    className="flex items-baseline justify-between gap-3 text-xs"
                  >
                    <span className="text-[#525252]">
                      <span className="mr-2 text-[#A3A3A3]">{idx + 1}.</span>
                      {r.name}
                    </span>
                    <span className="tabular-nums text-[#737373]">
                      {r.bookingCount} booking{r.bookingCount === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-[#A3A3A3]">
            Pass the Torch attribution applies when a client books via{" "}
            <code className="rounded bg-white px-1 py-0.5 text-[10px] text-[#0A0A0A]">?ref=…</code>
            on your storefront URL — typically when another OYRB pro shares your link from their
            own Trusted Pros section.
          </p>
        </>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3]">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-medium text-[#0A0A0A] tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-[#737373]">{sublabel}</p>
    </div>
  );
}
