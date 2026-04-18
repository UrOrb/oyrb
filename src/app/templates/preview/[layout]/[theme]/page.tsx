import { notFound } from "next/navigation";
import { TEMPLATE_THEMES, LAYOUT_TYPES } from "@/lib/template-themes";
import { SAMPLE_SERVICES_BY_CATEGORY, SAMPLE_HOURS } from "@/lib/template-images";
import { BoldTemplate } from "@/components/templates/bold";
import { CleanTemplate } from "@/components/templates/clean";
import { StudioTemplate } from "@/components/templates/studio";
import { LuxeTemplate } from "@/components/templates/luxe";

interface Props {
  params: Promise<{ layout: string; theme: string }>;
}

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

export async function generateStaticParams() {
  const params = [];
  for (const layout of LAYOUT_TYPES) {
    for (const themeId of Object.keys(TEMPLATE_THEMES)) {
      params.push({ layout: layout.id, theme: themeId });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props) {
  const { layout, theme: themeId } = await params;
  const theme = TEMPLATE_THEMES[themeId];
  if (!theme) return { title: "Template Preview" };
  return {
    title: `${theme.name} · ${layout.charAt(0).toUpperCase() + layout.slice(1)} Layout — OYRB Templates`,
    description: theme.vibe,
  };
}

export default async function TemplatePreviewPage({ params }: Props) {
  const { layout, theme: themeId } = await params;

  const validLayouts = LAYOUT_TYPES.map((l) => l.id);
  if (!validLayouts.includes(layout as never) || !TEMPLATE_THEMES[themeId]) {
    notFound();
  }

  const theme = TEMPLATE_THEMES[themeId];
  const categoryKey = CATEGORY_MAP[theme.business.category] ?? "hair";
  const services = SAMPLE_SERVICES_BY_CATEGORY[categoryKey];

  const templateProps = { theme, services, hours: SAMPLE_HOURS };

  return (
    <>
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
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-50 hidden sm:inline">{theme.vibe}</span>
          <a
            href="/signup"
            className="rounded bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-gray-100"
          >
            Use this template →
          </a>
        </div>
      </div>

      {/* Template */}
      {layout === "bold" && <BoldTemplate {...templateProps} />}
      {layout === "clean" && <CleanTemplate {...templateProps} />}
      {layout === "studio" && <StudioTemplate {...templateProps} />}
      {layout === "luxe" && <LuxeTemplate {...templateProps} />}
    </>
  );
}
