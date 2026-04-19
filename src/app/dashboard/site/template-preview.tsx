"use client";

import { TEMPLATE_THEMES } from "@/lib/template-themes";
import { BoldTemplate } from "@/components/templates/bold";
import { CleanTemplate } from "@/components/templates/clean";
import { StudioTemplate } from "@/components/templates/studio";
import { LuxeTemplate } from "@/components/templates/luxe";
import { OriginalTemplate } from "@/components/templates/original";
import { getStockImages } from "@/lib/stock-images";
import { DAY_NAMES, type BusinessHours } from "@/lib/types";

export type TemplatePreviewDraft = {
  business_name: string;
  tagline: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  hero_image_url: string | null;
  profile_image_url: string | null;
  gallery_photos: string[];
  template_layout: string;
  template_theme: string;
  template_content: Record<string, string>;
  service_category: string;
  subscription_status?: string;
};

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  deposit_cents?: number | null;
  description?: string | null;
};

type Props = {
  draft: TemplatePreviewDraft;
  services: Service[];
  hours: BusinessHours[];
};

export function TemplatePreview({ draft, services, hours }: Props) {
  const theme = TEMPLATE_THEMES[draft.template_theme] ?? TEMPLATE_THEMES.aura;
  const stock = getStockImages(draft.service_category);

  const sampleBusiness = {
    name: draft.business_name || "My Studio",
    tagline: draft.tagline ?? "",
    bio: draft.bio ?? "",
    location: [draft.city, draft.state].filter(Boolean).join(", ") || "",
    phone: draft.phone ?? "",
    email: draft.contact_email ?? "",
    instagram_url: draft.instagram_url ?? "",
    hero_image_url: draft.hero_image_url || stock.hero,
    profile_image_url: draft.profile_image_url || stock.profile,
    photos: draft.gallery_photos.length > 0 ? draft.gallery_photos : stock.gallery,
    subscription_status: draft.subscription_status ?? "active",
  };

  const sampleServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    duration_minutes: s.duration_minutes,
    price_cents: s.price_cents,
    deposit_cents: s.deposit_cents ?? 0,
    description: s.description ?? "",
  }));

  const hrMap = new Map(hours.map((h) => [h.day_of_week, h]));
  const sampleHours = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const h = hrMap.get(d);
    return {
      day: DAY_NAMES[d],
      open: !!h?.is_open,
      open_time: h?.open_time?.slice(0, 5) ?? "",
      close_time: h?.close_time?.slice(0, 5) ?? "",
    };
  });

  const templateProps = {
    business: sampleBusiness,
    services: sampleServices,
    hours: sampleHours,
    theme,
    content: draft.template_content,
  } as const;

  const layoutKey = draft.template_layout === "zip" ? "original" : draft.template_layout;
  const Template = ({
    original: OriginalTemplate,
    studio: StudioTemplate,
    luxe: LuxeTemplate,
    bold: BoldTemplate,
    clean: CleanTemplate,
  } as const)[layoutKey as "studio"] ?? OriginalTemplate;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = Template as any;
  return <Comp {...templateProps} />;
}
