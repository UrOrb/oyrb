import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getTimeData } from "@/lib/business-brain";
import { ScheduleAccuracyCard } from "../_components/schedule-accuracy-card";
import { ByServiceTimingCard } from "../_components/by-service-timing-card";
import { TimeOfDayPatternsCard } from "../_components/time-of-day-patterns-card";
import { DayOfWeekPatternsCard } from "../_components/day-of-week-patterns-card";
import { StartedNotStoppedCard } from "../_components/started-not-stopped-card";

export const metadata = { title: "Time — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Phase 4.3 — Time tab. Five cards in a vertical stack, all driven
 * by getTimeData() which caches for 1 hour per businessId + timeZone.
 *
 * Cards 1, 2, and 5 depend on Phase 3 timing pings (PR #28):
 *   - Schedule Accuracy + By-service Timing need BOTH Start AND Stop
 *     pings on a booking.
 *   - Started-but-not-stopped needs ONLY the Start ping (and a
 *     completed-status booking with NULL Stop) — distinct
 *     "single-tap" pattern.
 *
 * Cards 3 and 4 (Time-of-day, Day-of-week patterns) have no Phase 3
 * dependency — they just bucket start_at.
 *
 * Each card handles its own empty state, so pros without timing data
 * see graceful explainers, not broken UIs.
 */
export default async function TimeTabPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E7E5E4] bg-white p-8 text-center text-sm text-[#737373]">
        No business yet. Once you complete checkout, your time tab will appear here.
      </div>
    );
  }

  const timeZone = business.timezone ?? "UTC";
  const data = await getTimeData(business.id, timeZone);

  return (
    <div className="space-y-4">
      <ScheduleAccuracyCard data={data.scheduleAccuracy} />
      <ByServiceTimingCard data={data.byService} />
      <TimeOfDayPatternsCard data={data.timeOfDay} />
      <DayOfWeekPatternsCard data={data.dayOfWeek} />
      <StartedNotStoppedCard data={data.stuck} />
    </div>
  );
}
