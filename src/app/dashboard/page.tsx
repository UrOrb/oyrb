import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckoutButton } from "@/components/marketing/checkout-button";
import { Check, ExternalLink, Plus, Pencil } from "lucide-react";
import { CheckoutPoller } from "./checkout-poller";
import { ApplyPendingTemplate } from "./apply-pending-template";
import { getAccountSummary } from "@/lib/account";
import { TIERS, fmtMoney, type BillingCycle } from "@/lib/plans";
import { getGoalSnapshot } from "@/lib/goal-tracking";
import { getMyListing } from "@/lib/directory";
import { DirectoryNudge } from "./directory-nudge";
import { StatsMigrationNotice } from "./stats-migration-notice";
import { ConnectStatusBanner } from "./connect-status-banner";
import { deriveStatus } from "@/lib/stripe-connect";
import { getCurrentBusiness } from "@/lib/current-site";
import { Clock } from "lucide-react";
import { getThisWeekData, getWeekRange } from "@/lib/business-brain";
import { pickGreeting } from "@/lib/greetings";
import { BentoGrid } from "./_components/bento-grid";
import { HeroTile } from "./_components/hero-tile";
import { MoneyTile } from "./_components/tiles/money-tile";
import { ClientsTile } from "./_components/tiles/clients-tile";
import { BookingsTile, type UpcomingBooking } from "./_components/tiles/bookings-tile";
import { MarketingTile, type LastCampaign } from "./_components/tiles/marketing-tile";
import { ServicesTile, type ServiceTileItem } from "./_components/tiles/services-tile";
import { WaitlistTile } from "./_components/tiles/waitlist-tile";
import { TrustedProsTile } from "./_components/tiles/trusted-pros-tile";
import { GoalTile } from "./_components/tiles/goal-tile";

