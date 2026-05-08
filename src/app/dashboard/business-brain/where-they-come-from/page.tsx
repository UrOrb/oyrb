import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getReferralData } from "@/lib/business-brain";
import { AcquisitionMixCard } from "../_components/acquisition-mix-card";
import { BookingOriginCard } from "../_components/booking-origin-card";
import { TopSourcesCard } from "../_components/top-sources-card";
import { SourceRevenueCard } from "../_components/source-revenue-card";
import { UtmCampaignsCard } from "../_components/utm-campaigns-card";
import { WhatWeDontTrackCard } from "../_components/what-we-dont-track-card";

export const metadata = { title: "Where They Come From — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Where They Come From tab. Phase 4.5 shipped the 3 sample-data
 * cards (Acquisition / Booking origin / What we don't track);
 * Phase 5 added 3 more cards backed by real referral signals from
 * migration 045 (Top sources / Revenue by source / UTM campaigns).
 *
 * Cards (in render order):
 *   1. Acquisition mix      — new vs returning client bookings
 *   2. Top sources          — Phase 5; classified-source breakdown
 *                             (Instagram, Google, Direct, etc.)
 *   3. Revenue by source    — Phase 5; same buckets ranked by
 *                             revenue collected through OYRB
 *   4. UTM campaigns        — Phase 5; explicit campaign tags
 *   5. Booking origin       — public widget vs manual; hidden
 *                             gracefully when 0% public_widget
 *   6. What we don't track  — Pass the Torch persistence, view
 *                             tracking, "How did you hear" survey
 *
 * Source attribution priority for cards 2 and 3 (defined in
 * src/lib/business-brain.ts attributeSource):
 *   1. utm_source           highest specificity
 *   2. classified referrer  hostname-based bucket
 *   3. "Direct"             public_widget with no UTM/referrer
 *   4. "Unknown"            legacy or manual bookings
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
  const data = await getReferralData(business.id, timeZone);

  return (
    <div className="space-y-4">
      <AcquisitionMixCard data={data.acquisition} />
      <TopSourcesCard data={data.topSources} />
      <SourceRevenueCard data={data.sourceRevenue} />
      <UtmCampaignsCard data={data.utmCampaigns} />
      <BookingOriginCard data={data.origin} />
      <WhatWeDontTrackCard />
    </div>
  );
}
