import { notFound } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getStockImages } from "@/lib/stock-images";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { TEMPLATE_THEMES } from "@/lib/template-themes";
import { resolveFontFamily } from "@/lib/storefront-fonts";
import { BoldTemplate } from "@/components/templates/bold";
import { CleanTemplate } from "@/components/templates/clean";
import { StudioTemplate } from "@/components/templates/studio";
import { LuxeTemplate } from "@/components/templates/luxe";
import { OriginalTemplate } from "@/components/templates/original";
import { BookingWidget } from "./booking-widget";
import { clientPaymentsEnabled } from "@/lib/client-payments";
import { connectReady } from "@/lib/stripe-connect";
import { ChatWidget } from "./chat-widget";
import { FaqSection, ReviewsSection, type Faq, type Review } from "./faq-reviews";
import { InquiryForm } from "./inquiry-form";
import { DAY_NAMES } from "@/lib/types";
import type { Metadata } from "next";
import {
  loadStorefrontTrustedPros,
  isVacationActive,
  resolveTrustedProsContext,
} from "@/lib/pass-the-torch-storefront";
import { VacationBanner } from "@/components/storefront/vacation-banner";
import { after } from "next/server";
import { cookies, headers } from "next/headers";
import {
  parseReferralCookie,
  REFERRAL_COOKIE_NAME,
} from "@/lib/referrer-classifier";
import {
  recordStorefrontView,
  hashIp,
  extractClientIp,
} from "@/lib/storefront-view-tracking";
import { RefBadge } from "@/components/storefront/ref-badge";
import { ReputationCard } from "@/components/storefront/reputation-card";
import { getReputationStats } from "@/lib/reputation-stats";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
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

