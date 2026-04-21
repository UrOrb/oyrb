"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Decision = "kept" | "removed" | "more_info";

export function AdminDecisionButtons({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<Decision | null>(null);

  const decide = (decision: Decision) => {
    setErr(null);
    start(async () => {
      try {
        const res = await fetch("/api/dashboard/admin/reviews/decide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_id: reviewId, decision }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data.error ?? `HTTP ${res.status}`);
          return;
        }
        setDone(decision);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Network error");
      }
    });
  };

  if (done) {
    return (
      <span className="text-xs font-medium text-[#525252]">
        ✓ {done.replace(/_/g, " ")}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => decide("kept")}
        disabled={pending}
        className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Keep live
      </button>
      <button
        type="button"
        onClick={() => decide("removed")}
        disabled={pending}
        className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        Remove
      </button>
      <button
        type="button"
        onClick={() => decide("more_info")}
        disabled={pending}
        className="rounded-full border border-[#E7E5E4] bg-white px-3 py-1 text-[11px] font-semibold hover:bg-[#FAFAF9] disabled:opacity-50"
      >
        Need more info
      </button>
      {err && <span className="text-[10px] text-red-700">{err}</span>}
    </div>
  );
}
