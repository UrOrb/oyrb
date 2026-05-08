import { Megaphone } from "lucide-react";
import type { TopSourcesResult } from "@/lib/business-brain";

/**
 * Where bookings come from over the last 90 days. Sources combine
 * UTM source (when present) → classified referrer (when no UTM) →
 * "Direct" (public widget with no other signal) → "Unknown" (legacy
 * or manual bookings).
 *
 * Voice: pure observation. "32% of bookings come from Instagram" is
 * a fact. Never "you should focus more on Instagram."
 *
 * Sample-size: ≥10 bookings in 90 days. Below threshold the card
 * surfaces an honest "Currently N." count.
 */
export function TopSourcesCard({ data }: { data: TopSourcesResult }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Top sources
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Top sources appear here once you have at least 10 bookings in the last 90 days.
          Currently {data.totalBookings}.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {data.sources.map((s) => (
            <Bar
              key={s.source}
              label={s.source}
              count={s.bookingCount}
              pct={s.pct}
              tone={toneFor(s.source)}
            />
          ))}
          <p className="pt-2 text-[11px] leading-relaxed text-[#A3A3A3]">
            Sources combine UTM tags from your storefront URL when present, then the referring
            site (Instagram, Google, TikTok, etc.), then &ldquo;Direct&rdquo; for typed-URL or
            bookmarked visits, then &ldquo;Unknown&rdquo; for legacy or manual bookings.
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

/**
 * Per-source bar tones. Branded sources get a recognizable hint;
 * "Direct" and "Unknown" use the platform's neutral palette so
 * they read as neutral fallbacks rather than negative signals.
 */
function toneFor(source: string): string {
  switch (source) {
    case "Instagram":
      return "bg-pink-500";
    case "TikTok":
      return "bg-[#0A0A0A]";
    case "Google":
      return "bg-blue-500";
    case "Facebook":
      return "bg-blue-700";
    case "X / Twitter":
      return "bg-[#0A0A0A]";
    case "YouTube":
      return "bg-red-600";
    case "Linktree":
      return "bg-emerald-500";
    case "Pinterest":
      return "bg-red-500";
    case "Direct":
      return "bg-[#B8896B]";
    case "Unknown":
      return "bg-[#A3A3A3]";
    default:
      return "bg-[#525252]";
  }
}
