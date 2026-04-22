"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

// Real verified reviews shown as a horizontally-scrolling, theme-matched
// strip of cards. Used by layouts that don't already have a dedicated
// reviews block (Studio / Luxe / Clean). Scrolls via swipe or chevron
// buttons; each card truncates to 2 lines with a "Read more" expand.
//
// Accessibility: focusable cards + chevrons, scroll container is
// tabbable. Auto-advance is opt-in and honors prefers-reduced-motion
// — callers can pass `autoAdvance` to enable the timer; by default
// the carousel is static until the user interacts.

export type CarouselReview = {
  id: string;
  client_name: string;   // "First L." or display name
  rating: number;        // 1-5
  comment: string | null;
  created_at: string;
};

type Props = {
  reviews: CarouselReview[];
  // Theme plumbing — templates forward their own palette so the carousel
  // blends visually. Omitted => neutral defaults.
  accent?: string;
  ink?: string;
  muted?: string;
  surface?: string;
  border?: string;
  displayFont?: string;
  autoAdvance?: boolean;
};

export function ReviewsCarousel({
  reviews,
  accent = "#B8896B",
  ink = "#0A0A0A",
  muted = "#737373",
  surface = "#FAFAF9",
  border = "#E7E5E4",
  displayFont,
  autoAdvance = false,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  // Recompute whether the chevrons should be enabled. Called on scroll
  // + on resize + on initial mount. Cheap — just reads scroll offsets.
  const refreshNav = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    refreshNav();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", refreshNav, { passive: true });
    window.addEventListener("resize", refreshNav);
    return () => {
      el.removeEventListener("scroll", refreshNav);
      window.removeEventListener("resize", refreshNav);
    };
  }, []);

  // Optional auto-advance. Respects prefers-reduced-motion + pauses
  // when the scroller is being interacted with.
  useEffect(() => {
    if (!autoAdvance) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let paused = false;
    const el = scrollerRef.current;
    if (!el) return;
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });
    const t = window.setInterval(() => {
      if (paused) return;
      const step = el.clientWidth * 0.8;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }, 6000);
    return () => {
      window.clearInterval(t);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [autoAdvance]);

  if (!reviews || reviews.length === 0) return null;

  const scrollByPage = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="relative">
      {/* Chevrons. Hidden on mobile — touch swipe is the primary nav. */}
      <button
        type="button"
        onClick={() => scrollByPage(-1)}
        disabled={!canLeft}
        aria-label="Previous reviews"
        className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--rc-border)] bg-white p-2 shadow-md transition-opacity hover:bg-[color:var(--rc-surface)] disabled:pointer-events-none disabled:opacity-0 md:flex"
        style={{ ["--rc-border" as string]: border, ["--rc-surface" as string]: surface } as React.CSSProperties}
      >
        <ChevronLeft size={16} style={{ color: ink }} />
      </button>
      <button
        type="button"
        onClick={() => scrollByPage(1)}
        disabled={!canRight}
        aria-label="Next reviews"
        className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--rc-border)] bg-white p-2 shadow-md transition-opacity hover:bg-[color:var(--rc-surface)] disabled:pointer-events-none disabled:opacity-0 md:flex"
        style={{ ["--rc-border" as string]: border, ["--rc-surface" as string]: surface } as React.CSSProperties}
      >
        <ChevronRight size={16} style={{ color: ink }} />
      </button>

      <div
        ref={scrollerRef}
        role="region"
        aria-label="Client reviews"
        tabIndex={0}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", touchAction: "pan-x" }}
      >
        {reviews.map((r) => {
          const isExpanded = expanded.has(r.id);
          const needsTruncate = (r.comment?.length ?? 0) > 140;
          return (
            <article
              key={r.id}
              className="flex w-[85%] shrink-0 snap-center flex-col gap-3 rounded-lg p-5 sm:w-[380px]"
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
                <p
                  className={`text-sm leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}
                  style={{ color: ink }}
                >
                  &ldquo;{r.comment}&rdquo;
                </p>
              )}

              {needsTruncate && (
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  className="self-start text-[11px] font-medium underline-offset-2 hover:underline"
                  style={{ color: accent }}
                >
                  {isExpanded ? "Show less" : "Read more"}
                </button>
              )}

              <div
                className="mt-auto flex items-center justify-between text-xs"
                style={{ color: muted, fontFamily: displayFont ?? undefined }}
              >
                <span className="font-medium">{r.client_name}</span>
                <span>
                  {new Date(r.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Hide the native webkit scrollbar via a scoped class. Keyboard
          nav + chevron buttons remain accessible. */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
