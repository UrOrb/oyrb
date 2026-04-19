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

  // Two-finger trackpad swipe on desktop. macOS/Windows trackpads fire `wheel`
  // events with non-zero deltaX for horizontal swipes; a single swipe is a
  // burst of events (gesture + inertia). We accumulate deltaX, fire once past
  // the threshold, then cool down so one swipe → one navigation.
  const wheelAcc = useRef(0);
  const wheelCooldownUntil = useRef(0);
  const wheelResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    const onWheel = (e: WheelEvent) => {
      // Only predominantly-horizontal swipes. Vertical scroll passes through.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      // Stop Safari's "swipe to go back" from hijacking the gesture.
      e.preventDefault();

      const now = Date.now();
      if (now < wheelCooldownUntil.current) return;

      wheelAcc.current += e.deltaX;
      if (wheelResetTimer.current) clearTimeout(wheelResetTimer.current);
      wheelResetTimer.current = setTimeout(() => { wheelAcc.current = 0; }, 120);

      if (Math.abs(wheelAcc.current) > 80) {
        if (wheelAcc.current > 0) next(); else prev();
        wheelAcc.current = 0;
        wheelCooldownUntil.current = Date.now() + 450;
      }
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [next, prev]);

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

      {/* Left / right arrows — desktop-only (hidden below md). Touch users
          navigate by swiping; the dot bar below covers both. */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous theme"
        className="fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 rounded-full bg-black/70 p-3 text-white shadow-lg transition-transform hover:scale-110 hover:bg-black md:block"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next theme"
        className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 rounded-full bg-black/70 p-3 text-white shadow-lg transition-transform hover:scale-110 hover:bg-black md:block"
      >
        <ChevronRight size={20} />
      </button>

      {/* Template — re-keyed so React remounts and the CSS fade re-fires */}
      <div key={themeId} className="oyrb-theme-fade">
        {layout === "bold" && <BoldTemplate {...templateProps} />}
        {layout === "clean" && <CleanTemplate {...templateProps} />}
        {layout === "studio" && <StudioTemplate {...templateProps} />}
        {layout === "luxe" && <LuxeTemplate {...templateProps} />}
        {layout === "original" && <OriginalTemplate {...templateProps} />}
      </div>
      <style>{`
        @keyframes oyrb-theme-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .oyrb-theme-fade { animation: oyrb-theme-fade-in 220ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .oyrb-theme-fade { animation: none; }
        }
      `}</style>

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