// Phase 9 PR 3 — Bento layout depends on fresh per-request data
// (greeting bucket is tz-aware; "today" rolls over at local midnight).
// getThisWeekData is internally cached via unstable_cache (1h TTL),
// so the heavy lift is still cached even though the page itself is
// dynamic.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; cycle?: string; tier?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // List every site this user has purchased. Each appears as its own card.
  // The active-site cookie + /api/dashboard/active-site keep editor pages
  // pointed at the right one when the user navigates between them.
  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });
  const business = businesses?.[0];

  const params = await searchParams;
  const checkoutSuccess = params?.checkout === "success";
  // Cycle preference forwarded from /pricing → /signup → /dashboard. Defaults
  // to monthly when missing so direct visits to /dashboard behave as before.
  const preferredCycle: BillingCycle = params?.cycle === "annual" ? "annual" : "monthly";

  // Post-checkout but webhook hasn't fired yet — show polling spinner
  if (checkoutSuccess && (!business || business.subscription_status !== "active")) {
    return <CheckoutPoller />;
  }

  // No active subscription and no checkout in flight — show pricing upsell
  if (!business || business.subscription_status !== "active") {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Choose a plan to get started.
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Select a plan below and start building your booking site.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              tier: "starter" as const,
              name: "Starter",
              price: "$29",
              features: ["1 staff calendar", "1 template", "Stripe payments", "Email confirmations", "Email booking reminders"],
              highlight: false,
            },
            {
              tier: "studio" as const,
              name: "Studio",
              price: "$69",
              features: ["Up to 3 staff", "All templates", "Deposits", "Intake forms", "SMS reminders (24h before)", "Waitlist + last-min slot alerts", "Everything in Starter"],
              highlight: true,
            },
            {
              tier: "scale" as const,
              name: "Scale",
              price: "$129",
              features: ["Unlimited staff", "Custom domain", "Direct founder support", "Unlimited SMS reminders", "Priority support", "Everything in Studio"],
              highlight: false,
            },
          ].map((t) => (
            <div
              key={t.tier}
              className={`rounded-lg border p-6 ${t.highlight ? "border-[#B8896B] bg-white" : "border-[#E7E5E4]"}`}
            >
              {t.highlight && (
                <span className="mb-4 inline-block rounded-full bg-[#B8896B]/10 px-3 py-1 text-xs font-medium text-[#B8896B]">
                  Most popular
                </span>
              )}
              <p className="text-sm font-medium text-[#525252]">{t.name}</p>
              <p className="font-display mt-1 text-4xl font-medium">
                {t.price}<span className="text-base font-normal text-[#737373]">/mo</span>
              </p>
              <ul className="mt-6 flex flex-col gap-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#525252]">
                    <Check size={14} className="shrink-0 text-[#B8896B]" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-2">
                <CheckoutButton
                  tier={t.tier}
                  cycle={preferredCycle}
                  mode="trial"
                  className={`w-full rounded-md py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${t.highlight ? "bg-[#0A0A0A] text-white" : "border border-[#E7E5E4] text-[#0A0A0A] hover:bg-[#F5F5F4]"}`}
                >
                  Start 14-day free trial
                </CheckoutButton>
                <CheckoutButton
                  tier={t.tier}
                  cycle={preferredCycle}
                  mode="skip"
                  className="w-full rounded-md py-1.5 text-center text-xs font-medium text-[#B8896B] hover:underline disabled:opacity-50"
                >
                  Skip trial — start now{t.tier !== "starter" ? " (unlock add-on sites)" : ""}
                </CheckoutButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Branch C: active subscription — bento dashboard ────────────────
  //
  // Every tile's data is fetched in parallel. getThisWeekData is the
  // heavy one (cached 1h via unstable_cache); the rest are small
  // indexed COUNT / SELECT queries. Service-role admin client is
  // used for the cross-cutting counts (pendingTrustedPros, accepted
  // pros) so RLS doesn't recurse through ownership joins for what's
  // ultimately a dashboard-owned read.
  const admin = createAdminClient();
  const timezone = business.timezone || "America/New_York";
  const siteUrl = `/s/${business.slug}`;
  const { weekStart } = getWeekRange(timezone);
  const todayIso = new Date().toISOString();

  const [
    thisWeekData,
    totalClientsRes,
    newThisWeekRes,
    upcomingRes,
    lastCampaignRes,
    servicesRes,
    waitlistRes,
    pendingTrustedRes,
    acceptedTrustedRes,
    goalSnapshot,
    myListing,
  ] = await Promise.all([
    getThisWeekData(business.id, timezone),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("created_at", weekStart.toISOString()),
    supabase
      .from("bookings")
      .select("id, start_at, services(name), clients(name)")
      .eq("business_id", business.id)
      .gte("start_at", todayIso)
      .neq("status", "cancelled")
      .order("start_at", { ascending: true })
      // 30, not 10: today's bookings get filtered out below before the
      // Coming-up tile takes its 2. A pro with 10+ bookings left today
      // would otherwise exhaust the whole fetch and see "Quiet days
      // ahead" while tomorrow is fully booked.
      .limit(30),
    supabase
      .from("email_campaigns")
      .select("name, sent_at, recipient_count")
      .eq("business_id", business.id)
      .order("sent_at", { ascending: false })
      .limit(1),
    supabase
      .from("services")
      .select("id, name, price_cents")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      // Tile says "N people waiting" — notified/booked history rows would
      // permanently inflate it and disagree with the Waitlist page.
      .eq("status", "waiting"),
    admin
      .from("pro_referrals")
      .select("id", { count: "exact", head: true })
      .eq("receiving_business_id", business.id)
      .eq("status", "pending"),
    admin
      .from("pro_referrals")
      .select("id", { count: "exact", head: true })
      .eq("requesting_business_id", business.id)
      .eq("status", "accepted"),
    getGoalSnapshot(user.id),
    getMyListing(user.id),
  ]);

  // getThisWeekData is wrapped in unstable_cache, which JSON-
  // serializes the result for storage. On a cache hit, the Date
  // fields (today, weekStart, weekEnd, and every Date inside
  // todayServices) come back as ISO strings — the TypeScript type
  // says Date, but the runtime value isn't. Re-hydrate at the
  // consumer boundary so downstream code can rely on real Date
  // instances regardless of whether this was a fresh compute or a
  // cache hit. new Date(value) handles both Date and string inputs
  // (and ignores the prototype check), so this is safe either way.
  const todayDate = new Date(thisWeekData.today);
  const todayServices = thisWeekData.todayServices.map((s) => ({
    ...s,
    startAt: new Date(s.startAt),
    endAt: new Date(s.endAt),
    serviceStartedAt: s.serviceStartedAt ? new Date(s.serviceStartedAt) : null,
    serviceEndedAt: s.serviceEndedAt ? new Date(s.serviceEndedAt) : null,
  }));

  // Bookings tile wants the next 2 AFTER today. The Hero tile already
  // surfaces today's services; filter them out of the upcoming list
  // by comparing against the today-window boundary that
  // getThisWeekData computed.
  const todayEnd = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);
  type UpcomingRow = {
    id: string;
    start_at: string;
    services: { name: string | null } | null;
    clients: { name: string | null } | null;
  };
  const upcomingRows = ((upcomingRes.data ?? []) as unknown) as UpcomingRow[];
  const upcomingAfterToday: UpcomingBooking[] = upcomingRows
    .filter((b) => new Date(b.start_at).getTime() >= todayEnd.getTime())
    .slice(0, 2)
    .map((b) => ({
      id: b.id,
      startAt: new Date(b.start_at),
      clientName: b.clients?.name ?? "",
      serviceName: b.services?.name ?? "(deleted service)",
    }));

  const lastCampaignRow = lastCampaignRes.data?.[0];
  const lastCampaign: LastCampaign | null = lastCampaignRow
    ? {
        name: (lastCampaignRow as { name: string }).name,
        sentAt: lastCampaignRow.sent_at
          ? new Date(lastCampaignRow.sent_at as string)
          : null,
        recipientCount:
          (lastCampaignRow as { recipient_count: number }).recipient_count ?? 0,
      }
    : null;

  const services: ServiceTileItem[] = (servicesRes.data ?? []).map((s) => ({
    id: (s as { id: string }).id,
    name: (s as { name: string }).name,
    priceCents: (s as { price_cents: number }).price_cents,
  }));

  const totalClients = totalClientsRes.count ?? 0;
  const newThisWeek = newThisWeekRes.count ?? 0;
  const waitlistCount = waitlistRes.count ?? 0;
  const pendingTrusted = pendingTrustedRes.count ?? 0;
  const acceptedTrusted = acceptedTrustedRes.count ?? 0;

  const alreadyListed = !!(myListing?.is_listed && myListing.agreement_accepted_at);

  // Stats-migration banner: shown once to pros who had free-text
  // stat_*_value entries in template_content before migration 025 AND
  // haven't acknowledged the change yet.
  const tc = (business.template_content ?? {}) as Record<string, string>;
  const hasLegacyStatValues = !!(tc["stat_1_value"] || tc["stat_2_value"] || tc["stat_3_value"]);
  const statsMigrationAck =
    (business as unknown as { stats_migration_acknowledged_at?: string | null })
      .stats_migration_acknowledged_at ?? null;
  const showStatsNotice = hasLegacyStatValues && !statsMigrationAck;

  // Greeting — deterministic per (user, date-in-tz). See lib/greetings.ts.
  const greeting = pickGreeting({
    userId: user.id,
    timeZone: timezone,
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    businessName: business.business_name,
  });

  return (
    <div>
      <ApplyPendingTemplate />

      {/* ── Page-local banners (all conditional renders, null in
          common case). Stay above the bento because they're
          status communication, not insight tiles. */}
      <TrialBanner />
      <ConnectStatusBannerForActiveSite />
      {showStatsNotice && <StatsMigrationNotice businessId={business.id} />}

      {/* Site status banner — published vs not. Lives between
          status banners and the greeting; orients the pro to
          the most-important state of their site. */}
      <div className={`mt-2 flex flex-col gap-3 rounded-xl border p-4 shadow-[0_12px_32px_rgba(10,10,10,0.035)] md:flex-row md:items-center md:justify-between ${business.is_published ? "border-[#E7D8CF] bg-[#FFFCF8]" : "border-[#E7C9A8] bg-[#FBF4EC]"}`}>
        <div>
          <p className="text-sm font-semibold">
            {business.is_published ? "Your site is live ✦" : "Publish your site to start taking bookings"}
          </p>
          <p className="mt-0.5 text-xs text-[#737373]">
            {business.is_published ? `oyrb.space${siteUrl}` : "Head to Site to fill in your details and hit Publish."}
          </p>
        </div>
        <div className="flex gap-2">
          {business.is_published && (
            <a href={siteUrl} target="_blank" className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-xs font-medium hover:bg-[#F5F5F4]">
              View site →
            </a>
          )}
          <a href="/dashboard/site" className="rounded-md bg-[#0A0A0A] px-3 py-2 text-xs font-medium text-white hover:opacity-80">
            Edit site
          </a>
        </div>
      </div>

      {/* Dismissible directory nudge — published + not in /find only. */}
      <DirectoryNudge
        sitePublished={business.is_published}
        alreadyListed={alreadyListed}
      />

      {/* ── Greeting + bento ──────────────────────────────────── */}
      <div className="mt-8">
        <BentoGrid>
          <HeroTile
            greeting={greeting}
            todayServices={todayServices}
            isPublished={business.is_published}
            siteUrl={siteUrl}
            timeZone={timezone}
          />
          <MoneyTile
            grossThisWeekCents={thisWeekData.trend.grossThisWeekCents}
            grossLastWeekCents={thisWeekData.trend.grossLastWeekCents}
          />
          <ClientsTile totalClients={totalClients} newThisWeek={newThisWeek} />
          <BookingsTile upcoming={upcomingAfterToday} timeZone={timezone} />
          <MarketingTile lastCampaign={lastCampaign} />
          <GoalTile snapshot={goalSnapshot} />
          <ServicesTile services={services} />
          <WaitlistTile count={waitlistCount} />
          <TrustedProsTile
            acceptedCount={acceptedTrusted}
            pendingCount={pendingTrusted}
          />
        </BentoGrid>
      </div>

      {/* ── Your sites ──
          Lives below the bento as its own labeled section. Each card
          embeds a live iframe of /s/<slug> as a real-render thumbnail
          (lazy-loaded; pointer-events disabled so the parent anchor
          catches taps). Kept outside the bento because multi-site
          iframe thumbnails don't compress into a tile cleanly. */}
      <div className="mt-12">
        <h2 className="text-sm font-semibold text-[#525252]">Your sites</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(businesses ?? []).map((b) => (
            <SiteCard key={b.id} business={b} />
          ))}
        </div>

        <div className="mt-4">
          <Link
            href="/dashboard/site/new"
            className="flex items-center gap-3 rounded-lg border border-dashed border-[#E7E5E4] bg-white px-5 py-4 transition-colors hover:border-[#B8896B] hover:bg-[#FAFAF9]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E7E5E4] bg-[#FAFAF9] text-[#525252]">
              <Plus size={18} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Add New Site</p>
              <p className="mt-0.5 text-xs text-[#737373]">
                Spin up another booking site — same dashboard, separate brand.
              </p>
            </div>
            <span className="text-xs text-[#A3A3A3]">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Trial banner ────────────────────────────────────────────────────────────
// Connect banner that follows the SiteSwitcher selection. The dashboard
// page itself uses businesses[0] for legacy reasons (subscription gate +
// stats notice), but the Connect banner needs to match whichever site
// the pro is currently editing — multi-site pros otherwise see the
// banner stuck on their oldest site's status.
async function ConnectStatusBannerForActiveSite() {
  const active = await getCurrentBusiness();
  if (!active) return null;
  const status = deriveStatus({
    stripe_connect_account_id: active.stripe_connect_account_id,
    stripe_connect_details_submitted: active.stripe_connect_details_submitted,
    stripe_connect_charges_enabled: active.stripe_connect_charges_enabled,
    stripe_connect_requirements_currently_due:
      active.stripe_connect_requirements_currently_due,
  }).status;
  return <ConnectStatusBanner status={status} />;
}

// Shown only when the user's subscription is in `trialing` status. Displays
// the conversion date + amount so there are no surprises on day 15.
async function TrialBanner() {
  const summary = await getAccountSummary();
  if (!summary?.subscription) return null;
  const sub = summary.subscription;
  if (sub.status !== "trialing") return null;

  const tier = TIERS[sub.tier];
  const amountCents = sub.billing_cycle === "monthly" ? tier.monthlyPriceCents : tier.annualPriceCents;
  const date = sub.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "the end of your trial";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <Clock size={16} className="mt-0.5 shrink-0 text-amber-700" />
        <div>
          <p className="font-semibold">
            You&rsquo;re on a 14-day free trial of {tier.name} ({sub.billing_cycle === "monthly" ? "Monthly" : "Annual"}).
          </p>
          <p className="mt-0.5 text-xs">
            Your card will be charged <span className="font-semibold">{fmtMoney(amountCents)}</span> on{" "}
            <span className="font-semibold">{date}</span>. Cancel anytime before then with one click.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/settings/general"
        className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
      >
        Manage trial
      </Link>
    </div>
  );
}

// ── View-Site card ──────────────────────────────────────────────────────────
// Renders a real iframe of the live public site as a thumbnail. The iframe is
// pointer-events:none so the surrounding anchor catches clicks; loading="lazy"
// keeps multiple cards from racing to render full-page templates at once.
function SiteCard({ business }: { business: { id: string; business_name: string; slug: string; is_published: boolean } }) {
  const siteUrl = `/s/${business.slug}`;
  const editUrl = `/dashboard/site?siteId=${encodeURIComponent(business.id)}`;
  return (
    <div className="overflow-hidden rounded-lg border border-[#E7E5E4] bg-white transition-colors hover:border-[#B8896B]">
      <a href={siteUrl} target="_blank" rel="noreferrer" className="group block" aria-label={`View ${business.business_name} live`}>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FAFAF9]">
          <iframe
            src={siteUrl}
            title={`${business.business_name} preview`}
            loading="lazy"
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: "400%",
              height: "400%",
              border: 0,
              transform: "scale(0.25)",
              pointerEvents: "none",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 text-white">
            <span className="text-[10px] font-mono opacity-80">oyrb.space{siteUrl}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
              View site <ExternalLink size={11} />
            </span>
          </div>
          {!business.is_published && (
            <span className="absolute left-2 top-2 rounded bg-amber-500/95 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Draft
            </span>
          )}
        </div>
      </a>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{business.business_name}</p>
          <p className="truncate text-[11px] text-[#737373]">View Site</p>
        </div>
        <Link
          href={editUrl}
          className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] px-2.5 py-1 text-[11px] font-medium hover:bg-[#F5F5F4]"
        >
          <Pencil size={11} /> Edit
        </Link>
      </div>
    </div>
  );
}
