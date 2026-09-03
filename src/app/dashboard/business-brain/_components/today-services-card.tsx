import Link from "next/link";
import { Sun } from "lucide-react";
import type { TodayService } from "@/lib/business-brain";
import { BrainCard, EmptyState } from "./brain-card";

/**
 * Today's services — list of bookings happening today, sorted by
 * start time. Each row is a link to the booking detail page so the
 * pro can drill in with one tap.
 *
 * Status pill is derived from the Phase 3 timing pings when present
 * and falls back to the booking status. Pros who don't use the
 * Start/Stop buttons (PR #28 was opt-in usage) just see "scheduled"
 * up to the appointment time and "past" after — graceful
 * degradation, no broken UI.
 */
const PROGRESS_STYLES: Record<TodayService["progressLabel"], { bg: string; fg: string; label: string }> = {
  scheduled:    { bg: "bg-[#FAFAF9]",   fg: "text-[#525252]",   label: "Scheduled" },
  in_progress:  { bg: "bg-emerald-50",  fg: "text-emerald-700", label: "In progress" },
  complete:     { bg: "bg-[#FAFAF9]",   fg: "text-[#525252]",   label: "Complete" },
  cancelled:    { bg: "bg-red-50",      fg: "text-red-700",     label: "Cancelled" },
  past:         { bg: "bg-[#FAFAF9]",   fg: "text-[#A3A3A3]",   label: "Past start" },
};

export function TodayServicesCard({
  services,
  timeZone,
}: {
  services: TodayService[];
  timeZone: string;
}) {
  return (
    <BrainCard>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sun size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Today
          </h2>
        </div>
        <p className="text-xs text-[#737373]">
          {services.length === 0
            ? "Nothing on the calendar"
            : `${services.length} booking${services.length === 1 ? "" : "s"}`}
        </p>
      </header>

      {services.length === 0 ? (
        <EmptyState>
          No services scheduled today.
        </EmptyState>
      ) : (
        <ul className="mt-4 space-y-2">
          {services.map((s) => {
            const style = PROGRESS_STYLES[s.progressLabel];
            return (
              <li key={s.id}>
                <Link
                  href={`/dashboard/bookings/${s.id}`}
                  className="block rounded-xl border border-[#EDE9E4] bg-white/70 p-3 hover:border-[#B8896B]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A]">
                        {s.clientName}
                      </p>
                      <p className="mt-0.5 text-xs text-[#737373]">
                        {s.serviceName} · {fmtTime(s.startAt, timeZone)} – {fmtTime(s.endAt, timeZone)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${style.bg} ${style.fg}`}
                    >
                      {style.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </BrainCard>
  );
}

function fmtTime(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