export default async function PublicSitePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ref: refParam } = await searchParams;
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

  // Phase 5 closer — storefront view tracking. Schedules a
  // fire-and-forget INSERT via after() so it runs after the response
  // is committed; rendering is never blocked. Skipped when:
  //   - The visitor IS the storefront's own owner (preview hits
  //     would pollute analytics)
  //   - The referral cookie has no session_id (cookies set before
  //     this PR's deploy don't carry one — proxy will set it on the
  //     next request, but for now we skip this view rather than
  //     INSERT a row we can't dedup).
  // The 30-min dedup window is enforced inside recordStorefrontView
  // via a query against storefront_views.viewed_at — see migration 047
  // and src/lib/storefront-view-tracking.ts. Sub-routes
  // (/s/[slug]/booking-confirmed, /s/[slug]/gift-cards, etc.) live in
  // their own page.tsx files and don't schedule this after() call;
  // only landing-page views are tracked.
  if (!isOwner) {
    const bizId = biz.id as string;
    const refSlug = typeof refParam === "string" ? refParam : null;
    after(async () => {
      try {
        const cookieStore = await cookies();
        const cookieValue = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;
        const referral = parseReferralCookie(cookieValue);
        if (!referral.session_id) return;

        // Resolve referrer_business_id from ?ref=<slug> URL param
        // (same self-referral guard as PR #36's booking-insert path).
        const admin = createAdminClient();
        let referrerBusinessId: string | null = null;
        if (refSlug && /^[a-z0-9-]{1,80}$/i.test(refSlug)) {
          const { data: ref } = await admin
            .from("businesses")
            .select("id")
            .eq("slug", refSlug)
            .maybeSingle();
          if (ref && (ref.id as string) !== bizId) {
            referrerBusinessId = ref.id as string;
          }
        }

        const hdrs = await headers();
        await recordStorefrontView({
          businessId: bizId,
          sessionId: referral.session_id,
          referrerUrl: referral.referrer_url,
          utmSource: referral.utm_source,
          utmMedium: referral.utm_medium,
          utmCampaign: referral.utm_campaign,
          referrerBusinessId,
          userAgent: hdrs.get("user-agent"),
          ipHash: hashIp(extractClientIp(hdrs)),
        });
      } catch (err) {
        // Defense-in-depth — recordStorefrontView already swallows
        // its own errors, but anything that throws before that call
        // (cookie parsing, header read, ref slug lookup) lands here.
        console.error("[storefront view tracking] schedule failed:", err);
      }
    });
  }

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

  // Resolve the base theme, then ONLY override its displayFont / bodyFont
  // when the business has explicitly picked one. NULL falls through to
  // the theme's original font-stack string, so existing storefronts look
  // exactly the way they did before the picker shipped. The next/font
  // CSS variables are mounted by the parent storefront layout so any
  // `var(--font-X)` we substitute resolves throughout the template tree.
  const baseTheme = TEMPLATE_THEMES[biz.template_theme] ?? TEMPLATE_THEMES.aura;
  const theme = {
    ...baseTheme,
    displayFont: resolveFontFamily(biz.heading_font, baseTheme.displayFont),
    bodyFont: resolveFontFamily(biz.body_font, baseTheme.bodyFont),
  };

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

  // Pass the Torch — load referrals whenever the master toggle is on.
  // The booking widget (Phase 1E) consumes this list inline at the
  // zero-availability moment, so we need it on every render even on
  // healthy (non-vacation, non-?ref=) storefronts. trustedProsContext
  // still gates whether the FULL section renders on the page itself.
  const passTheTorchEnabled = biz.pass_the_torch_enabled ?? true;
  const trustedProsContext = resolveTrustedProsContext({
    business: {
      vacation_start: biz.vacation_start ?? null,
      vacation_end: biz.vacation_end ?? null,
      pass_the_torch_enabled: passTheTorchEnabled,
      pass_the_torch_visibility: biz.pass_the_torch_visibility ?? "smart",
    },
    refParam: typeof refParam === "string" ? refParam : null,
  });
  const trustedPros = passTheTorchEnabled
    ? await loadStorefrontTrustedPros(biz.id)
    : [];
  const vacationLive = isVacationActive({
    vacation_start: biz.vacation_start ?? null,
    vacation_end: biz.vacation_end ?? null,
  });

  // Phase 2.3 — public reputation stats. Two gates:
  //   1. The pro must have flipped public_stats_enabled in settings.
  //   2. getReputationStats returns null when sample size is below
  //      threshold (or when strike-paused — defense-in-depth even
  //      though the storefront 404s on pause already).
  // When opted in but null is returned, the card renders the
  // "Earning trust" empty state. When opted out, no card renders at
  // all.
  const publicStatsEnabled = biz.public_stats_enabled === true;
  const reputationStats = publicStatsEnabled
    ? await getReputationStats(biz.id)
    : null;

  // ?ref=<slug> → look up the referrer's display name once, server-side.
  // Used for the "Recommended by …" hero badge AND threaded into the
  // booking widget so it can stamp the disclosure into the booking
  // payload + confirmation email.
  let referrerName: string | null = null;
  let referrerSlugClean: string | null = null;
  if (typeof refParam === "string" && /^[a-z0-9-]{1,80}$/i.test(refParam)) {
    const { data: referrer } = await supabase
      .from("businesses")
      .select("business_name, slug, is_published")
      .eq("slug", refParam)
      .maybeSingle();
    if (referrer && referrer.is_published) {
      referrerName = referrer.business_name as string;
      referrerSlugClean = referrer.slug as string;
    }
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
    trustedPros,
    referrerSlug: biz.slug,
    showTrustedPros: trustedProsContext !== null && trustedPros.length > 0,
    // Stripe Identity (Phase 1.4) — drives the ✓ Verified badge that
    // sits next to the business name. Never a gate; templates simply
    // skip the badge when this is false.
    verified:
      (biz as { identity_verification_status?: string })
        .identity_verification_status === "verified",
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
    // The wrapper sets the body font as the inheritance default so any
    // template element, widget, or section that doesn't override
    // fontFamily picks up the pro's chosen body font. Templates still
    // use their own explicit displayFont on headings, which wins by
    // specificity. The body font CSS var is mounted by the storefront
    // layout one level up.
    <div style={{ fontFamily: theme.bodyFont }}>
      {isOwner && (
        <a
          href="/dashboard"
          aria-label="Back to Dashboard"
          className="fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded-full bg-[#0A0A0A] px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_4px_16px_rgba(10,10,10,0.25)] backdrop-blur-sm transition-transform hover:-translate-y-px hover:bg-[#262626] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:left-auto sm:right-4 sm:translate-x-0"
        >
          ← Back to Dashboard
        </a>
      )}
      {referrerName && (
        <RefBadge
          referrerName={referrerName}
          theme={{
            accent: theme.accent,
            ink: theme.ink,
            surface: theme.surface,
            border: theme.border,
            bodyFont: theme.bodyFont,
          }}
        />
      )}
      {vacationLive && biz.vacation_start && biz.vacation_end && (
        <VacationBanner
          businessName={biz.business_name}
          vacationStart={biz.vacation_start}
          vacationEnd={biz.vacation_end}
          message={biz.vacation_message ?? null}
          hasTrustedPros={trustedPros.length > 0}
          theme={{
            accent: theme.accent,
            ink: theme.ink,
            surface: theme.surface,
            border: theme.border,
            bodyFont: theme.bodyFont,
          }}
        />
      )}
      <Template {...templateProps} />

      {/* Phase 2.3 — public reputation stats card. Renders only when
          the pro has opted in via dashboard/settings. The card itself
          handles the below-threshold "Earning trust" empty state when
          getReputationStats returned null. Theme is passed through so
          the card visually inherits the storefront's accent / fonts /
          surface treatment. */}
      {publicStatsEnabled && (
        <ReputationCard
          stats={reputationStats}
          theme={{
            accent: theme.accent,
            ink: theme.ink,
            muted: theme.muted,
            surface: theme.surface,
            border: theme.border,
            bodyFont: theme.bodyFont,
            displayFont: theme.displayFont,
            radius: theme.radius,
          }}
        />
      )}

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
        ink={theme.ink}
        surface={theme.surface}
        border={theme.border}
        bodyFont={theme.bodyFont}
        displayFont={theme.displayFont}
        radius={theme.radius}
        muted={theme.muted}
        bg={theme.bg}
        clientPolicies={biz.client_policies ?? ""}
        cancellationPolicy={biz.cancellation_policy ?? ""}
        slotsOpenThisWeek={slotsOpenThisWeek}
        slug={slug}
        phoneVerificationEnabled={!!process.env.TWILIO_VERIFY_SERVICE_SID}
        clientPaymentsEnabled={clientPaymentsEnabled()}
        proConnectReady={connectReady({
          stripe_connect_account_id: biz.stripe_connect_account_id,
          stripe_connect_charges_enabled: biz.stripe_connect_charges_enabled,
          stripe_connect_onboarding_complete:
            biz.stripe_connect_onboarding_complete,
        })}
        rules={{
          intervalMinutes: biz.booking_interval_minutes ?? 30,
          allowLastMinute: biz.allow_last_minute_booking ?? true,
          lastMinuteCutoffHours: biz.last_minute_cutoff_hours ?? 2,
          dailyBreakBlocks: biz.daily_break_blocks ?? [],
        }}
        trustedPros={trustedPros}
        referrerSlugFromUrl={referrerSlugClean}
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
    </div>
  );
}
