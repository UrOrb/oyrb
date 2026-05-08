import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getReferralData } from "@/lib/business-brain";
import { AcquisitionMixCard } from "../_components/acquisition-mix-card";
import { BookingOriginCard } from "../_components/booking-origin-card";
import { TopSourcesCard } from "../_components/top-sources-card";
import { SourceRevenueCard } from "../_components/source-revenue-card";
import { UtmCampaignsCard } from "../_components/utm-campaigns-card";
import { PassTheTorchCard } from "../_components/pass-the-torch-card";
import { WhatWeDontTrackCard } from "../_components/what-we-dont-track-card";

export const metadata = { title: "Where They Come From — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Where They Come From tab. Phase 4.5 shipped 3 sample-data cards;
 * Phase 5 (PR #35) added 3 more backed by UTM + classified referrer
 * signals; Phase 5 closer (this PR) adds Pass the Torch attribution.
 *
 * Cards (in render order):
 *   1. Acquisition mix       — new vs returning client bookings
 *   2. Pass the Torch        — Phase 5 closer; platform-internal
 *                              referrals (?ref=<slug> URL flow)
 *   3. Top sources           — classified-source breakdown
 *                              (Pass the Torch, Instagram, Google,
 *                              Direct, etc.)
 *   4. Revenue by source     — same buckets ranked by revenue
 *                              collected through OYRB
 *   5. UTM campaigns         — explicit campaign tags
 *   6. Booking origin        — public widget vs manual; hidden
 *                              gracefully when 0% public_widget
 *   7. What we don't track   — view tracking, "How did you hear"
 *                              survey (Pass the Torch removed —
 *                              this PR ships it)
 *
 * Source attribution priority for cards 3 and 4 (defined in
 * src/lib/business-brain.ts attributeSource):
 *   1. Pass the Torch       referrer_business_id IS NOT NULL —
 *                            highest priority, most explicit signal
 *   2. utm_source           explicit URL tagging
 *   3. classified referrer  hostname-based bucket
 *   4. "Direct"             public_widget with no UTM/referrer
 *   5. "Unknown"            legacy or manual bookings
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
      <PassTheTorchCard data={data.passTheTorch} />
      <TopSourcesCard data={data.topSources} />
      <SourceRevenueCard data={data.sourceRevenue} />
      <UtmCampaignsCard data={data.utmCampaigns} />
      <BookingOriginCard data={data.origin} />
      <WhatWeDontTrackCard />
    </div>
  );
}
