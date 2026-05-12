import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getReferralData, getViewsData } from "@/lib/business-brain";
import { BentoGrid } from "../../_components/bento-grid";
import { BookingOriginCard } from "../_components/booking-origin-card";
import { TopSourcesCard } from "../_components/top-sources-card";
import { SourceRevenueCard } from "../_components/source-revenue-card";
import { UtmCampaignsCard } from "../_components/utm-campaigns-card";
import { PassTheTorchCard } from "../_components/pass-the-torch-card";
import { StorefrontViewsCard } from "../_components/storefront-views-card";
import { ConversionRateCard } from "../_components/conversion-rate-card";
import { ConversionBySourceCard } from "../_components/conversion-by-source-card";
import { WhatWeDontTrackCard } from "../_components/what-we-dont-track-card";
import { AcquisitionMixDonutCard } from "../_components/charts/acquisition-mix-donut-card";

export const metadata = { title: "Where They Come From — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Where They Come From tab — Phase 9 PR 6 bento + charts.
 *
 * One card replaced with Recharts: AcquisitionMix → donut. The other
 * 9 cards on this tab stay text/list-based — chartifying more would
 * exceed the 7-chart cap and inflate scope. Several are bar-chart
 * candidates (TopSources, SourceRevenue, UtmCampaigns) for a future PR.
 *
 * Layout (desktop, 6 cols × N rows):
 *   Row 1: Acquisition mix donut (3) | Storefront views (3)
 *   Row 2: Conversion rate (2) | Conversion by source (4)
 *   Row 3: Top sources (3) | Source revenue (3)
 *   Row 4: Booking origin (3) | UTM campaigns (3)
 *   Row 5: Pass the Torch (3) | What we don't track (3)
 */
export default async function WhereTheyComeFromTabPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E7E5E4] bg-white p-8 text-center text-sm text-[#737373]">
        No business yet. Once you complete checkout, your referral data will appear here.
      </div>
    );
  }

  const timeZone = business.timezone ?? "UTC";
  const [data, viewsData] = await Promise.all([
    getReferralData(business.id, timeZone),
    getViewsData(business.id, timeZone),
  ]);

  return (
    <BentoGrid>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <AcquisitionMixDonutCard mix={data.acquisition} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <StorefrontViewsCard data={viewsData} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-2">
        <ConversionRateCard data={viewsData} />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-4">
        <ConversionBySourceCard data={viewsData.bySource} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <TopSourcesCard data={data.topSources} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <SourceRevenueCard data={data.sourceRevenue} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <BookingOriginCard data={data.origin} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <UtmCampaignsCard data={data.utmCampaigns} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <PassTheTorchCard data={data.passTheTorch} />
      </div>
      <div className="col-span-2 sm:col-span-2 lg:col-span-3">
        <WhatWeDontTrackCard />
      </div>
    </BentoGrid>
  );
}
