import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/current-site";
import { Star } from "lucide-react";
import { FlagReviewButton } from "./flag-button";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  published_at: string | null;
  status: string;
  flagged_at: string | null;
  flagged_reason: string | null;
  admin_decision: string | null;
  reviewer_first_name: string | null;
  reviewer_last_initial: string | null;
  client_name: string | null;
};

export default async function ReviewsDashboardPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Reviews</h1>
        <p className="mt-4 text-sm text-[#737373]">Complete checkout first to receive reviews.</p>
      </div>
    );
  }

  const { data: reviewsData } = await supabase
    .from("reviews")
    .select(`
      id, rating, comment, created_at, published_at, status,
      flagged_at, flagged_reason, admin_decision,
      reviewer_first_name, reviewer_last_initial, client_name
    `)
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const reviews = (reviewsData ?? []) as ReviewRow[];
  const live = reviews.filter((r) => r.status === "live" || r.status === "flagged");
  const pending = reviews.filter((r) => r.status === "pending_24h_hold");
  const removed = reviews.filter((r) => r.status === "removed");

  const avg =
    live.length > 0
      ? live.reduce((s, r) => s + r.rating, 0) / live.length
      : null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">Reviews</h1>
          <p className="mt-1 text-sm text-[#737373]">
            What clients are saying after their appointments.
          </p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={16}
                fill={avg && n <= Math.round(avg) ? "#F59E0B" : "transparent"}
                style={{ color: "#F59E0B" }}
              />
            ))}
            <span className="ml-1 text-sm font-semibold">
              {avg ? avg.toFixed(1) : "—"}
            </span>
          </div>
          <p className="text-[11px] text-[#737373]">
            {live.length} public review{live.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <p className="mt-4 rounded-md bg-[#FAFAF9] px-4 py-3 text-xs text-[#525252]">
        Your star rating is calculated automatically from real reviews. You
        can&apos;t edit it, and you can&apos;t take down a review yourself — if
        a review breaks the rules, flag it and an admin will review it.
      </p>

      {pending.length > 0 && (
        <Section
          title="In 24-hour hold"
          subtitle="These have been submitted but aren't public yet — you can reach out and resolve any issues before they go live."
        >
          {pending.map((r) => (
            <ReviewCard key={r.id} review={r} badge="HOLD" />
          ))}
        </Section>
      )}

      <Section
        title={`Live reviews (${live.length})`}
        subtitle="Showing on your public site."
        empty={
          live.length === 0
            ? "No live reviews yet — they show up here once the 24-hour hold clears."
            : undefined
        }
      >
        {live.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </Section>

      {removed.length > 0 && (
        <Section
          title="Removed by admin"
          subtitle="These reviews are no longer visible publicly."
        >
          {removed.map((r) => (
            <ReviewCard key={r.id} review={r} badge="REMOVED" />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  empty,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  empty?: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-[#737373]">{subtitle}</p>}
      <div className="mt-3 space-y-3">
        {empty ? (
          <div className="rounded-lg border border-dashed border-[#E7E5E4] p-8 text-center text-sm text-[#737373]">
            {empty}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function ReviewCard({ review, badge }: { review: ReviewRow; badge?: string }) {
  const displayName = review.reviewer_first_name
    ? review.reviewer_last_initial
      ? `${review.reviewer_first_name} ${review.reviewer_last_initial}.`
      : review.reviewer_first_name
    : review.client_name ?? "Anonymous";

  const alreadyFlagged = review.status === "flagged";

  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={14}
                fill={n <= review.rating ? "#F59E0B" : "transparent"}
                style={{ color: "#F59E0B" }}
              />
            ))}
            <span className="ml-1 text-sm font-semibold">{displayName}</span>
          </div>
          <p className="mt-0.5 text-xs text-[#A3A3A3]">
            {new Date(review.created_at).toLocaleDateString()} · {review.status.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              {badge}
            </span>
          )}
          {alreadyFlagged && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Awaiting admin
            </span>
          )}
          {(review.status === "live" || review.status === "flagged") && !alreadyFlagged && (
            <FlagReviewButton reviewId={review.id} />
          )}
          {alreadyFlagged && (
            <FlagReviewButton reviewId={review.id} disabled />
          )}
        </div>
      </div>

      {review.comment && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-[#0A0A0A]">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}

      {review.flagged_reason && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          Flagged as <strong>{review.flagged_reason.replace(/_/g, " ")}</strong>
          {review.flagged_at
            ? ` on ${new Date(review.flagged_at).toLocaleDateString()}`
            : ""}
          . An admin will review it.
        </p>
      )}
    </div>
  );
}
