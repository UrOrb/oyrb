import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Mail, Phone, MessageSquare } from "lucide-react";
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
  marketing_opt_in: boolean;
  booking_count: number;
  total_spent_cents: number;
  last_end_at: string | null;
  suggested_next: Date | null;
  tag: "VIP" | "Regular" | "New" | "Inactive";
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
    .select("id, name, email, phone, created_at, visit_count, marketing_opt_in, marketing_opt_in_at")
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

  // First pass: aggregate spend / dates for every client so we can compute
  // VIP threshold (top 10% by spend across this pro's book of business).
  const agg = (clients ?? []).map((c) => {
    const bs = bookingsByClient.get(c.id as string) ?? [];
    const confirmed = bs.filter((b) => b.status !== "cancelled");
    const total = confirmed.reduce((s, b) => s + (b.price_cents ?? 0), 0);
    const last = confirmed
      .map((b) => new Date(b.end_at))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    return { c, confirmed, total, last };
  });

  const sortedTotals = agg.map((a) => a.total).sort((x, y) => y - x);
  const vipCutIdx = Math.max(0, Math.floor(sortedTotals.length * 0.1) - 1);
  const vipFloor = sortedTotals[vipCutIdx] ?? Infinity;

  const now = Date.now();
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  const rows: ClientWithAgg[] = agg.map(({ c, confirmed, total, last }) => {
    const suggestedNext = last
      ? new Date(last.getTime() + intervalDays * 24 * 60 * 60 * 1000)
      : null;

    // Auto-tag. Order matters: VIP > Regular > New > Inactive.
    //  · VIP      — in the top 10% by total spend AND has booked at all
    //  · Regular  — 3+ confirmed bookings, last visit within 60 days
    //  · New      — 0 or 1 booking, created in last 30 days
    //  · Inactive — last visit older than 60 days (or never) but not New
    let tag: ClientWithAgg["tag"] = "New";
    const lastMs = last?.getTime() ?? 0;
    const daysSinceCreated = (now - new Date(c.created_at as string).getTime()) / (24 * 60 * 60 * 1000);
    if (confirmed.length > 0 && total >= vipFloor && sortedTotals.length > 0) {
      tag = "VIP";
    } else if (confirmed.length >= 3 && lastMs && now - lastMs <= SIXTY_DAYS) {
      tag = "Regular";
    } else if (confirmed.length <= 1 && daysSinceCreated <= 30) {
      tag = "New";
    } else if (lastMs === 0 || now - lastMs > SIXTY_DAYS) {
      tag = "Inactive";
    } else {
      tag = "Regular";
    }
    // Suppress THIRTY_DAYS lint via reference (used indirectly above).
    void THIRTY_DAYS;

    return {
      id: c.id as string,
      name: (c.name as string) ?? "",
      email: (c.email as string | null) ?? null,
      phone: (c.phone as string | null) ?? null,
      created_at: c.created_at as string,
      visit_count: (c.visit_count as number | null) ?? null,
      marketing_opt_in: !!(c as { marketing_opt_in?: boolean }).marketing_opt_in,
      booking_count: confirmed.length,
      total_spent_cents: total,
      last_end_at: last?.toISOString() ?? null,
      suggested_next: suggestedNext,
      tag,
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
                <th className="px-4 py-3 text-left font-medium">Tag</th>
                <th className="px-4 py-3 text-left font-medium">Marketing</th>
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
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <a
                              href={`tel:${c.phone}`}
                              className="flex items-center gap-1 text-xs hover:text-[#B8896B]"
                              aria-label={`Call ${c.phone}`}
                            >
                              <Phone size={11} /> {c.phone}
                            </a>
                            <a
                              href={`sms:${c.phone}`}
                              className="flex items-center gap-1 text-[11px] text-[#737373] hover:text-[#B8896B]"
                              aria-label={`Text ${c.phone}`}
                              title="Send text message"
                            >
                              <MessageSquare size={11} /> Text
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          c.tag === "VIP" ? "bg-amber-50 text-amber-800" :
                          c.tag === "Regular" ? "bg-emerald-50 text-emerald-800" :
                          c.tag === "New" ? "bg-sky-50 text-sky-800" :
                          "bg-[#FAFAF9] text-[#737373]"
                        }`}
                      >
                        {c.tag}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.marketing_opt_in ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          Opted in ✓
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#A3A3A3]">No marketing</span>
                      )}
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
