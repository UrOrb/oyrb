import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { TEMPLATE_THEMES, LAYOUT_TYPES } from "@/lib/template-themes";
import { TemplateAccordion } from "@/components/templates/template-accordion";

const THEME_LIST = Object.values(TEMPLATE_THEMES);
const THEME_COUNT = THEME_LIST.length;
const LAYOUT_COUNT = LAYOUT_TYPES.length;
const TEMPLATE_COUNT = THEME_COUNT * LAYOUT_COUNT;

export const metadata = {
  title: "Templates",
  description: `Choose from ${TEMPLATE_COUNT} stunning booking page templates for beauty professionals. ${LAYOUT_COUNT} layouts × ${THEME_COUNT} themes.`,
};

export default function TemplatesPage() {
  return (
    <div className="flex flex-col bg-[#FAFAF8]">
      <Nav />

      {/* ── Hero ── */}
      <section className="border-b border-[#E7E5E4] bg-white px-6 py-20 text-center">
        <p className="mb-4 text-sm font-medium text-[#B8896B]">
          {TEMPLATE_COUNT} templates · {LAYOUT_COUNT} layouts · {THEME_COUNT} themes
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
          <p className="text-xs text-[#A3A3A3]">14 days free · Card required, no charge until day 15</p>
        </div>
      </section>

      {/* ── Accordion of layouts ── */}
      <div className="mx-auto w-full max-w-[1300px] px-6 py-16">
        <TemplateAccordion
          layouts={LAYOUT_TYPES}
          themes={THEME_LIST}
          defaultLayout="bold"
        />
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
