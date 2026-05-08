import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getReferralData, getViewsData } from "@/lib/business-brain";
import { AcquisitionMixCard } from "../_components/acquisition-mix-card";
import { BookingOriginCard } from "../_components/booking-origin-card";
import { TopSourcesCard } from "../_components/top-sources-card";
import { SourceRevenueCard } from "../_components/source-revenue-card";
import { UtmCampaignsCard } from "../_components/utm-campaigns-card";
import { PassTheTorchCard } from "../_components/pass-the-torch-card";
import { StorefrontViewsCard } from "../_components/storefront-views-card";
import { ConversionRateCard } from "../_components/conversion-rate-card";
import { ConversionBySourceCard } from "../_components/conversion-by-source-card";
import { WhatWeDontTrackCard } from "../_components/what-we-dont-track-card";

export const metadata = { title: "Where They Come From — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Where They Come From tab. Phase 4.5 shipped 3 sample-data cards;
 * Phase 5 PR #35 added UTM + classified referrer; Phase 5 PR #36
 * added Pass the Torch persistence; Phase 5 closer (this PR) adds
 * storefront view tracking + view-to-booking conversion analytics.
 *
 * Cards (in render order):
 *   1. Acquisition mix          — new vs returning client bookings
 *   2. Storefront views         — Phase 5 closer; total + 8-week trend
 *   3. Conversion rate          — Phase 5 closer; views → bookings
 *   4. Conversion by source     — Phase 5 closer; per-source funnel
 *   5. Pass the Torch           — platform-internal referrals
 *   6. Top sources              — classified-source breakdown
 *   7. Revenue by source        — same buckets ranked by collected revenue
 *   8. UTM campaigns            — explicit campaign tags
 *   9. Booking origin           — public widget vs manual
 *  10. What we don't track      — "How did you hear" survey field only
 *                                  (view tracking removed — this PR ships it)
 *
 * Source attribution priority for source-bucketed cards (defined
 * in src/lib/business-brain.ts attributeSource):
 *   1. Pass the Torch       referrer_business_id IS NOT NULL —
 *                            highest priority, most explicit signal
 *   2. utm_source           explicit URL tagging
 *   3. classified referrer  hostname-based bucket
 *   4. "Direct"             public_widget with no UTM/referrer
 *   5. "Unknown"            legacy or manual bookings
 *
 * The same priority applies to BOTH bookings and views — single
 * source of truth so view-to-booking conversion math by source
 * uses consistent bucketing.
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
    <div className="space-y-4">
      <AcquisitionMixCard data={data.acquisition} />
      <StorefrontViewsCard data={viewsData} />
      <ConversionRateCard data={viewsData} />
      <ConversionBySourceCard data={viewsData.bySource} />
      <PassTheTorchCard data={data.passTheTorch} />
      <TopSourcesCard data={data.topSources} />
      <SourceRevenueCard data={data.sourceRevenue} />
      <UtmCampaignsCard data={data.utmCampaigns} />
      <BookingOriginCard data={data.origin} />
      <WhatWeDontTrackCard />
    </div>
  );
}
