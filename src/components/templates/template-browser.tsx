"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUp, Sparkles } from "lucide-react";
import type { TemplateTheme } from "@/lib/template-themes";

// The 3 starter-tier themes (kept in sync with site-builder.tsx STARTER_THEMES).
const STARTER_IDS = new Set(["aura", "minimal", "bold"]);

// Category presentation metadata — order, emoji, and subtitle per section.
// Order drives the section rendering sequence below.
const CATEGORY_META: Array<{
  key: TemplateTheme["category"];
  label: string;
  emoji: string;
  description: string;
}> = [
  { key: "feminine",  label: "Feminine",  emoji: "🌸", description: "Soft, romantic, elegant energy" },
  { key: "natural",   label: "Natural",   emoji: "🌿", description: "Earthy, warm, organic tones" },
  { key: "minimal",   label: "Minimal",   emoji: "🤍", description: "Clean, restrained, timeless" },
  { key: "editorial", label: "Editorial", emoji: "✒️", description: "Magazine-grade, confident composition" },
  { key: "bold",      label: "Bold",      emoji: "⚡", description: "High-contrast, kinetic, unapologetic" },
  { key: "street",    label: "Street",    emoji: "🎨", description: "Streetwear, graphic, graffiti energy" },
];

// Plan filter semantics:
//   "all"     — every theme
//   "starter" — only the 3 starter-tier themes
//   "studio"  — non-starter (studio-plus unlocks these)
//   "scale"   — currently == "studio" (no Scale-exclusive themes yet);
//               pill surfaced for parity with the pricing tiers so users
//               who think in "Scale" language find their way here.
type PlanFilter = "all" | "starter" | "studio" | "scale";
type CategoryFilter = "all" | TemplateTheme["category"];

