import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckoutButton } from "@/components/marketing/checkout-button";
import { Check } from "lucide-react";
import { CheckoutPoller } from "./checkout-poller";
import { ApplyPendingTemplate } from "./apply-pending-template";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  const params = await searchParams;
  const checkoutSuccess = params?.checkout === "success";

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
              price: "$24",
              features: ["1 staff calendar", "1 template", "Stripe payments", "Email confirmations", "Email booking reminders"],
              highlight: false,
            },
            {
              tier: "studio" as const,
              name: "Studio",
              price: "$49",
              features: ["Up to 3 staff", "All templates", "Deposits", "Intake forms", "SMS reminders (24h before)", "Waitlist + last-min slot alerts", "Everything in Starter"],
              highlight: true,
            },
            {
              tier: "scale" as const,
              name: "Scale",
              price: "$89",
              features: ["Unlimited staff", "Custom domain", "Multi-location", "Unlimited SMS reminders", "Priority support", "Everything in Studio"],
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
              <CheckoutButton
                tier={t.tier}
                className={`mt-6 w-full rounded-md py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${t.highlight ? "bg-[#0A0A0A] text-white" : "border border-[#E7E5E4] text-[#0A0A0A] hover:bg-[#F5F5F4]"}`}
              >
                Get started
              </CheckoutButton>
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

  return (
    <div>
      <ApplyPendingTemplate />
      <h1 className="font-display text-2xl font-medium tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Welcome back, {user.user_metadata?.full_name ?? user.email}.
      </p>

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

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        <a href="/dashboard/services" className="rounded-lg border border-[#E7E5E4] bg-white p-5 hover:border-[#B8896B]">
          <p className="text-sm font-semibold">Manage services</p>
          <p className="mt-1 text-xs text-[#737373]">What you offer, pricing, and duration.</p>
        </a>
        <a href="/dashboard/bookings" className="rounded-lg border border-[#E7E5E4] bg-white p-5 hover:border-[#B8896B]">
          <p className="text-sm font-semibold">View bookings</p>
          <p className="mt-1 text-xs text-[#737373]">All upcoming and past appointments.</p>
        </a>
      </div>
    </div>
  );
}
