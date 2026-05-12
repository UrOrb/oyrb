import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { getClientsData } from "@/lib/business-brain";
import { BentoGrid } from "../../_components/bento-grid";
import { RepeatClientOverviewCard } from "../_components/repeat-client-overview-card";
import { TopClientsByLTVCard } from "../_components/top-clients-by-ltv-card";
import { DriftingClientsCard } from "../_components/drifting-clients-card";
import { ClientRetentionCard } from "../_components/client-retention-card";
import { NewClientsTrendAreaCard } from "../_components/charts/new-clients-trend-area-card";

export const metadata = { title: "Clients — Business Brain" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

/**
 * Clients tab — Phase 9 PR 6 bento + charts.
 *
 * One card replaced with Recharts:
 *   NewClientsTrend → spline area chart
 *
 * RepeatClientOverview and TopClientsByLTV are chart candidates (flagged
 * in discovery §2) but stay text-based in this PR — the 7-chart cap was
 * tight enough already. A follow-up could convert them.
 *
 * Layout (desktop):
 *   Row 1: Repeat overview (2) | Top clients by LTV (4)
 *   Row 2: New clients trend area (4) | Drifting clients (2)
 *   Row 3: Client retention (6) — full width
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

  // getClientsData is unstable_cache-wrapped (1h TTL). On cache hit
  // the Date fields come back as ISO strings — TypeScript still says
  // Date, but the runtime value isn't. TopClientsByLTVCard and
  // DriftingClientsCard both call .toLocaleDateString() on
  // lastBookingAt which throws on a string. Re-hydrate at the
  // consumer boundary; same pattern as PR #62.
  const topByLTV = {
    ...data.topByLTV,
    rows: data.topByLTV.rows.map((r) => ({
      ...r,
      lastBookingAt: new Date(r.lastBookingAt),
    })),
  };
  const drifting = {
    ...data.drifting,
    rows: data.drifting.rows.map((r) => ({
      ...r,
      lastBookingAt: new Date(r.lastBookingAt),
    })),
  };

  return (
    <BentoGrid>
      <div className="col-span-2 sm:col-span-2 lg:col-span-2">
        <RepeatClientOverviewCard data={data.repeatOverview} />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-4">
        <TopClientsByLTVCard data={topByLTV} />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-4">
        <NewClientsTrendAreaCard trend={data.newClientsTrend} />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-2">
        <DriftingClientsCard data={drifting} />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-6">
        <ClientRetentionCard data={data.retention} />
      </div>
    </BentoGrid>
  );
}
