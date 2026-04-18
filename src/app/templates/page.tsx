import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { TEMPLATE_THEMES, LAYOUT_TYPES } from "@/lib/template-themes";
import { unsplash } from "@/lib/template-images";

const FILTER_TAGS = ["All", "Feminine", "Editorial", "Natural", "Bold", "Minimal", "Street"];

const THEME_LIST = Object.values(TEMPLATE_THEMES);

export const metadata = {
  title: "Template Gallery — OYRB",
  description: "Choose from 48 stunning booking page templates for beauty professionals. 4 layouts × 12 themes.",
};

export default function TemplatesPage() {
  return (
    <div className="flex flex-col bg-[#FAFAF8]">
      <Nav />

      {/* ── Hero ── */}
      <section className="border-b border-[#E7E5E4] bg-white px-6 py-20 text-center">
        <p className="mb-4 text-sm font-medium text-[#B8896B]">
          48 templates · 4 layouts · 12 themes
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-[#0A0A0A] md:text-6xl">
          Find your signature style.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[#525252] md:text-lg">
          Every template is fully responsive — stunning on mobile, tablet, and desktop.
          Pick a vibe, swap a theme, launch in minutes.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80"
          >
            Start free trial <ArrowRight size={14} />
          </Link>
          <p className="text-xs text-[#A3A3A3]">14 days free · No card required</p>
        </div>
      </section>

      {/* ── Template grid by layout ── */}
      <div className="mx-auto max-w-[1300px] px-6 py-16">
        {LAYOUT_TYPES.map((layout) => (
          <section key={layout.id} className="mb-20">
            {/* Layout header */}
            <div className="mb-8 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-[#B8896B]">Layout</p>
                <h2 className="font-display mt-1 text-2xl font-medium tracking-[-0.02em] text-[#0A0A0A] md:text-3xl">
                  {layout.name}
                </h2>
                <p className="mt-1 text-sm text-[#737373]">{layout.description}</p>
              </div>
              <Link
                href={`/templates/preview/${layout.id}/aura`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0A0A0A] hover:underline md:mt-0"
              >
                Preview all {layout.name} templates <ArrowRight size={13} />
              </Link>
            </div>

            {/* Theme cards grid */}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {THEME_LIST.map((theme) => (
                <TemplateCard key={theme.id} layout={layout.id} theme={theme} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── CTA ── */}
      <section className="border-t border-[#E7E5E4] bg-[#0A0A0A] px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <Sparkles className="mx-auto mb-4 text-[#B8896B]" size={32} />
          <h2 className="font-display text-3xl font-medium tracking-[-0.02em] text-white md:text-4xl">
            Your template, your brand.
          </h2>
          <p className="mt-4 text-[#A3A3A3]">
            Every template ships with your business name, services, colors, and photos.
            Customize everything in under 10 minutes.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-8 py-3 text-sm font-semibold text-[#0A0A0A] transition-opacity hover:opacity-90"
          >
            Get started free <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function TemplateCard({ layout, theme }: { layout: string; theme: (typeof TEMPLATE_THEMES)[string] }) {
  const heroId = theme.business.heroImageId;

  return (
    <Link
      href={`/templates/preview/${layout}/${theme.id}`}
      className="group relative overflow-hidden rounded-xl border border-[#E7E5E4] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >
      {/* Thumbnail */}
      <div className="relative h-44 w-full overflow-hidden">
        {/* Color swatch overlay to hint at theme palette */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background: `linear-gradient(135deg, ${theme.bg}dd 0%, ${theme.surface}00 60%)`,
          }}
        />
        <Image
          src={unsplash(heroId, 600, 80)}
          alt={`${theme.name} template preview`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="320px"
        />
        {/* Palette dots */}
        <div className="absolute bottom-3 left-3 z-20 flex gap-1.5">
          {[theme.bg, theme.accent, theme.ink].map((color, i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-full border border-white/40 shadow"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        {/* Preview badge */}
        <div className="absolute right-3 top-3 z-20 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#0A0A0A] opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          Preview →
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-[#0A0A0A]">{theme.name}</p>
            <p className="mt-0.5 text-xs text-[#737373]">{theme.vibe}</p>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
            style={{
              backgroundColor: `${theme.accent}22`,
              color: theme.accent,
            }}
          >
            {theme.category}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {theme.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[#E7E5E4] px-2 py-0.5 text-[10px] text-[#737373]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
