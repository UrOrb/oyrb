"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, HelpCircle, X } from "lucide-react";
import { TEMPLATE_THEMES, LAYOUT_TYPES } from "@/lib/template-themes";
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

// One-line helper for each layout — shown as a tooltip on layout pills.
const LAYOUT_HELP: Record<string, string> = {
  original: "Classic stacked layout with hero + services below",
  studio:   "Warm serif editorial with service grid",
  luxe:     "Full-bleed hero with centered content",
  clean:    "Minimal list + sidebar — timeless and restrained",
  bold:     "Dark hero with service cards and sidebar",
};

// Hand-picked pairings shown under the preview. Featured on the brief as
// "Popular Pairings" — good starting points for users with decision paralysis.
const POPULAR_PAIRINGS: Array<{ layout: string; theme: string }> = [
  { layout: "studio", theme: "latte"   },
  { layout: "luxe",   theme: "noir"    },
  { layout: "clean",  theme: "quartz"  },
  { layout: "bold",   theme: "league"  },
];

type Props = {
  layout: string;
  initialThemeId: string;
  themeIds: string[];
};

export function ThemeCarousel({ layout: initialLayout, initialThemeId, themeIds }: Props) {
  const router = useRouter();

  const [layout, setLayout] = useState(initialLayout);
  const [themeId, setThemeId] = useState(initialThemeId);
  const [showExplainer, setShowExplainer] = useState(false);

  // Keep the URL in sync so refresh / share / signup-CTA always carry the
  // exact combo the user is viewing.
  const syncUrl = useCallback(
    (nextLayout: string, nextTheme: string) => {
      router.replace(`/templates/preview/${nextLayout}/${nextTheme}`, { scroll: false });
    },
    [router],
  );

  const selectLayout = useCallback(
    (id: string) => {
      setLayout(id);
      syncUrl(id, themeId);
    },
    [syncUrl, themeId],
  );

  const selectTheme = useCallback(
    (id: string) => {
      setThemeId(id);
      syncUrl(layout, id);
    },
    [syncUrl, layout],
  );

  const themeIndex = useMemo(() => themeIds.indexOf(themeId), [themeIds, themeId]);

  const cycleTheme = useCallback(
    (delta: number) => {
      const n = themeIds.length;
      const next = themeIds[((themeIndex + delta) % n + n) % n];
      selectTheme(next);
    },
    [selectTheme, themeIds, themeIndex],
  );

  const surprise = useCallback(() => {
    const layoutIds = LAYOUT_TYPES.map((l) => l.id);
    // Pick a pair that isn't the current one so the change is always visible.
    let nextLayout = layout;
    let nextTheme = themeId;
    let attempts = 0;
    while ((nextLayout === layout && nextTheme === themeId) && attempts < 8) {
      nextLayout = layoutIds[Math.floor(Math.random() * layoutIds.length)];
      nextTheme = themeIds[Math.floor(Math.random() * themeIds.length)];
      attempts += 1;
    }
    setLayout(nextLayout);
    setThemeId(nextTheme);
    syncUrl(nextLayout, nextTheme);
  }, [layout, themeId, themeIds, syncUrl]);

  // Keyboard arrow keys continue to cycle THEMES within the current layout —
  // preserves the prior carousel UX for users who got used to it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const t = e.target.tagName;
        if (t === "INPUT" || t === "TEXTAREA" || e.target.isContentEditable) return;
      }
      if (e.key === "ArrowRight") { e.preventDefault(); cycleTheme(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); cycleTheme(-1); }
      else if (e.key === "Escape" && showExplainer) { setShowExplainer(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycleTheme, showExplainer]);

  // Theme-scroller + preview refs. Swipe-to-cycle handlers bind to a
  // wrapper covering BOTH the scroller row and the preview area below.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const activePillRef = useRef<HTMLButtonElement | null>(null);
  const swipeWrapperRef = useRef<HTMLDivElement | null>(null);

  // Pointer-based swipe-to-cycle. Native pointer events cover both touch
  // and pen. `touch-action: pan-y` on the wrapper (set inline below) lets
  // vertical page scroll through while reserving horizontal for this
  // handler — that's what was missing before: the scroller's native
  // overflow-x-auto was eating every horizontal touch before the delta
  // could grow past the 50px threshold.
  useEffect(() => {
    const el = swipeWrapperRef.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      tracking = true;
    };
    const onUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Ignore slow drags (treated as scroll/selection), short taps (<50px),
      // and near-vertical swipes (preserve page scroll).
      if (Date.now() - startTime > 800) return;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      cycleTheme(dx < 0 ? 1 : -1);
    };
    const onCancel = () => { tracking = false; };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
    };
  }, [cycleTheme]);

  // Keep the active theme pill centered in the scroller as selection changes.
  // Honors prefers-reduced-motion — instant jump instead of smooth scroll.
  useEffect(() => {
    const pill = activePillRef.current;
    if (!pill) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    pill.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [themeId]);

  // Desktop trackpad two-finger horizontal swipe cycles themes (one swipe →
  // one theme). Bound to the whole swipe wrapper so a swipe over the
  // preview area OR the pill row both work — vertical wheels pass
  // through (deltaY > deltaX filter) so normal page scroll isn't hijacked.
  // Accumulates deltaX with a cool-down so a single inertial trackpad
  // swipe can't rapid-fire multiple theme changes. Shift+wheel is
  // handled automatically — the browser translates it into deltaX.
  const wheelAcc = useRef(0);
  const wheelCooldownUntil = useRef(0);
  const wheelResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const el = swipeWrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Predominantly-vertical events pass through (page scroll).
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      // Threshold check — ignore micro-wiggles from a resting trackpad.
      if (Math.abs(e.deltaX) < 12) return;
      // Prevent Safari's "swipe to go back" from eating the gesture + stop
      // any native horizontal scroll.
      e.preventDefault();
      const now = Date.now();
      if (now < wheelCooldownUntil.current) return;
      wheelAcc.current += e.deltaX;
      if (wheelResetTimer.current) clearTimeout(wheelResetTimer.current);
      wheelResetTimer.current = setTimeout(() => { wheelAcc.current = 0; }, 120);
      if (Math.abs(wheelAcc.current) > 80) {
        cycleTheme(wheelAcc.current > 0 ? 1 : -1);
        wheelAcc.current = 0;
        wheelCooldownUntil.current = Date.now() + 350;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [cycleTheme]);

  const theme = TEMPLATE_THEMES[themeId];
  const layoutLabel = LAYOUT_TYPES.find((l) => l.id === layout)?.name ?? layout;
  const categoryKey = CATEGORY_MAP[theme.business.category] ?? "hair";
  const services = SAMPLE_SERVICES_BY_CATEGORY[categoryKey];
  const templateProps = { theme, services, hours: SAMPLE_HOURS };

  const signupHref = `/signup?layout=${encodeURIComponent(layout)}&theme=${encodeURIComponent(themeId)}`;

  return (
    <div
      ref={swipeWrapperRef}
      className="relative overflow-x-hidden"
      // Reserve horizontal touch for the swipe handler; pass vertical
      // through so the page keeps scrolling naturally.
      style={{ touchAction: "pan-y" }}
    >
      {/* ── Sticky selector panel ── */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#111] text-white">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3 md:gap-2 md:py-2">
          {/* Top row: crumb + dynamic CTA + surprise */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <a href="/templates" className="opacity-60 hover:opacity-100">← All Templates</a>
              <span className="opacity-30">|</span>
              <span>
                <span className="opacity-60">Previewing:</span>{" "}
                <span className="font-medium capitalize">{layoutLabel} layout</span>
                <span className="opacity-50"> × </span>
                <span className="font-medium">{theme.name}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={surprise}
                className="inline-flex items-center gap-1.5 rounded bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/20"
                title="Randomize the layout and theme"
              >
                <Shuffle size={12} /> Surprise me
              </button>
              <a
                href={signupHref}
                className="rounded bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-gray-100"
              >
                Use {layoutLabel} + {theme.name} →
              </a>
            </div>
          </div>

          {/* Layout selector row */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-white/50">
              Layout
            </span>
            <div className="flex items-center gap-1.5">
              {LAYOUT_TYPES.map((l) => {
                const active = l.id === layout;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => selectLayout(l.id)}
                    title={LAYOUT_HELP[l.id] ?? l.description}
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      active
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    }`}
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowExplainer(true)}
              className="ml-1 inline-flex items-center gap-1 text-[10px] text-white/50 hover:text-white"
              title="What's the difference between a layout and a theme?"
            >
              <HelpCircle size={12} /> <span className="hidden sm:inline">What's the difference?</span>
            </button>
          </div>

          {/* Theme selector row — chevron-flanked horizontal carousel with
              scoped touch-swipe (mobile) + trackpad scroll (desktop) + click
              selection. Dots below reinforce carousel position. */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-white/50">
              Theme
            </span>

            <div
              ref={scrollerRef}
              className="-mx-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              // touch-action: pan-y lets the page scroll vertically but
              // stops the native horizontal pill scroll from eating
              // mobile swipes — those now reach the wrapper's swipe
              // handler and cycle themes instead.
              style={{ scrollSnapType: "x proximity", touchAction: "pan-y" }}
            >
              {themeIds.map((id) => {
                const t = TEMPLATE_THEMES[id];
                if (!t) return null;
                const active = id === themeId;
                return (
                  <button
                    key={id}
                    ref={active ? activePillRef : null}
                    type="button"
                    onClick={() => selectTheme(id)}
                    title={t.name}
                    aria-label={t.name}
                    aria-pressed={active}
                    style={{ scrollSnapAlign: "center" }}
                    className={`group relative shrink-0 rounded-full border px-2.5 py-1 transition-all ${
                      active
                        ? "border-white bg-white/15 ring-1 ring-white"
                        : "border-white/10 bg-white/5 hover:border-white/40 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {/* Swatch triplet — reads even at this size */}
                      <span
                        className="h-3 w-3 rounded-full border border-black/20"
                        style={{ backgroundColor: t.bg }}
                      />
                      <span
                        className="h-3 w-3 rounded-full border border-black/20"
                        style={{ backgroundColor: t.accent }}
                      />
                      <span
                        className="h-3 w-3 rounded-full border border-black/20"
                        style={{ backgroundColor: t.ink }}
                      />
                      <span
                        className={`text-[10px] ${
                          active ? "text-white" : "text-white/70 group-hover:text-white"
                        }`}
                      >
                        {t.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Dot indicators — mirror the active theme position. Clickable so
              keyboard / screen-reader users also have a way to jump. */}
          <div
            role="tablist"
            aria-label="Theme position"
            className="flex items-center justify-center gap-1 pt-0.5"
          >
            {themeIds.map((id, i) => {
              const active = id === themeId;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Theme ${i + 1} of ${themeIds.length}`}
                  onClick={() => selectTheme(id)}
                  className={`rounded-full transition-all ${
                    active ? "h-1.5 w-5 bg-white" : "h-1.5 w-1.5 bg-white/30 hover:bg-white/60"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Preview ── (rendering engine unchanged — just fed a (layout, theme) pair) */}
      <div key={`${layout}:${themeId}`} className="oyrb-theme-fade">
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

      {/* ── Popular pairings — below the preview ── */}
      <section className="border-t border-[#E7E5E4] bg-[#FAFAF8] px-4 py-8">
        <div className="mx-auto max-w-[1400px]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B8896B]">
            ⭐ Popular pairings
          </p>
          <p className="mt-1 text-sm text-[#737373]">
            Not sure where to start? Click one to jump straight to the combo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {POPULAR_PAIRINGS.map((p) => {
              const t = TEMPLATE_THEMES[p.theme];
              if (!t) return null;
              const lname = LAYOUT_TYPES.find((l) => l.id === p.layout)?.name ?? p.layout;
              const active = p.layout === layout && p.theme === themeId;
              return (
                <button
                  key={`${p.layout}:${p.theme}`}
                  type="button"
                  onClick={() => {
                    setLayout(p.layout);
                    setThemeId(p.theme);
                    syncUrl(p.layout, p.theme);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                      : "border-[#E7E5E4] bg-white text-[#525252] hover:bg-white"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: t.accent }}
                  />
                  <span className="font-medium">{lname}</span>
                  <span className="opacity-50">×</span>
                  <span className="font-medium">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Explainer dialog ── */}
      {showExplainer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Layouts vs themes"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowExplainer(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md rounded-2xl bg-white p-6 text-[#0A0A0A] shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setShowExplainer(false)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-1 text-[#737373] hover:bg-[#F5F5F4]"
            >
              <X size={16} />
            </button>
            <h3 className="font-display text-xl font-medium tracking-[-0.02em]">
              Layouts vs. themes
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#525252]">
              <strong className="text-[#0A0A0A]">Layouts</strong> are the structure of your site —
              how your content is arranged (hero, services, gallery, etc.). We have{" "}
              <strong className="text-[#0A0A0A]">5 layout structures</strong>: Original, Studio,
              Luxe, Clean, Bold.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#525252]">
              <strong className="text-[#0A0A0A]">Themes</strong> are the visual style — colors,
              accents, mood. We have <strong className="text-[#0A0A0A]">29 themes</strong> ranging
              from soft feminine to maximalist kawaii.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#525252]">
              Mix and match any layout with any theme for your perfect site —{" "}
              <strong className="text-[#0A0A0A]">145 combinations in total.</strong>
            </p>
            <button
              type="button"
              onClick={() => setShowExplainer(false)}
              className="mt-5 w-full rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:opacity-85"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
