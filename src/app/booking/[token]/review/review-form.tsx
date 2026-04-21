"use client";

import { useState } from "react";
import { Star } from "lucide-react";

type Props = { token: string };

export function ReviewForm({ token }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<"live_hold" | "flagged" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (rating === 0) {
      setError("Please pick a star rating.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Something went wrong (HTTP ${res.status}).`);
      } else {
        setSubmittedStatus(data.status === "flagged" ? "flagged" : "live_hold");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection issue. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedStatus) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <Star className="mx-auto text-emerald-600" fill="currentColor" size={28} />
        <p className="mt-3 text-sm font-semibold text-emerald-900">
          Review received — thank you!
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          {submittedStatus === "flagged"
            ? "Our team will take a quick look before it goes live. You don't need to do anything else."
            : "Your review will publish in 24 hours. The pro can see it in the meantime."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
      <label className="text-sm font-medium">Your rating</label>
      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <Star
              size={32}
              fill={n <= (hover || rating) ? "#F59E0B" : "transparent"}
              className="transition-colors"
              style={{ color: "#F59E0B" }}
            />
          </button>
        ))}
      </div>

      <label className="mt-6 block text-sm font-medium">Your review (optional)</label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        rows={5}
        placeholder="What did you love about your visit?"
        maxLength={500}
        className="mt-2 w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
      />
      <p className="mt-1 text-[10px] text-[#A3A3A3]">{comment.length}/500</p>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || rating === 0}
        className="mt-6 w-full rounded-full bg-[#0A0A0A] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
