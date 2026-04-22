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

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, marketing_opt_in")
    .eq("business_id", business.id)
    .order("name", { ascending: true });
  const allClients = (clients ?? []).map((c: { id: string; name: string; email: string | null; marketing_opt_in: boolean | null }) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    marketing_opt_in: !!c.marketing_opt_in,
  }));
  const optedInCount = allClients.filter((c) => c.marketing_opt_in).length;

  const { data: recent } = await supabase
    .from("email_campaigns")
    .select("id, name, subject, segment, recipient_count, sent_at, status")
    .eq("business_id", business.id)
    .order("sent_at", { ascending: false })
    .limit(10);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Marketing</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Send campaigns to clients who&apos;ve opted in. Daily cap: 1,000 emails.
      </p>

      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
          {optedInCount} opted in
        </span>
        <span className="rounded-full bg-[#FAFAF9] px-2.5 py-1 font-semibold text-[#737373]">
          {allClients.length - optedInCount} not opted in (won&apos;t receive marketing)
        </span>
      </div>

      <div className="mt-8">
        <CampaignForm businessName={business.business_name} allClients={allClients} />
      </div>

      {recent && recent.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">Recent campaigns</h2>
          <div className="mt-3 space-y-2">
            {recent.map((c: { id: string; name: string; subject: string; segment: string; recipient_count: number; sent_at: string | null; status?: string }) => (
              <div key={c.id} className="rounded-lg border border-[#E7E5E4] bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <span className="text-xs text-[#A3A3A3]">
                    {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : "—"}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-[#737373]">{c.subject}</p>
                <p className="mt-2 text-xs text-[#525252]">
                  Sent to <strong>{c.recipient_count}</strong> · segment: {c.segment}
                  {c.status && c.status !== "sent" && (
                    <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      {c.status}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
