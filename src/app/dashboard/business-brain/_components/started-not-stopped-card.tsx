import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { StartedNotStopped } from "@/lib/business-brain";

/**
 * Operational hygiene card. Lists bookings in the last 30 days where
 * the pro tapped Start AND the booking has since been marked
 * completed (auto-complete cron or manual flip), but Stop was never
 * tapped. Sample-size: none — surfaces all stuck bookings, capped at
 * 5 visible.
 *
 * "+X more" is informational text only — no clickable link, no
 * filtered-list view in v1. Pros encounter the full set as they visit
 * individual booking detail pages in their normal workflow. If users
 * ask for a filtered list later, build it as a follow-up.
 *
 * Voice: "These services were started but never marked complete" —
 * centers the data state, doesn't subtly imply the pro forgot.
 *
 * Distinct from the other Phase 3 cards: this surface needs only the
 * Start tap to populate, not the Start + Stop pair the analytics
 * cards require. So it can show useful data even when Schedule
 * Accuracy and By-service Timing are still in their empty states.
 */
export function StartedNotStoppedCard({ data }: { data: StartedNotStopped }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Started but not stopped
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 30 days</p>
      </header>

      {data.totalCount === 0 ? (
        <p className="mt-4 text-sm text-[#737373]">
          All your timed services have complete records.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-[#525252]">
            These services were started but never marked complete.
          </p>
          <ul className="mt-3 space-y-2">
            {data.visible.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/dashboard/bookings/${b.id}`}
                  className="block rounded-xl border border-[#EDE9E4] bg-white/70 p-3 hover:border-[#B8896B]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#0A0A0A]">{b.clientName}</p>
                    <p className="text-[11px] text-[#737373]">
                      Started {b.serviceStartedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#737373]">{b.serviceName}</p>
                </Link>
              </li>
            ))}
          </ul>
          {data.moreCount > 0 && (
            <p className="mt-3 text-[11px] text-[#737373]">
              +{data.moreCount} more booking{data.moreCount === 1 ? "" : "s"} have this state —
              they&apos;ll surface here as you visit their detail pages.
            </p>
          )}
        </>
      )}
    </section>
  );
}
