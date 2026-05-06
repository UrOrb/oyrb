import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  REASON_LABELS,
  STATUS_LABELS,
  type DisputeStatus,
  type ReasonCode,
} from "@/lib/disputes";
import { AlertTriangle } from "lucide-react";

export const metadata = { title: "Admin · Dispute queue" };
export const dynamic = "force-dynamic";

type AdminDisputeRow = {
  id: string;
  reporter_type: "client" | "pro";
  reason_code: ReasonCode;
  status: DisputeStatus;
  weight: number;
  filed_at: string;
  counter_deadline: string;
  priority_review_flag: boolean;
  evidence_urls: string[];
  counter_evidence_urls: string[];
  bookings: { start_at: string; clients: { name: string } | { name: string }[] | null } | null;
  businesses: { business_name: string } | null;
};

export default async function AdminDisputeQueuePage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-10 text-sm text-[#737373]">
        {gate.error} (HTTP {gate.status})
      </div>
    );
  }

  const admin = createAdminClient();

  // Under-review queue first (admin's working set), oldest first within
  // the priority sort. Then a tail of recently-resolved for context.
  const { data: pending } = await admin
    .from("dispute_inquiries")
    .select(`
      id, reporter_type, reason_code, status, weight, filed_at, counter_deadline,
      priority_review_flag, evidence_urls, counter_evidence_urls,
      bookings(start_at, clients(name)),
      businesses(business_name)
    `)
    .eq("status", "under_review")
    .order("priority_review_flag", { ascending: false })
    .order("filed_at", { ascending: true })
    .limit(100);

  const { data: recent } = await admin
    .from("dispute_inquiries")
    .select(`
      id, reporter_type, reason_code, status, weight, filed_at, counter_deadline,
      priority_review_flag, evidence_urls, counter_evidence_urls,
      bookings(start_at, clients(name)),
      businesses(business_name)
    `)
    .in("status", ["resolved_strike", "resolved_dismissed"])
    .order("resolved_at", { ascending: false })
    .limit(20);

  const queue = (pending ?? []) as unknown as AdminDisputeRow[];
  const tail = (recent ?? []) as unknown as AdminDisputeRow[];

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Admin · Dispute queue
      </h1>
      <p className="mt-1 text-sm text-[#737373]">
        Disputes in OYRB review. Priority-flagged rows (anti-revenge) sort to the top.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">
          Pending review ({queue.length})
        </h2>
        <div className="mt-3 space-y-2">
          {queue.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E7E5E4] p-8 text-center text-sm text-[#737373]">
              Queue is empty. ✓
            </div>
          ) : (
            queue.map((row) => <AdminRow key={row.id} row={row} />)
          )}
        </div>
      </section>

      {tail.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">
            Recently resolved ({tail.length})
          </h2>
          <div className="mt-3 space-y-2 opacity-80">
            {tail.map((row) => <AdminRow key={row.id} row={row} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function AdminRow({ row }: { row: AdminDisputeRow }) {
  const filed = new Date(row.filed_at);
  const filedLabel = filed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const clientObj = Array.isArray(row.bookings?.clients)
    ? row.bookings?.clients[0] ?? null
    : row.bookings?.clients ?? null;
  const clientName = clientObj?.name ?? "Client";
  const reporter = row.reporter_type === "client" ? clientName : `Pro about ${clientName}`;
  const businessName = row.businesses?.business_name ?? "Business";

  const statusCls =
    row.status === "resolved_strike"
      ? "bg-red-50 text-red-700"
      : row.status === "resolved_dismissed"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-blue-50 text-blue-700";

  return (
    <Link
      href={`/dashboard/admin/disputes/${row.id}`}
      className="block rounded-lg border border-[#E7E5E4] bg-white p-4 hover:border-[#B8896B]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {row.priority_review_flag && (
              <span
                title="Anti-revenge: filed within 14 days of a reciprocal pro→client filing"
                className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700"
              >
                <AlertTriangle size={10} /> Priority
              </span>
            )}
            <p className="text-sm font-semibold">
              {REASON_LABELS[row.reason_code]} <span className="text-[#737373]">· weight {row.weight}</span>
            </p>
          </div>
          <p className="mt-0.5 text-xs text-[#737373]">
            {reporter} → {businessName} · Filed {filedLabel} · {row.evidence_urls.length} reporter
            file{row.evidence_urls.length === 1 ? "" : "s"} ·{" "}
            {row.counter_evidence_urls.length} counter
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusCls}`}
        >
          {STATUS_LABELS[row.status]}
        </span>
      </div>
    </Link>
  );
}
