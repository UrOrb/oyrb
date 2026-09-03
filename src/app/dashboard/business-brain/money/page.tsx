import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getMoneyData } from "@/lib/business-brain";
import { BentoGrid } from "../../_components/bento-grid";
import { RevenueOverviewCard } from "../_components/revenue-overview-card";
import { ProfitPerMinuteCard } from "../_components/profit-per-minute-card";
import { MoneyTrendAreaCard } from "../_components/charts/money-trend-area-card";
import { TopEarningServicesBarCard } from "../_components/charts/top-earning-services-bar-card";
import { PaymentMixDonutCard } from "../_components/charts/payment-mix-donut-card";

export const metadata = { title: "Money — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Money tab — Phase 9 PR 6 bento + charts.
 *
 * Three cards replaced with Recharts:
 *   MoneyTrend       → spline area chart (hero of the tab)
 *   TopEarningSvcs   → horizontal bar chart
 *   DepositVsPayIn   → payment mix donut
 *
 * Layout (desktop):
 *   Row 1: Revenue trend area (4 × 2) | Revenue overview (2 × 2)
 *   Row 2: Top earning services (3) | Payment mix donut (3)
 *   Row 3: Profit per minute (6) — wide stat
 */
export default async function MoneyTabPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D7CFC8] bg-[#FAFAF9] p-8 shadow-[0_14px_40px_rgba(10,10,10,0.03)] text-center text-sm text-[#737373]">
        No business yet. Once you complete checkout, your money tab will appear here.
      </div>
    );
  }

  const timeZone = business.timezone ?? "UTC";
  const data = await getMoneyData(business.id, timeZone);

  return (
    <BentoGrid>
      <div className="col-span-2 sm:col-span-4 lg:col-span-4 lg:row-span-2">
        <MoneyTrendAreaCard trend={data.trend} />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-2 lg:row-span-2">
        <RevenueOverviewCard
          windows={data.windows}
          passTheTorch90={data.passTheTorch90}
        />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <TopEarningServicesBarCard
          services={data.topServices}
          hasEnoughData={data.topServicesHasEnoughData}
        />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <PaymentMixDonutCard mix={data.paymentMix} />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-6">
        <ProfitPerMinuteCard data={data.profitPerMinute} />
      </div>
    </BentoGrid>
  );
}
