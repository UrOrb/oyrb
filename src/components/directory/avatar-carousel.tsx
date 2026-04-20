"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicListing } from "@/lib/directory";

type Props = {
  listings: PublicListing[];
  autoScroll?: boolean;
};

/**
 * Horizontal avatar carousel for /find hero. Supports:
 *   · Native touch swipe via overflow-x-auto + scroll-snap
 *   · Trackpad horizontal wheel (browser-native)
 *   · Chevron buttons (desktop only, md+)
 *   · Slow auto-scroll (desktop only, paused on hover/focus)
 *   · prefers-reduced-motion — disables auto-scroll + smooth-scroll
 */
export function AvatarCarousel({ listings, autoScroll = true }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Auto-scroll loop — advance 1px every ~33ms on desktop. Pauses when
  // the user hovers, focuses, or prefers-reduced-motion is on.
  useEffect(() => {
    if (!autoScroll || paused || reducedMotion) return;
    const el = scrollerRef.current;
    if (!el) return;
    // Skip on narrow/touch viewports — mobile users swipe.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) return;

    const id = window.setInterval(() => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 1) el.scrollLeft = 0;
      else el.scrollLeft += 1;
    }, 33);
    return () => window.clearInterval(id);
  }, [autoScroll, paused, reducedMotion, listings.length]);

  const scrollBy = (dx: number) => {
    scrollerRef.current?.scrollBy({
      left: dx,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  if (listings.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-[#E7E5E4] bg-white p-8 text-center">
        <p className="font-display text-lg text-[#0A0A0A]">
          Be one of the first
        </p>
        <p className="mt-1 text-sm text-[#737373]">
          The directory is brand new. Opt in from your dashboard and help
          clients discover you.
        </p>
        <Link
          href="/dashboard/directory"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:opacity-85"
        >
          Join the directory →
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Left chevron — desktop only */}
      <button
        type="button"
        onClick={() => scrollBy(-320)}
        aria-label="Scroll left"
        className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-[#E7E5E4] bg-white p-2 shadow-sm transition-opacity hover:opacity-80 md:flex"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(320)}
        aria-label="Scroll right"
        className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-[#E7E5E4] bg-white p-2 shadow-sm transition-opacity hover:opacity-80 md:flex"
      >
        <ChevronRight size={18} />
      </button>

      <div
        ref={scrollerRef}
        className="-mx-6 flex gap-5 overflow-x-auto scroll-smooth px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x proximity" }}
      >
        {listings.map((l) => (
          <AvatarCard key={l.slug} listing={l} />
        ))}
      </div>
    </div>
  );
}

function AvatarCard({ listing }: { listing: PublicListing }) {
  const name = listing.businessName ?? "Beauty Pro";
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <Link
      href={`/find/${listing.slug}`}
      className="group flex w-[180px] shrink-0 flex-col items-center gap-3 rounded-2xl border border-transparent p-3 transition-all hover:-translate-y-0.5 hover:border-[#E7E5E4] hover:shadow-sm"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white bg-[#F5EDE4] shadow-sm">
        {listing.avatarUrl ? (
          <Image
            src={listing.avatarUrl}
            alt={name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-medium text-[#B8896B]">
            {initial}
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-[#0A0A0A] line-clamp-1">{name}</p>
        {listing.profession && (
          <p className="mt-0.5 text-xs text-[#737373] line-clamp-1">{listing.profession}</p>
        )}
        {!listing.profession && listing.city && (
          <p className="mt-0.5 text-xs text-[#737373] line-clamp-1">
            {listing.city}
            {listing.state && `, ${listing.state}`}
          </p>
        )}
      </div>
    </Link>
  );
}
