import { UsersRound } from "lucide-react";
import type { RepeatClientOverview } from "@/lib/business-brain";

/**
 * At-a-glance repeat-client signals for the last 90 days. Three
 * stats in a grid: unique clients, % repeat, average bookings per
 * client. Sample-size guard: ≥10 unique clients in the window —
 * below that, percentages and averages are too noisy to be useful.
 *
 * Operational voice: pure observation, no judgment.
 */
export function RepeatClientOverviewCard({
  data,
}: {
  data: RepeatClientOverview;
}) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UsersRound size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Repeat clients
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Repeat-client signals appear here once you have at least 10 unique clients in the last
          90 days. Currently {data.uniqueClientsLast90}.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Stat
            label="Unique clients"
            value={data.uniqueClientsLast90.toString()}
            sublabel={`${data.totalBookingsLast90} booking${data.totalBookingsLast90 === 1 ? "" : "s"}`}
          />
          <Stat
            label="Repeat rate"
            value={`${Math.round(data.repeatRate * 100)}%`}
            sublabel={`${data.repeatClientsLast90} booked 2+ times`}
          />
          <Stat
            label="Avg bookings"
            value={data.avgBookingsPerClient.toFixed(1)}
            sublabel="per unique client"
          />
        </div>
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
      <p className="mt-1 font-display text-xl font-medium text-[#0A0A0A] tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-[#737373]">{sublabel}</p>
    </div>
  );
}
