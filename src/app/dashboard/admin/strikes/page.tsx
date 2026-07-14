import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  STRIKE_THRESHOLD_COUNT,
  STRIKE_THRESHOLD_WEIGHTED,
  STRIKE_WINDOW_DAYS,
} from "@/lib/strikes";

export const metadata = { title: "Admin · Strikes & pauses" };
export const dynamic = "force-dynamic";

/**
 * Admin queue: every business with active strikes in the rolling
 * 14-day window, plus the subset that's currently strike-paused.
 *
 * Sorted by weighted total DESC (paused at the top by definition since
 * they're the highest-weight cases). Each row links to the underlying
 * business and exposes a manual unpause action when applicable.
 *
 * Auth: requireAdmin gate matches the existing admin pattern (inline
 * 403, no sidebar entry).
 */
type StrikeRow = {
  business_id: string;
  business_name: string;
  slug: string;
  count: number;
  weighted_total: number;
  is_paused: boolean;
  paused_at: string | null;
  last_strike_at: string | null;
};

export default async function AdminStrikesPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-10 text-sm text-[#737373]">
        {gate.error} (HTTP {gate.status})
      </div>
    );
  }

  const admin = createAdminClient();
  const sinceIso = new Date(Date.now() - STRIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Pull all client-filed resolved-strike disputes within the window,
  // grouped by business. Then merge in the businesses' pause state.
  const [{ data: disputes }, { data: pausedBusinesses }] = await Promise.all([
    admin
      .from("dispute_inquiries")
      .select("business_id, weight, businesses(business_name, slug, strike_paused_at, last_strike_at)")
      .eq("status", "resolved_strike")
      .eq("reporter_type", "client")
      .gte("resolved_at", sinceIso),
    admin
      .from("businesses")
      .select("id, business_name, slug, strike_paused_at, last_strike_at")
      .not("strike_paused_at", "is", null),
  ]);

  // Aggregate by business_id. A business with strikes appears once;
  // its weighted total sums weights across the window.
  const byBiz = new Map<string, StrikeRow>();
  for (const d of (disputes ?? []) as unknown as Array<{
    business_id: string;
    weight: number;
    businesses: {
      business_name: string;
      slug: string;
      strike_paused_at: string | null;
      last_strike_at: string | null;
    } | null;
  }>) {
    if (!d.businesses) continue;
    const existing = byBiz.get(d.business_id);
    if (existing) {
      existing.count += 1;
      existing.weighted_total += d.weight;
    } else {
      byBiz.set(d.business_id, {
        business_id: d.business_id,
        business_name: d.businesses.business_name,
        slug: d.businesses.slug,
        count: 1,
        weighted_total: d.weight,
        is_paused: !!d.businesses.strike_paused_at,
        paused_at: d.businesses.strike_paused_at,
        last_strike_at: d.businesses.last_strike_at,
      });
    }
  }

  // Merge in paused businesses that have NO strikes in the window
  // (e.g., paused two weeks ago, all strikes have aged out — still
  // technically paused until admin clears it). They appear so the
  // unpause action stays reachable.
  for (const b of (pausedBusinesses ?? []) as Array<{
    id: string;
    business_name: string;
    slug: string;
    strike_paused_at: string | null;
    last_strike_at: string | null;
  }>) {
    if (!byBiz.has(b.id)) {
      byBiz.set(b.id, {
        business_id: b.id,
        business_name: b.business_name,
        slug: b.slug,
        count: 0,
        weighted_total: 0,
        is_paused: true,
        paused_at: b.strike_paused_at,
        last_strike_at: b.last_strike_at,
      });
    }
  }

  const rows = Array.from(byBiz.values()).sort((a, b) => {
    // Paused first, then by weighted_total desc, then by count desc.
    if (a.is_paused !== b.is_paused) return a.is_paused ? -1 : 1;
    if (b.weighted_total !== a.weighted_total) return b.weighted_total - a.weighted_total;
    return b.count - a.count;
  });

  const pausedCount = rows.filter((r) => r.is_paused).length;
  const activeCount = rows.length - pausedCount;

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Strikes &amp; pauses</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Auto-pause threshold: {STRIKE_THRESHOLD_COUNT} strikes or weighted total{" "}
        {STRIKE_THRESHOLD_WEIGHTED}, within a rolling {STRIKE_WINDOW_DAYS}-day window. TOS §29.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card label="Currently paused" value={pausedCount.toString()} tone="red" />
        <Card label="With active strikes (not paused)" value={activeCount.toString()} tone="amber" />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">
          Businesses ({rows.length})
        </h2>
        <div className="mt-3 space-y-2">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E7E5E4] p-8 text-center text-sm text-[#737373]">
              No active strikes anywhere. Nice.
            </div>
          ) : (
            rows.map((r) => <StrikeBusinessRow key={r.business_id} row={r} />)
          )}
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone: "red" | "amber" }) {
  const cls =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div className={`rounded-2xl border p-5 ${cls}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 font-display text-2xl font-medium">{value}</p>
    </div>
  );
}

function StrikeBusinessRow({ row }: { row: StrikeRow }) {
  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";

  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0A0A0A]">{row.business_name}</p>
          <p className="mt-0.5 text-[11px] text-[#737373]">/s/{row.slug}</p>
        </div>
        {row.is_paused ? (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-700">
            Paused
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
            {row.count} active
          </span>
        )}
      </div>
      <div className="mt-3 grid gap-2 border-t border-[#F5F5F4] pt-3 text-[11px] text-[#525252] sm:grid-cols-4">
        <Field label="Strikes (window)" value={`${row.count}/${STRIKE_THRESHOLD_COUNT}`} />
        <Field label="Weighted total" value={`${row.weighted_total}/${STRIKE_THRESHOLD_WEIGHTED}`} />
        <Field label="Last strike" value={fmtDate(row.last_strike_at)} />
        <Field label="Paused since" value={row.is_paused ? fmtDate(row.paused_at) : "—"} />
      </div>
      {row.is_paused && (
        <div className="mt-3 flex justify-end border-t border-[#F5F5F4] pt-3">
          <Link
            href={`/dashboard/admin/strikes/${row.business_id}`}
            className="text-xs font-semibold text-[#B8896B] underline hover:text-[#0A0A0A]"
          >
            Review &amp; unpause →
          </Link>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#A3A3A3]">{label}</p>
      <p className="mt-0.5 text-xs text-[#0A0A0A]">{value}</p>
    </div>
  );
}
