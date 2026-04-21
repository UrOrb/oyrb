import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { Star } from "lucide-react";
import { AdminDecisionButtons } from "./decision-buttons";

export const metadata = { title: "Admin · Flagged reviews" };
export const dynamic = "force-dynamic";

type FlaggedRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  flagged_at: string | null;
  flagged_reason: string | null;
  reviewer_first_name: string | null;
  reviewer_last_initial: string | null;
  client_name: string | null;
  client_email: string | null;
  businesses: { business_name: string; slug: string } | null;
};

export default async function AdminReviewsPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-10 text-sm text-[#737373]">
        {gate.error} (HTTP {gate.status})
      </div>
    );
  }

  const supabase = createAdminClient();
  const { data: flaggedData } = await supabase
    .from("reviews")
    .select(`
      id, rating, comment, created_at, flagged_at, flagged_reason,
      reviewer_first_name, reviewer_last_initial, client_name, client_email,
      businesses(business_name, slug)
    `)
    .eq("status", "flagged")
    .order("flagged_at", { ascending: false });

  const { data: recentDecisionsData } = await supabase
    .from("reviews")
    .select(`
      id, status, admin_decision, admin_reviewed_at,
      rating, comment,
      reviewer_first_name, reviewer_last_initial, client_name,
      businesses(business_name)
    `)
    .not("admin_reviewed_at", "is", null)
    .order("admin_reviewed_at", { ascending: false })
    .limit(20);

  const flagged = (flaggedData ?? []) as FlaggedRow[];
  const recent = (recentDecisionsData ?? []) as unknown as Array<{
    id: string;
    status: string;
    admin_decision: string | null;
    admin_reviewed_at: string | null;
    rating: number;
    comment: string | null;
    reviewer_first_name: string | null;
    reviewer_last_initial: string | null;
    client_name: string | null;
    businesses: { business_name: string } | null;
  }>;

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Flagged reviews
      </h1>
      <p className="mt-1 text-sm text-[#737373]">
        Reviews pros have flagged for admin attention. Keep or remove; all
        actions are logged.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">
          Awaiting decision ({flagged.length})
        </h2>
        <div className="mt-3 space-y-3">
          {flagged.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E7E5E4] p-8 text-center text-sm text-[#737373]">
              Nothing in the queue. All caught up.
            </div>
          ) : (
            flagged.map((r) => <FlaggedCard key={r.id} r={r} />)
          )}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">
            Recent admin decisions
          </h2>
          <div className="mt-3 space-y-2">
            {recent.map((r) => {
              const name = r.reviewer_first_name
                ? r.reviewer_last_initial
                  ? `${r.reviewer_first_name} ${r.reviewer_last_initial}.`
                  : r.reviewer_first_name
                : r.client_name ?? "Anonymous";
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        r.admin_decision === "kept"
                          ? "bg-emerald-50 text-emerald-800"
                          : r.admin_decision === "removed"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {r.admin_decision}
                    </span>
                    <span className="text-[#525252]">
                      {name} · {r.rating}★ · {r.businesses?.business_name ?? "?"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#A3A3A3]">
                    {r.admin_reviewed_at
                      ? new Date(r.admin_reviewed_at).toLocaleString()
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function FlaggedCard({ r }: { r: FlaggedRow }) {
  const displayName = r.reviewer_first_name
    ? r.reviewer_last_initial
      ? `${r.reviewer_first_name} ${r.reviewer_last_initial}.`
      : r.reviewer_first_name
    : r.client_name ?? "Anonymous";

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={14}
                fill={n <= r.rating ? "#F59E0B" : "transparent"}
                style={{ color: "#F59E0B" }}
              />
            ))}
            <span className="ml-1 text-sm font-semibold">{displayName}</span>
          </div>
          <p className="mt-0.5 text-xs text-[#737373]">
            on <strong>{r.businesses?.business_name ?? "?"}</strong> ·{" "}
            submitted {new Date(r.created_at).toLocaleDateString()}
            {r.flagged_at ? ` · flagged ${new Date(r.flagged_at).toLocaleDateString()}` : ""}
          </p>
          {r.flagged_reason && (
            <p className="mt-1 text-[11px] font-medium text-amber-800">
              Reason: {r.flagged_reason.replace(/_/g, " ")}
            </p>
          )}
          {r.client_email && (
            <p className="mt-0.5 text-[11px] text-[#A3A3A3]">
              Reviewer email: {r.client_email}
            </p>
          )}
        </div>
        <AdminDecisionButtons reviewId={r.id} />
      </div>
      {r.comment && (
        <p className="mt-3 whitespace-pre-wrap rounded-md border border-amber-200 bg-white px-3 py-2 text-sm">
          &ldquo;{r.comment}&rdquo;
        </p>
      )}
    </div>
  );
}
