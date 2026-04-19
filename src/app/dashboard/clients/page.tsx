import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { getCurrentBusiness } from "@/lib/current-site";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function ClientsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);

  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Clients</h1>
        <p className="mt-4 text-sm text-[#737373]">Complete checkout first to start collecting clients.</p>
      </div>
    );
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Clients</h1>
      <p className="mt-1 text-sm text-[#737373]">Everyone who&rsquo;s booked with you.</p>

      <div className="mt-8 overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
        {(clients ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-[#737373]">
            No clients yet — they&rsquo;ll appear here after their first booking.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#E7E5E4] bg-[#FAFAF9] text-xs uppercase text-[#737373]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {(clients ?? []).map((c: any) => (
                <tr key={c.id} className="hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-[#525252]">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-[#B8896B]">
                        <Mail size={11} /> {c.email}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#525252]">
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-[#B8896B]">
                        <Phone size={11} /> {c.phone}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#737373]">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
