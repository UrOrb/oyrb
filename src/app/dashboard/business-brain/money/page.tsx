import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getMoneyData } from "@/lib/business-brain";
import { RevenueOverviewCard } from "../_components/revenue-overview-card";
import { TopEarningServicesCard } from "../_components/top-earning-services-card";
import { ProfitPerMinuteCard } from "../_components/profit-per-minute-card";
import { DepositVsPayInFullCard } from "../_components/deposit-vs-pay-in-full-card";
import { MoneyTrendCard } from "../_components/money-trend-card";
// Smoke-test (Phase 9 PR 6 commit 1) — removed in commit 2.
import { SmokeTestChart } from "../_charts/__smoke-test";

export const metadata = { title: "Money — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Phase 4.2 — Money tab. Five cards in a vertical stack, all driven
 * by getMoneyData() which caches for 1 hour per businessId.
 *
 * Each card handles its own zero-data / sample-size empty state, so
 * new pros (no bookings) and pros without Phase 3 timing data see
 * graceful empty messages, not broken UIs.
 *
 * Auth: standard pattern via getCurrentBusiness — only the pro who
 * owns the site gets data here.
 */
export default async function MoneyTabPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E7E5E4] bg-white p-8 text-center text-sm text-[#737373]">
        No business yet. Once you complete checkout, your money tab will appear here.
      </div>
    );
  }

  const timeZone = business.timezone ?? "UTC";
  const data = await getMoneyData(business.id, timeZone);

  return (
    <div className="space-y-4">
      <SmokeTestChart />
      <RevenueOverviewCard
        windows={data.windows}
        passTheTorch90={data.passTheTorch90}
      />
      <TopEarningServicesCard
        services={data.topServices}
        hasEnoughData={data.topServicesHasEnoughData}
      />
      <ProfitPerMinuteCard data={data.profitPerMinute} />
      <DepositVsPayInFullCard mix={data.paymentMix} />
      <MoneyTrendCard trend={data.trend} />
    </div>
  );
}
