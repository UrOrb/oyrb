import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { getCurrentBusiness } from "@/lib/current-site";
import { formatCents } from "@/lib/types";
import { defaultIntervalFor } from "@/lib/rebook-intervals";
import { ClientRowActions } from "./row-actions";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

type ClientWithAgg = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  visit_count: number | null;
  booking_count: number;
  total_spent_cents: number;
  last_end_at: string | null;
  suggested_next: Date | null;
};

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
    .select("id, name, email, phone, created_at, visit_count")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const clientIds = (clients ?? []).map((c) => c.id as string);

  // One round-trip for all bookings of all clients in this business.
  // We aggregate in-process. Pros rarely have >10k bookings per business.
  const bookingsByClient = new Map<string, { end_at: string; price_cents: number; status: string }[]>();
  if (clientIds.length > 0) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("client_id, end_at, status, services(price_cents)")
      .in("client_id", clientIds);
    for (const raw of (bookings ?? []) as unknown as Array<{
      client_id: string;
      end_at: string;
      status: string;
      services: { price_cents: number } | { price_cents: number }[] | null;
    }>) {
      if (!raw.client_id) continue;
      const svc = Array.isArray(raw.services) ? raw.services[0] : raw.services;
      const arr = bookingsByClient.get(raw.client_id) ?? [];
      arr.push({
        end_at: raw.end_at,
        status: raw.status,
        price_cents: svc?.price_cents ?? 0,
      });
      bookingsByClient.set(raw.client_id, arr);
    }
  }

  const intervalDays = defaultIntervalFor(business.service_category);

  const rows: ClientWithAgg[] = (clients ?? []).map((c) => {
    const bs = bookingsByClient.get(c.id as string) ?? [];
    const confirmed = bs.filter((b) => b.status !== "cancelled");
    const total = confirmed.reduce((s, b) => s + (b.price_cents ?? 0), 0);
    const last = confirmed
      .map((b) => new Date(b.end_at))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const suggestedNext = last
      ? new Date(last.getTime() + intervalDays * 24 * 60 * 60 * 1000)
      : null;

    return {
      id: c.id as string,
      name: (c.name as string) ?? "",
      email: (c.email as string | null) ?? null,
      phone: (c.phone as string | null) ?? null,
      created_at: c.created_at as string,
      visit_count: (c.visit_count as number | null) ?? null,
      booking_count: confirmed.length,
      total_spent_cents: total,
      last_end_at: last?.toISOString() ?? null,
      suggested_next: suggestedNext,
    };
  });

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-[#737373]">
            Everyone who&rsquo;s booked with you — with history, spend, and rebook cadence.
          </p>
        </div>
        <p className="text-xs text-[#737373]">
          Default rebook: {intervalDays} days
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#737373]">
            No clients yet — they&rsquo;ll appear here after their first booking.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#E7E5E4] bg-[#FAFAF9] text-xs uppercase text-[#737373]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Client</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-right font-medium">Visits</th>
                <th className="px-4 py-3 text-right font-medium">Spend</th>
                <th className="px-4 py-3 text-left font-medium">Last visit</th>
                <th className="px-4 py-3 text-left font-medium">Suggested next</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {rows.map((c) => {
                const overdue = c.suggested_next && c.suggested_next.getTime() < Date.now();
                return (
                  <tr key={c.id} className="hover:bg-[#FAFAF9]">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-[#A3A3A3]">
                        Since {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#525252]">
                      <div className="space-y-0.5">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs hover:text-[#B8896B]">
                            <Mail size={11} /> {c.email}
                          </a>
                        )}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs hover:text-[#B8896B]">
                            <Phone size={11} /> {c.phone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{c.booking_count}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCents(c.total_spent_cents)}</td>
                    <td className="px-4 py-3 text-xs text-[#525252]">
                      {c.last_end_at ? new Date(c.last_end_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.suggested_next ? (
                        <span className={overdue ? "font-semibold text-amber-700" : "text-[#525252]"}>
                          {c.suggested_next.toLocaleDateString()}
                          {overdue && " (overdue)"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.email && c.last_end_at && (
                        <ClientRowActions clientId={c.id} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-6 text-xs text-[#737373]">
        Rebook intervals come from your{" "}
        <a href="/dashboard/settings/rebook" className="underline hover:text-[#0A0A0A]">
          rebook settings
        </a>
        . Clients can unsubscribe from rebook reminders anytime.
      </p>
    </div>
  );
}