export function TemplateBrowser({ themes }: { themes: TemplateTheme[] }) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Reveal the back-to-top pill once the user scrolls past the first viewport.
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = useMemo(() => {
    return themes.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (plan === "starter" && !STARTER_IDS.has(t.id)) return false;
      if ((plan === "studio" || plan === "scale") && STARTER_IDS.has(t.id)) return false;
      return true;
    });
  }, [themes, category, plan]);

  // Featured themes — filtered by the same active filters so the row stays
  // consistent with the rest of the page.
  const featured = useMemo(
    () =>
      filtered
        .filter((t) => t.is_featured)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [filtered],
  );

  // Group remaining filtered themes by category, sorted A–Z within each group.
  const byCategory = useMemo(() => {
    const map: Record<string, TemplateTheme[]> = {};
    for (const t of filtered) {
      (map[t.category] ||= []).push(t);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [filtered]);

  const isEmpty = filtered.length === 0;
  const clearFilters = () => {
    setCategory("all");
    setPlan("all");
  };

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="sticky top-0 z-20 -mx-6 mb-10 border-b border-[#E7E5E4] bg-white/95 px-6 py-4 backdrop-blur md:-mx-6">
        <div className="mx-auto flex max-w-[1300px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap gap-5">
            <FilterGroup label="Category">
              <Pill active={category === "all"} onClick={() => setCategory("all")}>All</Pill>
              {CATEGORY_META.map((c) => (
                <Pill
                  key={c.key}
                  active={category === c.key}
                  onClick={() => setCategory(c.key)}
                >
                  {c.label}
                </Pill>
              ))}
            </FilterGroup>

            <FilterGroup label="Plan">
              <Pill active={plan === "all"} onClick={() => setPlan("all")}>All plans</Pill>
              <Pill active={plan === "starter"} onClick={() => setPlan("starter")}>Starter-friendly</Pill>
              <Pill active={plan === "studio"} onClick={() => setPlan("studio")}>Studio+</Pill>
              <Pill active={plan === "scale"} onClick={() => setPlan("scale")}>Scale</Pill>
            </FilterGroup>
          </div>

          <Link
            href="/style-finder"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#B8896B] bg-[#B8896B] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            title="Style Finder quiz — coming soon"
          >
            <Sparkles size={13} /> Take the Style Finder
          </Link>
        </div>
      </div>

      {isEmpty && (
        <div className="mx-auto max-w-md rounded-xl border border-dashed border-[#E7E5E4] bg-white p-10 text-center">
          <p className="font-display text-xl text-[#0A0A0A]">
            No themes match those filters.
          </p>
          <p className="mt-2 text-sm text-[#737373]">
            Try removing a filter or browse all categories below.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:opacity-85"
          >
            Clear filters
          </button>
        </div>
      )}

      {!isEmpty && featured.length > 0 && (
        <Section
          emoji="⭐"
          label="Featured Templates"
          description="Our hand-picked favorites"
          count={featured.length}
        >
          {/* Featured row — horizontal scroll on mobile, standard grid ≥ sm */}
          <div className="-mx-6 overflow-x-auto px-6 pb-2 sm:overflow-visible">
            <div className="flex min-w-max gap-4 sm:grid sm:min-w-0 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {featured.map((theme) => (
                <div key={theme.id} className="w-[260px] shrink-0 sm:w-auto">
                  <PaletteCard layout="bold" theme={theme} />
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {!isEmpty &&
        CATEGORY_META.map((c) => {
          const list = byCategory[c.key];
          if (!list || list.length === 0) return null;
          return (
            <Section
              key={c.key}
              emoji={c.emoji}
              label={c.label}
              description={c.description}
              count={list.length}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {list.map((theme) => (
                  <PaletteCard key={theme.id} layout="bold" theme={theme} />
                ))}
              </div>
            </Section>
          );
        })}

      {/* Back-to-top floating button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-2.5 text-xs font-medium text-white shadow-lg transition-opacity hover:opacity-90"
          aria-label="Back to top"
        >
          <ArrowUp size={14} /> Back to top
        </button>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-[#A3A3A3] sm:inline">
        {label}
      </span>
      <div className="-mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1">
        {children}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
          : "border-[#E7E5E4] bg-white text-[#525252] hover:bg-[#FAFAF9]"
      }`}
    >
      {children}
    </button>
  );
}

function Section({
  emoji,
  label,
  description,
  count,
  children,
}: {
  emoji: string;
  label: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-[#0A0A0A] md:text-3xl">
            <span className="mr-2">{emoji}</span>
            {label}
            <span className="ml-2 text-sm font-normal text-[#A3A3A3]">({count})</span>
          </h2>
          <p className="mt-1 text-sm text-[#737373]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// ── Card ── (card design intentionally preserved from the old accordion
// view; only order/grouping on the page changes).
function PaletteCard({ layout, theme }: { layout: string; theme: TemplateTheme }) {
  const isStarter = STARTER_IDS.has(theme.id);
  return (
    <Link
      href={`/templates/preview/${layout}/${theme.id}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-[#E7E5E4] p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ backgroundColor: theme.bg }}
    >
      {/* Tier badge — top right */}
      <div
        className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
        style={{
          backgroundColor: isStarter ? theme.surface : theme.accent2,
          color: isStarter ? theme.muted : theme.bg,
        }}
      >
        {isStarter ? "All plans" : "Studio+"}
      </div>

      {/* Theme name in its own display font */}
      <div>
        <p
          className="text-2xl"
          style={{
            fontFamily: theme.displayFont,
            fontWeight: theme.displayWeight,
            color: theme.ink,
            letterSpacing: `${theme.displayTracking}em`,
          }}
        >
          {theme.name}
        </p>
        <p
          className="mt-1 text-[10px] uppercase tracking-widest"
          style={{ color: theme.muted }}
        >
          {theme.category}
        </p>
      </div>

      {/* Vibe description */}
      <p className="text-xs leading-relaxed" style={{ color: theme.muted }}>
        {theme.vibe}
      </p>

      {/* Color palette dots */}
      <div className="mt-auto flex items-center gap-1.5 pt-3">
        {[theme.bg, theme.surface, theme.ink, theme.accent, theme.accent2].map(
          (color, i) => (
            <div
              key={i}
              className="h-3.5 w-3.5 rounded-full border shadow-sm"
              style={{
                backgroundColor: color,
                borderColor:
                  color === theme.bg ? theme.border : "rgba(255,255,255,0.3)",
              }}
              title={color}
            />
          ),
        )}
      </div>

      {/* Hover preview indicator */}
      <div
        className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold opacity-0 shadow backdrop-blur-sm transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: theme.surface, color: theme.ink }}
      >
        Preview →
      </div>
    </Link>
  );
}
