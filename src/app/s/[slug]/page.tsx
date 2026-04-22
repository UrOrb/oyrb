import { notFound } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
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

  // Pull the signed-in user once up front — used both for the
  // unpublished-owner-preview fallback below AND for the
  // "Back to Dashboard" pill we render only to the site owner.
  const userSupabase = await createClient();
  const { data: { user } } = await userSupabase.auth.getUser();

  let { data: biz } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  // Owner preview: let a signed-in owner view their own site even if it's
  // unpublished, so the dashboard preview panel always works.
  if (!biz && user) {
    const { data: ownerBiz } = await supabase
      .from("businesses")
      .select("*")
      .eq("slug", slug)
      .eq("owner_id", user.id)
      .maybeSingle();
    biz = ownerBiz;
  }

  if (!biz) notFound();

  // Show the "Back to Dashboard" pill to the site owner only. Non-owners
  // (anonymous visitors, clients, other OYRB pros) never see it.
  const isOwner = !!user && user.id === biz.owner_id;

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

  // Reviews: live + flagged (flagged stays visible while admin is looking
  // at it; pending_24h_hold and removed do NOT render). Display uses
  // first_name + last_initial so clients stay pseudonymous; aggregate
  // rating comes from real reviews only — no fake 5-star default.
  let reviews: Review[] = [];
  let averageRating: number | null = null;
  let totalReviews = 0;
  try {
    const { data: reviewData } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, reviewer_first_name, reviewer_last_initial, client_name")
      .eq("business_id", biz.id)
      .in("status", ["live", "flagged"])
      .order("created_at", { ascending: false })
      .limit(12);
    reviews = (reviewData ?? []).map((r: Record<string, unknown>) => {
      const first = (r.reviewer_first_name as string | null) ?? "";
      const last = (r.reviewer_last_initial as string | null) ?? "";
      const fallback = (r.client_name as string | null) ?? "Anonymous";
      return {
        id: r.id as string,
        client_name: first ? (last ? `${first} ${last}.` : first) : fallback,
        rating: r.rating as number,
        comment: (r.comment as string | null) ?? null,
        created_at: r.created_at as string,
      };
    }) as Review[];
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
    slug: biz.slug,
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

  // Compute the three verified stats for the Original layout's stats
  // strip. Kept behind a layoutKey check so other layouts (which don't
  // render stats) don't pay the query cost.
  const layoutKeyForStats = biz.template_layout === "zip" ? "original" : biz.template_layout;
  let statsStrip: Array<{ value: string; label: string }> | null = null;
  if (layoutKeyForStats === "original") {
    const { loadProStatsInputs, resolveStat, sanitizeStatLabel, DEFAULT_LABELS } =
      await import("@/lib/pro-stats");
    const inputs = await loadProStatsInputs({
      id: biz.id,
      owner_id: biz.owner_id,
      service_category: biz.service_category ?? null,
      city: biz.city ?? null,
    });
    const content = (biz.template_content ?? {}) as Record<string, string>;
    const typeFor = (col: "stat_1_type" | "stat_2_type" | "stat_3_type", fallback: string) =>
      ((biz as unknown as Record<string, string | null>)[col] ?? fallback) as
        Parameters<typeof resolveStat>[0];
    const labelFor = (k: string, t: string) =>
      sanitizeStatLabel(content[k]) || DEFAULT_LABELS[t as keyof typeof DEFAULT_LABELS] || "";
    const t1 = typeFor("stat_1_type", "specialty");
    const t2 = typeFor("stat_2_type", "services_offered");
    const t3 = typeFor("stat_3_type", "location");
    statsStrip = [
      resolveStat(t1, inputs, labelFor("stat_1_label", t1)),
      resolveStat(t2, inputs, labelFor("stat_2_label", t2)),
      resolveStat(t3, inputs, labelFor("stat_3_label", t3)),
    ];
  }

  const templateProps = {
    business: sampleBusiness,
    services: sampleServices,
    hours: sampleHours,
    theme,
    content: (biz.template_content ?? {}) as Record<string, string>,
    statsStrip,
    // Pass real verified reviews into templates that render them inline
    // (Studio / Luxe / Clean via <ReviewsCarousel>). Original and Bold
    // ignore this prop — they render their own sample-review blocks
    // and get real reviews via the universal <ReviewsSection> below.
    reviews,
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
      {isOwner && (
        <a
          href="/dashboard"
          aria-label="Back to Dashboard"
          className="fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded-full bg-[#0A0A0A] px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_4px_16px_rgba(10,10,10,0.25)] backdrop-blur-sm transition-transform hover:-translate-y-px hover:bg-[#262626] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:left-auto sm:right-4 sm:translate-x-0"
        >
          ← Back to Dashboard
        </a>
      )}
      <Template {...templateProps} />

      {/* Reviews below template.
          Studio / Luxe / Clean render real reviews inline via their own
          <ReviewsCarousel>, so suppressing the universal grid here
          avoids showing the same reviews twice on those layouts.
          Original + Bold keep the universal section — their templates
          only carry sample reviews, so this is where the real ones land. */}
      {!["studio", "luxe", "clean"].includes(layoutKey) && (
        <ReviewsSection
          reviews={reviews}
          averageRating={averageRating}
          totalReviews={totalReviews}
          {...sectionColors}
        />
      )}

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
        rules={{
          intervalMinutes: biz.booking_interval_minutes ?? 30,
          allowLastMinute: biz.allow_last_minute_booking ?? true,
          lastMinuteCutoffHours: biz.last_minute_cutoff_hours ?? 2,
          dailyBreakBlocks: biz.daily_break_blocks ?? [],
        }}
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
