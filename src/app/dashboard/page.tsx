import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckoutButton } from "@/components/marketing/checkout-button";
import { Check, ExternalLink, Plus, Pencil, Clock } from "lucide-react";
import { CheckoutPoller } from "./checkout-poller";
import { ApplyPendingTemplate } from "./apply-pending-template";
import { getAccountSummary } from "@/lib/account";
import { TIERS, fmtMoney, type BillingCycle } from "@/lib/plans";
import { getGoalSnapshot } from "@/lib/goal-tracking";
import { GoalMeter } from "./goal-meter";
import { getMyListing } from "@/lib/directory";
import { DirectoryNudge } from "./directory-nudge";
import { StatsMigrationNotice } from "./stats-migration-notice";

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

  // Load stats
  const [{ count: bookingCount }, { count: clientCount }, { data: revenueRows }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("start_at", new Date().toISOString())
      .neq("status", "cancelled"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id),
    supabase
      .from("bookings")
      .select("services(price_cents), start_at, status")
      .eq("business_id", business.id)
      .eq("status", "completed")
      .gte("start_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);

  const monthRevenue = (revenueRows ?? []).reduce((sum: number, b: any) => sum + (b.services?.price_cents ?? 0), 0);
  const siteUrl = `/s/${business.slug}`;

  // Monthly income goal snapshot — computed on the server so the first
  // paint has the real progress bar width, no flash of empty state.
  const goalSnapshot = await getGoalSnapshot(user.id);

  // Is this pro already in the public directory? Used to decide whether to
  // surface the "Want to be found by new clients?" nudge below.
  const myListing = await getMyListing(user.id);
  const alreadyListed = !!(myListing?.is_listed && myListing.agreement_accepted_at);

  // Stats-migration banner: shown once to pros who had free-text
  // stat_*_value entries in template_content before migration 025 AND
  // haven't acknowledged the change yet. acknowledged column is
  // stamped when they click Review or Dismiss.
  const tc = (business.template_content ?? {}) as Record<string, string>;
  const hasLegacyStatValues = !!(tc["stat_1_value"] || tc["stat_2_value"] || tc["stat_3_value"]);
  const statsMigrationAck =
    (business as unknown as { stats_migration_acknowledged_at?: string | null })
      .stats_migration_acknowledged_at ?? null;
  const showStatsNotice = hasLegacyStatValues && !statsMigrationAck;

  return (
    <div>
      <ApplyPendingTemplate />
      <h1 className="font-display text-2xl font-medium tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Welcome back, {user.user_metadata?.full_name ?? user.email}.
      </p>

      <TrialBanner />

      {showStatsNotice && <StatsMigrationNotice businessId={business.id} />}

      {/* Site status banner */}
      <div className={`mt-6 flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between ${business.is_published ? "border-[#E7E5E4] bg-[#FAFAF9]" : "border-amber-200 bg-amber-50"}`}>
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

      {/* Dismissible nudge: shown only after site is published and only if
          the pro hasn't already opted into the directory. */}
      <DirectoryNudge
        sitePublished={business.is_published}
        alreadyListed={alreadyListed}
      />

      {/* ── Your sites ──
          One card per business the user owns. Each card embeds a live iframe
          of /s/<slug> as a real-render thumbnail (lazy-loaded, click-through
          disabled so the parent anchor catches the tap). */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#525252]">Your sites</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(businesses ?? []).map((b) => (
            <SiteCard key={b.id} business={b} />
          ))}
        </div>

        {/* Add-new-site row — its own row below the thumbnails, no matter how
            many sites exist. */}
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

      {/* Monthly income goal meter. Rendered below the site cards so it
          sits near the user's active workspace. Hidden entirely when the
          user has toggled show_on_dashboard off (the component returns null). */}
      <div className="mt-6">
        <GoalMeter snapshot={goalSnapshot} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { label: "Upcoming bookings", value: String(bookingCount ?? 0) },
          { label: "This month revenue", value: `$${(monthRevenue / 100).toFixed(0)}` },
          { label: "Total clients", value: String(clientCount ?? 0) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-[#E7E5E4] p-6">
            <p className="text-sm text-[#737373]">{stat.label}</p>
            <p className="font-display mt-1 text-3xl font-medium">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <a href="/dashboard/services" className="rounded-lg border border-[#E7E5E4] bg-white p-5 hover:border-[#B8896B]">
          <p className="text-sm font-semibold">Manage services</p>
          <p className="mt-1 text-xs text-[#737373]">What you offer, pricing, and duration.</p>
        </a>
        <a href="/dashboard/bookings" className="rounded-lg border border-[#E7E5E4] bg-white p-5 hover:border-[#B8896B]">
          <p className="text-sm font-semibold">View bookings</p>
          <p className="mt-1 text-xs text-[#737373]">All upcoming and past appointments.</p>
        </a>
        <a href="/dashboard/reviews" className="rounded-lg border border-[#E7E5E4] bg-white p-5 hover:border-[#B8896B]">
          <p className="text-sm font-semibold">Reviews</p>
          <p className="mt-1 text-xs text-[#737373]">Star rating updates as new reviews come in — you can&rsquo;t edit it.</p>
        </a>
      </div>
    </div>
  );
}

// ── Trial banner ────────────────────────────────────────────────────────────
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
        href="/dashboard/settings"
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
          {/*
            Iframe thumbnail: render 4× the container width/height (so the
            iframe boots a desktop-sized viewport that loads the real site
            layout), then scale down to 25% to fit the card exactly. This
            approach is resolution-independent — the iframe fills cleanly
            at 300px (mobile) AND 600px+ (desktop) without stretching or
            empty bars. Previously a fixed 1200×900 / scale(0.3) combo
            gave a 360×270 footprint that was too small on desktop cards.
          */}
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
