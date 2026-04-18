import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckoutButton } from "@/components/marketing/checkout-button";
import { Check } from "lucide-react";

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

  // No active subscription yet — show pricing upsell
  if (!business || business.subscription_status !== "active") {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight">
          {checkoutSuccess ? "Payment received — setting things up…" : "Choose a plan to get started."}
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          {checkoutSuccess
            ? "Your subscription is being activated. This usually takes a few seconds."
            : "Select a plan below and start building your booking site."}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              tier: "starter" as const,
              name: "Starter",
              price: "$24",
              features: ["1 staff calendar", "1 template", "Stripe payments", "Email confirmations"],
              highlight: false,
            },
            {
              tier: "studio" as const,
              name: "Studio",
              price: "$49",
              features: ["Up to 3 staff", "All templates", "Deposits", "Intake forms", "SMS reminders"],
              highlight: true,
            },
            {
              tier: "scale" as const,
              name: "Scale",
              price: "$89",
              features: ["Unlimited staff", "Custom domain", "Multi-location", "Priority support"],
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

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Welcome back, {user.user_metadata?.full_name ?? user.email}.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { label: "Upcoming bookings", value: "0" },
          { label: "This month revenue", value: "$0" },
          { label: "Total clients", value: "0" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-[#E7E5E4] p-6">
            <p className="text-sm text-[#737373]">{stat.label}</p>
            <p className="font-display mt-1 text-3xl font-medium">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-[#E7E5E4] p-8 text-center">
        <p className="font-display text-xl font-medium">Your bookings will appear here.</p>
        <p className="mt-2 text-sm text-[#737373]">
          Set up your site and services to start accepting bookings.
        </p>
      </div>
    </div>
  );
}
