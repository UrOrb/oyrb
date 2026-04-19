import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getStockImages } from "@/lib/stock-images";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { TEMPLATE_THEMES } from "@/lib/template-themes";
import { BoldTemplate } from "@/components/templates/bold";
import { CleanTemplate } from "@/components/templates/clean";
import { StudioTemplate } from "@/components/templates/studio";
import { LuxeTemplate } from "@/components/templates/luxe";
import { OriginalTemplate } from "@/components/templates/original";
import { BookingWidget } from "./booking-widget";
import { ChatWidget } from "./chat-widget";
import { FaqSection, ReviewsSection, type Faq, type Review } from "./faq-reviews";
import { InquiryForm } from "./inquiry-form";
import { DAY_NAMES } from "@/lib/types";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: biz } = await supabase
    .from("businesses")
    .select("business_name, tagline, bio, hero_image_url, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!biz) return { title: "Not found" };
  return {
    title: `${biz.business_name} — Book your appointment`,
    description: biz.tagline ?? biz.bio ?? undefined,
    openGraph: biz.hero_image_url
      ? { images: [{ url: biz.hero_image_url }] }
      : undefined,
  };
}

export default async function PublicSitePage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: biz } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!biz) notFound();

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [{ data: services }, { data: hours }, { count: bookingsThisWeek }] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("business_id", biz.id)
      .eq("active", true)
      .order("price_cents", { ascending: true }),
    supabase
      .from("business_hours")
      .select("*")
      .eq("business_id", biz.id)
      .order("day_of_week"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", biz.id)
      .neq("status", "cancelled")
      .gte("start_at", now.toISOString())
      .lte("start_at", weekAhead.toISOString()),
  ]);

  // Reviews (approved only, limit 12 most recent)
  let reviews: Review[] = [];
  let averageRating: number | null = null;
  let totalReviews = 0;
  try {
    const { data: reviewData } = await supabase
      .from("reviews")
      .select("id, client_name, rating, comment, created_at")
      .eq("business_id", biz.id)
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(12);
    reviews = (reviewData ?? []) as Review[];
    if (reviews.length > 0) {
      averageRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      totalReviews = reviews.length;
    }
  } catch {
    // reviews table may not exist yet; fail silently
  }

  const faqs: Faq[] = Array.isArray(biz.faq_json)
    ? (biz.faq_json as Faq[]).filter((f) => f && typeof f.q === "string" && typeof f.a === "string" && f.q && f.a)
    : [];

  // Rough estimate: sum open minutes across the week, assume 60-min avg slots
  const openMinutesPerWeek = (hours ?? [])
    .filter((h: { is_open: boolean }) => h.is_open)
    .reduce((sum: number, h: { open_time?: string; close_time?: string }) => {
      if (!h.open_time || !h.close_time) return sum;
      const [oh, om] = h.open_time.split(":").map(Number);
      const [ch, cm] = h.close_time.split(":").map(Number);
      return sum + (ch * 60 + cm) - (oh * 60 + om);
    }, 0);
  const slotsPerWeek = Math.floor(openMinutesPerWeek / 60);
  const slotsOpenThisWeek = Math.max(0, slotsPerWeek - (bookingsThisWeek ?? 0));

  const theme = TEMPLATE_THEMES[biz.template_theme] ?? TEMPLATE_THEMES.aura;

  // Category-matched stock as a fallback when the owner hasn't uploaded their own.
  const stock = getStockImages(biz.service_category);
  const galleryFromDb: string[] = Array.isArray(biz.gallery_photos)
    ? biz.gallery_photos.filter((x: unknown): x is string => typeof x === "string")
    : [];

  // Map DB business → SampleBusiness shape the templates expect
  const sampleBusiness = {
    name: biz.business_name,
    tagline: biz.tagline ?? "",
    bio: biz.bio ?? "",
    location: [biz.city, biz.state].filter(Boolean).join(", ") || "",
    phone: biz.phone ?? "",
    email: biz.contact_email ?? "",
    instagram_url: biz.instagram_url ?? "",
    hero_image_url: biz.hero_image_url || stock.hero,
    profile_image_url: biz.profile_image_url || stock.profile,
    photos: galleryFromDb.length > 0 ? galleryFromDb : stock.gallery,
    subscription_status: biz.subscription_status,
  };

  const sampleServices = (services ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    duration_minutes: s.duration_minutes,
    price_cents: s.price_cents,
    deposit_cents: s.deposit_cents ?? 0,
    description: s.description ?? "",
  }));

  // Re-order to Mon-first and convert to SampleHour format
  const hrMap = new Map((hours ?? []).map((h: any) => [h.day_of_week, h]));
  const sampleHours = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const h = hrMap.get(d) as any;
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
  } as any;

  // Legacy rows saved with `template_layout === "zip"` map to the renamed Original.
  const layoutKey = biz.template_layout === "zip" ? "original" : biz.template_layout;
  const Template = ({
    original: OriginalTemplate,
    studio: StudioTemplate,
    luxe: LuxeTemplate,
    bold: BoldTemplate,
    clean: CleanTemplate,
  } as const)[layoutKey as "studio"] ?? OriginalTemplate;

  const sectionColors = {
    accent: theme.accent,
    accent2: theme.accent2,
    ink: theme.ink,
    muted: theme.muted,
    surface: theme.surface,
    border: theme.border,
    displayFont: theme.displayFont,
  };

  return (
    <>
      <Template {...templateProps} />

      {/* Reviews below template */}
      <ReviewsSection
        reviews={reviews}
        averageRating={averageRating}
        totalReviews={totalReviews}
        {...sectionColors}
      />

      {/* FAQ */}
      <FaqSection faqs={faqs} {...sectionColors} />

      {/* Inquiry form — ask before booking */}
      <InquiryForm
        slug={slug}
        businessName={biz.business_name}
        accent={theme.accent}
        btnBg={theme.btnBg}
        btnText={theme.btnText}
        ink={theme.ink}
        muted={theme.muted}
        surface={theme.surface}
        border={theme.border}
        displayFont={theme.displayFont}
      />

      {/* Booking widget floats bottom-right */}
      <BookingWidget
        businessId={biz.id}
        businessName={biz.business_name}
        services={sampleServices}
        hours={sampleHours}
        accent={theme.accent}
        btnBg={theme.btnBg}
        btnText={theme.btnText}
        clientPolicies={biz.client_policies ?? ""}
        cancellationPolicy={biz.cancellation_policy ?? ""}
        slotsOpenThisWeek={slotsOpenThisWeek}
        slug={slug}
        phoneVerificationEnabled={!!process.env.TWILIO_VERIFY_SERVICE_SID}
      />

      {/* AI chat widget floats bottom-left (doesn't overlap booking) */}
      {process.env.ANTHROPIC_API_KEY && (
        <ChatWidget
          slug={slug}
          businessName={biz.business_name}
          accent={theme.accent}
          btnBg={theme.btnBg}
          btnText={theme.btnText}
        />
      )}
    </>
  );
}
