import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getReferralData } from "@/lib/business-brain";
import { AcquisitionMixCard } from "../_components/acquisition-mix-card";
import { BookingOriginCard } from "../_components/booking-origin-card";
import { WhatWeDontTrackCard } from "../_components/what-we-dont-track-card";

export const metadata = { title: "Where They Come From — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Phase 4.5 — Where They Come From tab. Closes the Business Brain
 * module (5/5 tabs).
 *
 * Honestly scoped: 3 cards in v1 because that's what existing data
 * supports. UTM parsing, Pass the Torch attribution, "How did you
 * hear about us?" survey, and storefront view tracking are queued
 * for Phase 5 — each is its own focused piece of work that would
 * have been rushed if bundled here.
 *
 * Cards:
 *   1. Acquisition mix       — new vs returning bookings (90-day)
 *   2. Booking origin        — public widget vs manual (driven by
 *                              the booking_source column from
 *                              migration 044). Hidden gracefully
 *                              when 0% public widget bookings.
 *   3. What we don't track   — explainer + workaround
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
      <BookingOriginCard data={data.origin} />
      <WhatWeDontTrackCard />
    </div>
  );
}
