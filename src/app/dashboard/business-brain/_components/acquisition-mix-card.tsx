import { Sparkles } from "lucide-react";
import type { AcquisitionMix } from "@/lib/business-brain";

/**
 * New vs returning split for the last 90 days. A booking counts as
 * "new" when its start_at is the client's first booking ever on this
 * business; otherwise "returning."
 *
 * Two horizontal bars, percentages and absolute counts. Sample-size
 * ≥10 bookings — below that, percentages are too noisy to be useful.
 *
 * Voice: pure observation. The mix isn't good or bad. A pro who's
 * acquisition-driven and one who's retention-driven both have valid
 * businesses; this card just surfaces which they are.
 */
export function AcquisitionMixCard({ data }: { data: AcquisitionMix }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Acquisition mix
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Acquisition mix appears here once you have at least 10 bookings in the last 90 days.
          Currently {data.totalBookings}.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <Bar
            label="New client bookings"
            count={data.newClientBookings}
            pct={data.newClientPct}
            tone="bg-[#B8896B]"
          />
          <Bar
            label="Returning client bookings"
            count={data.returningClientBookings}
            pct={data.returningClientPct}
            tone="bg-[#0A0A0A]"
          />
          <p className="text-[11px] text-[#A3A3A3]">
            A booking counts as &ldquo;new&rdquo; when it&apos;s the client&apos;s first ever on
            your business. Total: {data.totalBookings} non-cancelled bookings in the window.
          </p>
        </div>
      )}
    </section>
  );
}

function Bar({
  label,
  count,
  pct,
  tone,
}: {
  label: string;
  count: number;
  pct: number;
  tone: string;
}) {
  const widthPct = Math.round(pct * 100);
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <p className="font-medium text-[#0A0A0A]">{label}</p>
        <p className="tabular-nums text-[#525252]">
          <span className="font-semibold text-[#0A0A0A]">{widthPct}%</span> · {count} booking
          {count === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F5F5F4]">
        <div className={`h-full ${tone}`} style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  );
}
