"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
        body: JSON.stringify({ booking_id: bookingId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else setSubmitted(true);
    } catch {
      setError("Connection issue. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center">
        <Star className="mx-auto text-green-600" fill="currentColor" size={28} />
        <p className="mt-3 text-sm font-semibold text-green-900">Review submitted — thank you!</p>
        <p className="mt-1 text-xs text-green-800">Your feedback will appear on the booking page shortly.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-6">
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
        onChange={(e) => setComment(e.target.value)}
        rows={5}
        placeholder="What did you love about your visit?"
        maxLength={1200}
        className="mt-2 w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
      />

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || rating === 0}
        className="mt-6 w-full rounded-md bg-[#0A0A0A] py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>

      <p className="mt-4 text-center text-xs text-[#A3A3A3]">
        Your review is public. You&apos;ll be shown by your first name.
      </p>
    </div>
  );
}
