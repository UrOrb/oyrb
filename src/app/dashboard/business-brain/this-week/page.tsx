import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getThisWeekData, detectAnomalies } from "@/lib/business-brain";
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
 * Phase 4.1 — This Week tab. Five cards in a vertical stack, all
 * driven by getThisWeekData() + detectAnomalies(). Both helpers
 * cache for 1 hour per businessId so multiple visits in an hour
 * see consistent data.
 *
 * Empty-state behavior: every card handles its own zero-data case
 * with a friendly empty message. New pros (no bookings) see five
 * empty states, not five broken UIs.
 *
 * Auth: standard pattern — getCurrentBusiness resolves the active
 * site from cookie/searchParam and returns null when the user
 * has no business. Non-owners can't reach this page because
 * getCurrentBusiness only returns sites they own.
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

  // Pro's local week. businesses.timezone has a sensible default of
  // 'America/New_York' (migration 003) so this is always populated.
  const timeZone = business.timezone ?? "UTC";

  // Two cached aggregations in parallel.
  const [data, anomalies] = await Promise.all([
    getThisWeekData(business.id, timeZone),
    detectAnomalies(business.id, timeZone),
  ]);

  return (
    <div className="space-y-4">
      <HeadsUpCard result={anomalies} />
      <ScheduleDensityCard density={data.density} />
      <TodayServicesCard services={data.todayServices} timeZone={timeZone} />
      <MoneyThisWeekCard money={data.money} />
      <TrendCompareCard trend={data.trend} />
    </div>
  );
}
