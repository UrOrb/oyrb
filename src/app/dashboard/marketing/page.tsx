import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CampaignForm } from "./campaign-form";
import { getCurrentBusiness } from "@/lib/current-site";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function MarketingPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);

  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Marketing</h1>
        <p className="mt-4 text-sm text-[#737373]">Complete checkout first to access marketing.</p>
      </div>
    );
  }

  const { count: clientCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);

  const { data: recent } = await supabase
    .from("email_campaigns")
    .select("id, name, subject, segment, recipient_count, sent_at")
    .eq("business_id", business.id)
    .order("sent_at", { ascending: false })
    .limit(10);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Marketing</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Win back past clients. Announce new services. Send email campaigns straight from your OYRB address.
      </p>

      <div className="mt-8">
        <CampaignForm businessName={business.business_name} clientCount={clientCount ?? 0} />
      </div>

      {recent && recent.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">Recent campaigns</h2>
          <div className="mt-3 space-y-2">
            {recent.map((c: { id: string; name: string; subject: string; segment: string; recipient_count: number; sent_at: string }) => (
              <div key={c.id} className="rounded-lg border border-[#E7E5E4] bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <span className="text-xs text-[#A3A3A3]">
                    {new Date(c.sent_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-[#737373]">{c.subject}</p>
                <p className="mt-2 text-xs text-[#525252]">
                  Sent to <strong>{c.recipient_count}</strong> clients · segment: {c.segment}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
