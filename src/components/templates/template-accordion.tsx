"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { TemplateTheme } from "@/lib/template-themes";

const STARTER_THEMES = new Set(["aura", "minimal", "bold"]);

type Layout = {
  id: string;
  name: string;
  description: string;
};

type Props = {
  layouts: readonly Layout[];
  themes: TemplateTheme[];
  defaultLayout?: string;
};

export function TemplateAccordion({
  layouts,
  themes,
  defaultLayout = "bold",
}: Props) {
  const [openLayout, setOpenLayout] = useState<string | null>(defaultLayout);

  return (
    <div className="space-y-3">
      {layouts.map((layout) => {
        const isOpen = openLayout === layout.id;
        return (
          <div
            key={layout.id}
            className="overflow-hidden rounded-xl border border-[#E7E5E4] bg-white"
          >
            {/* Header — click to toggle */}
            <button
              onClick={() => setOpenLayout(isOpen ? null : layout.id)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-[#FAFAF9]"
            >
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B8896B]">
                  Layout
                </p>
                <h2 className="font-display mt-0.5 text-xl font-medium tracking-[-0.02em] text-[#0A0A0A] md:text-2xl">
                  {layout.name}
                </h2>
                <p className="mt-1 text-sm text-[#737373]">{layout.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-[#A3A3A3] md:inline">
                  {themes.length} themes
                </span>
                <ChevronDown
                  size={20}
                  className="text-[#525252] transition-transform duration-300"
                  style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}
                />
              </div>
            </button>

            {/* Collapsible body */}
            <div
              className="grid transition-all duration-300 ease-out"
              style={{
                gridTemplateRows: isOpen ? "1fr" : "0fr",
              }}
            >
              <div className="overflow-hidden">
                <div className="border-t border-[#E7E5E4] p-5">
                  {/* Theme grid — palette swatches */}
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {themes.map((theme) => (
                      <PaletteCard
                        key={theme.id}
                        layout={layout.id}
                        theme={theme}
                      />
                    ))}
                  </div>

                  <div className="mt-6 border-t border-[#E7E5E4] pt-5 text-center">
                    <Link
                      href={`/templates/preview/${layout.id}/aura`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0A0A0A] hover:underline"
                    >
                      Live-preview the {layout.name} layout <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaletteCard({ layout, theme }: { layout: string; theme: TemplateTheme }) {
  const isStarter = STARTER_THEMES.has(theme.id);
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
          )
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
