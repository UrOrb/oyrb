"use client";

import { useState } from "react";
import { Star, ChevronDown } from "lucide-react";

export type Review = {
  id: string;
  client_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type Faq = { q: string; a: string };

export function FaqSection({
  faqs,
  accent,
  ink,
  muted,
  surface,
  border,
  displayFont,
}: {
  faqs: Faq[];
  accent: string;
  ink: string;
  muted: string;
  surface: string;
  border: string;
  displayFont: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (!faqs || faqs.length === 0) return null;
  return (
    <section
      className="px-6 py-16 md:py-20"
      style={{ backgroundColor: surface, borderTop: `1px solid ${border}`, color: ink }}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          className="mb-8 text-center text-3xl font-medium tracking-[-0.02em] md:text-4xl"
          style={{ fontFamily: displayFont }}
        >
          Frequently asked
        </h2>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-md"
              style={{ border: `1px solid ${border}` }}
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium hover:opacity-80"
              >
                <span>{f.q}</span>
                <ChevronDown
                  size={16}
                  className="shrink-0 transition-transform"
                  style={{ transform: open === i ? "rotate(180deg)" : "rotate(0)", color: accent }}
                />
              </button>
              {open === i && (
                <div
                  className="whitespace-pre-wrap px-4 pb-4 text-sm leading-relaxed"
                  style={{ color: muted }}
                >
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ReviewsSection({
  reviews,
  averageRating,
  totalReviews,
  accent,
  accent2,
  ink,
  muted,
  surface,
  border,
  displayFont,
}: {
  reviews: Review[];
  averageRating: number | null;
  totalReviews: number;
  accent: string;
  accent2: string;
  ink: string;
  muted: string;
  surface: string;
  border: string;
  displayFont: string;
}) {
  const hasReviews = !!reviews && reviews.length > 0;
  return (
    <section
      className="px-6 py-16 md:py-20"
      style={{ borderTop: `1px solid ${border}`, color: ink }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2
            className="text-3xl font-medium tracking-[-0.02em] md:text-4xl"
            style={{ fontFamily: displayFont }}
          >
            What clients say
          </h2>
          {hasReviews && averageRating !== null ? (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={18}
                    fill={n <= Math.round(averageRating) ? accent : "transparent"}
                    className="transition-colors"
                    style={{ color: accent }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium" style={{ color: muted }}>
                {averageRating.toFixed(1)} · {totalReviews} review{totalReviews === 1 ? "" : "s"}
              </p>
            </div>
          ) : (
            // Empty state: explicit "new pro" badge. Deliberately no stars —
            // the spec forbids fake 5-star defaults.
            <div
              className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
              style={{ border: `1px solid ${border}`, backgroundColor: surface, color: muted }}
            >
              <span aria-hidden>✨</span> New on OYRB
            </div>
          )}
        </div>

        {hasReviews ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-lg p-5"
                style={{ backgroundColor: surface, border: `1px solid ${border}` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={13}
                        fill={n <= r.rating ? accent : "transparent"}
                        style={{ color: accent }}
                      />
                    ))}
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                    style={{ border: `1px solid ${border}`, color: muted }}
                    title="Verified booking — this reviewer had a confirmed appointment."
                  >
                    ✓ Verified booking
                  </span>
                </div>
                {r.comment && (
                  <p className="text-sm leading-relaxed" style={{ color: ink }}>
                    &ldquo;{r.comment}&rdquo;
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between text-xs" style={{ color: muted }}>
                  <span className="font-medium">{r.client_name}</span>
                  <span>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mx-auto max-w-md text-center text-sm" style={{ color: muted }}>
            No reviews yet — be the first after your next appointment.
          </p>
        )}
      </div>
    </section>
  );
}
