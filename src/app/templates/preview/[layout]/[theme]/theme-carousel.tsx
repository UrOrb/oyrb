"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TEMPLATE_THEMES } from "@/lib/template-themes";
import { SAMPLE_SERVICES_BY_CATEGORY, SAMPLE_HOURS } from "@/lib/template-images";
import { BoldTemplate } from "@/components/templates/bold";
import { CleanTemplate } from "@/components/templates/clean";
import { StudioTemplate } from "@/components/templates/studio";
import { LuxeTemplate } from "@/components/templates/luxe";
import { OriginalTemplate } from "@/components/templates/original";

const CATEGORY_MAP: Record<string, keyof typeof SAMPLE_SERVICES_BY_CATEGORY> = {
  "Barbershop": "barber",
  "Premium Grooming": "barber",
  "Nail Art & Extensions": "nails",
  "Lash Extensions & Beauty": "lashes",
  "Esthetics & Skincare": "skincare",
  "Holistic Skincare & Wellness": "skincare",
  "Hair & Wellness": "hair",
  "Makeup & Brow Artistry": "makeup",
  "Beauty & Makeup Artistry": "makeup",
  "Bridal & Hair Artistry": "hair",
  "Editorial Hair & Beauty": "hair",
  "Natural Hair & Color": "hair",
};

type Props = {
  layout: string;
  initialThemeId: string;
  themeIds: string[];
};

export function ThemeCarousel({ layout, initialThemeId, themeIds }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(() => {
    const i = themeIds.indexOf(initialThemeId);
    return i >= 0 ? i : 0;
  });

  // Go to a specific theme (wraps around the ends). URL updates without a
  // full page reload, so Select/Preview/Customize actions read the current
  // theme correctly on every refresh or share.
  const go = useCallback(
    (target: number) => {
      const n = themeIds.length;
      const clamped = ((target % n) + n) % n;
      setIndex(clamped);
      const id = themeIds[clamped];
      // replace rather than push — carousel browsing shouldn't fill the back
      // stack with every intermediate theme.
      router.replace(`/templates/preview/${layout}/${id}`, { scroll: false });
    },
    [layout, router, themeIds]
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // Keyboard arrow keys — bound to the window so users don't have to focus
  // any particular element to navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const t = e.target.tagName;
        if (t === "INPUT" || t === "TEXTAREA" || e.target.isContentEditable) return;
      }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Touch swipe — 50px threshold feels right: short enough to fire on a
  // casual flick, long enough to ignore taps.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return; // ignore vertical scroll
    if (dx < 0) next(); else prev();
  };

  const themeId = themeIds[index];
  const theme = TEMPLATE_THEMES[themeId];
  const categoryKey = CATEGORY_MAP[theme.business.category] ?? "hair";
  const services = SAMPLE_SERVICES_BY_CATEGORY[categoryKey];
  const templateProps = { theme, services, hours: SAMPLE_HOURS };

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="relative">
      {/* Preview toolbar */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 text-xs"
        style={{ backgroundColor: "#111", color: "#fff", fontFamily: "system-ui" }}
      >
        <div className="flex items-center gap-3">
          <a href="/templates" className="opacity-60 hover:opacity-100 transition-opacity">
            ← All Templates
          </a>
          <span className="opacity-30">|</span>
          <span className="font-medium">{theme.name}</span>
          <span className="opacity-50">·</span>
          <span className="opacity-60 capitalize">{layout} layout</span>
          <span className="opacity-30 hidden md:inline">|</span>
          <span className="opacity-40 hidden md:inline">
            {index + 1} / {themeIds.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-50 hidden lg:inline">{theme.vibe}</span>
          <a
            href={`/signup?layout=${encodeURIComponent(layout)}&theme=${encodeURIComponent(themeId)}`}
            className="rounded bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-gray-100"
          >
            Use this template →
          </a>
        </div>
      </div>

      {/* Left / right arrows — fixed over the preview, clear of the toolbar */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous theme"
        className="fixed left-3 top-1/2 z-40 -translate-y-1/2 rounded-full bg-black/70 p-2.5 text-white shadow-lg transition-transform hover:scale-110 hover:bg-black md:left-6 md:p-3"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next theme"
        className="fixed right-3 top-1/2 z-40 -translate-y-1/2 rounded-full bg-black/70 p-2.5 text-white shadow-lg transition-transform hover:scale-110 hover:bg-black md:right-6 md:p-3"
      >
        <ChevronRight size={20} />
      </button>

      {/* Template */}
      <div key={themeId}>
        {layout === "bold" && <BoldTemplate {...templateProps} />}
        {layout === "clean" && <CleanTemplate {...templateProps} />}
        {layout === "studio" && <StudioTemplate {...templateProps} />}
        {layout === "luxe" && <LuxeTemplate {...templateProps} />}
        {layout === "original" && <OriginalTemplate {...templateProps} />}
      </div>

      {/* Dot indicators */}
      <div
        className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/70 px-3 py-2 shadow-lg backdrop-blur"
        role="tablist"
        aria-label="Choose a theme"
      >
        {themeIds.map((id, i) => {
          const active = i === index;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={TEMPLATE_THEMES[id]?.name ?? id}
              onClick={() => go(i)}
              className={`transition-all ${
                active ? "h-2 w-6 bg-white" : "h-2 w-2 bg-white/40 hover:bg-white/70"
              } rounded-full`}
            />
          );
        })}
      </div>
    </div>
  );
}
