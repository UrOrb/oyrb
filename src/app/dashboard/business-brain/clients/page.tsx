import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getClientsData } from "@/lib/business-brain";
import { RepeatClientOverviewCard } from "../_components/repeat-client-overview-card";
import { TopClientsByLTVCard } from "../_components/top-clients-by-ltv-card";
import { DriftingClientsCard } from "../_components/drifting-clients-card";
import { NewClientsTrendCard } from "../_components/new-clients-trend-card";
import { ClientRetentionCard } from "../_components/client-retention-card";

export const metadata = { title: "Clients — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Phase 4.4 — Clients tab. Five cards in a vertical stack, all
 * driven by getClientsData() which caches for 1 hour per
 * businessId + timeZone.
 *
 * Read-only analytics. The operational client list (filter / search
 * / edit / contact details) lives at /dashboard/clients. The
 * Drifting Clients card has a footer link bridging the two surfaces.
 *
 * Privacy: cards display client NAMES only — no email/phone. Pros
 * who want contact details click through to /dashboard/clients.
 */
export default async function ClientsTabPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E7E5E4] bg-white p-8 text-center text-sm text-[#737373]">
        No business yet. Once you complete checkout, your clients tab will appear here.
      </div>
    );
  }

  const timeZone = business.timezone ?? "UTC";
  const data = await getClientsData(business.id, timeZone);

  return (
    <div className="space-y-4">
      <RepeatClientOverviewCard data={data.repeatOverview} />
      <TopClientsByLTVCard data={data.topByLTV} />
      <DriftingClientsCard data={data.drifting} />
      <NewClientsTrendCard data={data.newClientsTrend} />
      <ClientRetentionCard data={data.retention} />
    </div>
  );
}
