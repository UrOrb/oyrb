import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getThisWeekData, detectAnomalies } from "@/lib/business-brain";
import { BentoGrid } from "../../_components/bento-grid";
import { HeadsUpCard } from "../_components/heads-up-card";
import { ScheduleDensityCard } from "../_components/schedule-density-card";
import { TodayServicesCard } from "../_components/today-services-card";
import { MoneyThisWeekCard } from "../_components/money-this-week-card";
import { TrendCompareCard } from "../_components/trend-compare-card";

export const metadata = { title: "This Week — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * This Week tab — Phase 9 PR 6 bento layout.
 *
 * No card replacements on this tab — the existing 5 cards are alert /
 * list / state surfaces, not chart candidates. Each card is wrapped
 * in a col-span div to slot into the 6-col bento grid.
 *
 * Layout (desktop):
 *   Row 1: Heads-up (6 — full-width alert banner)
 *   Row 2: Schedule density (4) | Today's services (2)
 *   Row 3: Money this week (3) | Trend compare (3)
 */
export default async function ThisWeekTabPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E7E5E4] bg-white p-8 text-center text-sm text-[#737373]">
        No business yet. Once you complete checkout, your week will appear here.
      </div>
    );
  }

  const timeZone = business.timezone ?? "UTC";
  const [data, anomalies] = await Promise.all([
    getThisWeekData(business.id, timeZone),
    detectAnomalies(business.id, timeZone),
  ]);

  // getThisWeekData is unstable_cache-wrapped (1h TTL). On cache hit
  // the Date fields come back as ISO strings — TypeScript still says
  // Date, but the runtime value isn't. TodayServicesCard calls
  // Intl.DateTimeFormat.format(s.startAt) which throws on a string.
  // Re-hydrate at the consumer boundary; mirrors the PR #62 fix in
  // src/app/dashboard/page.tsx.
  const todayServices = data.todayServices.map((s) => ({
    ...s,
    startAt: new Date(s.startAt),
    endAt: new Date(s.endAt),
    serviceStartedAt: s.serviceStartedAt ? new Date(s.serviceStartedAt) : null,
    serviceEndedAt: s.serviceEndedAt ? new Date(s.serviceEndedAt) : null,
  }));

  return (
    <BentoGrid>
      <div className="col-span-2 sm:col-span-4 lg:col-span-6">
        <HeadsUpCard result={anomalies} />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-4">
        <ScheduleDensityCard density={data.density} />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-2">
        <TodayServicesCard services={todayServices} timeZone={timeZone} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <MoneyThisWeekCard money={data.money} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <TrendCompareCard trend={data.trend} />
      </div>
    </BentoGrid>
  );
}
