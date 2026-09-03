import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getTimeData } from "@/lib/business-brain";
import { BentoGrid } from "../../_components/bento-grid";
import { ByServiceTimingCard } from "../_components/by-service-timing-card";
import { DayOfWeekPatternsCard } from "../_components/day-of-week-patterns-card";
import { StartedNotStoppedCard } from "../_components/started-not-stopped-card";
import { ScheduleAccuracyRingCard } from "../_components/charts/schedule-accuracy-ring-card";
import { TimeOfDayHeatmapCard } from "../_components/charts/time-of-day-heatmap-card";

export const metadata = { title: "Time — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Time tab — Phase 9 PR 6 bento + charts.
 *
 * Two cards replaced with Recharts / SVG:
 *   ScheduleAccuracy  → progress ring (donut, RadialBarChart)
 *   TimeOfDayPatterns → 7×24 SVG heatmap (with mobile fallback)
 *
 * Day-of-week stays as-is (existing bar chart card). By-service
 * timing and Started-not-stopped are text/list surfaces — no chart
 * candidates.
 *
 * Layout (desktop):
 *   Row 1: Schedule accuracy ring (2) | Time-of-day heatmap (4 × 2)
 *   Row 2: By-service timing (2)
 *   Row 3: Day-of-week (3) | Started-not-stopped (3)
 */
export default async function TimeTabPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D7CFC8] bg-[#FAFAF9] p-8 shadow-[0_14px_40px_rgba(10,10,10,0.03)] text-center text-sm text-[#737373]">
        No business yet. Once you complete checkout, your time tab will appear here.
      </div>
    );
  }

  const timeZone = business.timezone ?? "UTC";
  const data = await getTimeData(business.id, timeZone);

  // getTimeData is unstable_cache-wrapped (1h TTL). On cache hit the
  // Date fields come back as ISO strings — TypeScript still says Date,
  // but the runtime value isn't. StartedNotStoppedCard calls
  // .toLocaleDateString() on serviceStartedAt + startAt which throws
  // on a string. Re-hydrate at the consumer boundary; same pattern
  // as PR #62.
  const stuck = {
    ...data.stuck,
    visible: data.stuck.visible.map((b) => ({
      ...b,
      serviceStartedAt: new Date(b.serviceStartedAt),
      startAt: new Date(b.startAt),
    })),
  };

  return (
    <BentoGrid>
      <div className="col-span-2 sm:col-span-2 lg:col-span-2 lg:row-span-2">
        <ScheduleAccuracyRingCard accuracy={data.scheduleAccuracy} />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-4 lg:row-span-2">
        <TimeOfDayHeatmapCard hourByDay={data.hourByDay} />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-6">
        <ByServiceTimingCard data={data.byService} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <DayOfWeekPatternsCard data={data.dayOfWeek} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <StartedNotStoppedCard data={stuck} />
      </div>
    </BentoGrid>
  );
}
