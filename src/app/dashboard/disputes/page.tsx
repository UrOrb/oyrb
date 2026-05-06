import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { REASON_LABELS, STATUS_LABELS, type DisputeStatus, type ReasonCode } from "@/lib/disputes";

export const metadata = { title: "Dispute Inquiries — OYRB" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

type DisputeRow = {
  id: string;
  reporter_type: "client" | "pro";
  reason_code: ReasonCode;
  status: DisputeStatus;
  filed_at: string;
  counter_deadline: string;
  resolved_at: string | null;
  weight: number;
  bookings: { start_at: string; clients: { name: string } | { name: string }[] | null } | null;
};

export default async function ProDisputesListPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Dispute Inquiries</h1>
        <p className="mt-4 text-sm text-[#737373]">No business yet.</p>
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("dispute_inquiries")
    .select(`
      id, reporter_type, reason_code, status, filed_at, counter_deadline, resolved_at, weight,
      bookings(start_at, clients(name))
    `)
    .eq("business_id", business.id)
    .order("filed_at", { ascending: false })
    .limit(100);

  const list = (rows ?? []) as unknown as DisputeRow[];
  const open = list.filter((r) => r.status === "awaiting_counter" || r.status === "under_review");
  const closed = list.filter(
    (r) => r.status === "resolved_strike" || r.status === "resolved_dismissed" || r.status === "expired",
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Dispute Inquiries</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Inquiries filed about (or by) your business. OYRB does not process refunds — these affect
        ratings only.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">
          Open ({open.length})
        </h2>
        <div className="mt-3 space-y-2">
          {open.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E7E5E4] p-8 text-center text-sm text-[#737373]">
              No open inquiries.
            </div>
          ) : (
            open.map((r) => <DisputeCard key={r.id} row={r} />)
          )}
        </div>
      </section>

      {closed.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">
            Resolved ({closed.length})
          </h2>
          <div className="mt-3 space-y-2 opacity-80">
            {closed.slice(0, 50).map((r) => <DisputeCard key={r.id} row={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function DisputeCard({ row }: { row: DisputeRow }) {
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
  const reporter = row.reporter_type === "client" ? `${clientName} filed` : `You filed about ${clientName}`;

  const statusCls =
    row.status === "resolved_strike"
      ? "bg-red-50 text-red-700"
      : row.status === "resolved_dismissed"
        ? "bg-emerald-50 text-emerald-700"
        : row.status === "awaiting_counter"
          ? "bg-amber-50 text-amber-700"
          : "bg-blue-50 text-blue-700";

  return (
    <Link
      href={`/dashboard/disputes/${row.id}`}
      className="block rounded-lg border border-[#E7E5E4] bg-white p-4 hover:border-[#B8896B]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{REASON_LABELS[row.reason_code]}</p>
          <p className="mt-0.5 text-xs text-[#737373]">
            {reporter} · Filed {filedLabel}
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
