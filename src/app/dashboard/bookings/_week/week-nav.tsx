import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { shiftLocalYmd } from "./week-helpers";

/**
 * Prev / Today / Next navigator for the week grid + a human-readable
 * range label. Pure server-rendered <Link>s — no client state. The
 * `?view=week` param is preserved on every link so the URL stays
 * canonical even if the user navigated in via `?view=week` explicitly.
 */

type Props = {
  weekStartYmd: string;
  todayWeekStartYmd: string;
  timeZone: string;
  /** Shared querystring without `week` (e.g. `siteId=...&view=week`). */
  baseQuery: string;
};

export function WeekNav({
  weekStartYmd,
  todayWeekStartYmd,
  timeZone,
  baseQuery,
}: Props) {
  const prevYmd = shiftLocalYmd(weekStartYmd, -7, timeZone);
  const nextYmd = shiftLocalYmd(weekStartYmd, 7, timeZone);
  const endYmd = shiftLocalYmd(weekStartYmd, 6, timeZone);

  const start = new Date(`${weekStartYmd}T12:00:00Z`);
  const end = new Date(`${endYmd}T12:00:00Z`);
  const startLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(end);

  const isCurrentWeek = weekStartYmd === todayWeekStartYmd;

  const buildHref = (week: string) => {
    const q = baseQuery ? `${baseQuery}&week=${week}` : `week=${week}`;
    return `?${q}`;
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium text-[#0A0A0A]">
        {startLabel} – {endLabel}
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={buildHref(prevYmd)}
          aria-label="Previous week"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E7E5E4] text-[#525252] hover:border-[#B8896B] hover:text-[#0A0A0A]"
        >
          <ChevronLeft size={16} />
        </Link>
        <Link
          href={buildHref(todayWeekStartYmd)}
          aria-current={isCurrentWeek ? "page" : undefined}
          className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium ${
            isCurrentWeek
              ? "border-[#B8896B] bg-[#FCE4D8] text-[#0A0A0A]"
              : "border-[#E7E5E4] text-[#525252] hover:border-[#B8896B] hover:text-[#0A0A0A]"
          }`}
        >
          Today
        </Link>
        <Link
          href={buildHref(nextYmd)}
          aria-label="Next week"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E7E5E4] text-[#525252] hover:border-[#B8896B] hover:text-[#0A0A0A]"
        >
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
