import { notFound } from "next/navigation";
import { TEMPLATE_THEMES, LAYOUT_TYPES } from "@/lib/template-themes";
import { ThemeCarousel } from "./theme-carousel";

interface Props {
  params: Promise<{ layout: string; theme: string }>;
}

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

  const themeIds = Object.keys(TEMPLATE_THEMES);

  return <ThemeCarousel layout={layout} initialThemeId={themeId} themeIds={themeIds} />;
}
