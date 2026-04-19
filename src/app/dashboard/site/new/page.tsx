import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AddSiteCheckoutButton } from "./add-site-checkout-button";

export const metadata = { title: "Add a new site" };

const PLANS = [
  {
    tier: "starter" as const,
    name: "Starter",
    price: "$24",
    features: [
      "1 staff calendar",
      "Stripe payments",
      "Email confirmations",
      "Email booking reminders",
    ],
    highlight: false,
  },
  {
    tier: "studio" as const,
    name: "Studio",
    price: "$49",
    features: [
      "Up to 3 staff",
      "All templates + themes",
      "Deposits + intake forms",
      "SMS reminders (24h before)",
      "Waitlist + last-min slot alerts",
      "Everything in Starter",
    ],
    highlight: true,
  },
  {
    tier: "scale" as const,
    name: "Scale",
    price: "$89",
    features: [
      "Unlimited staff",
      "Custom domain",
      "Unlimited SMS reminders",
      "Priority support",
      "Everything in Studio",
    ],
    highlight: false,
  },
];

export default async function AddNewSitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-[#737373] hover:text-[#0A0A0A]">
        ← Back to dashboard
      </Link>

      <h1 className="font-display mt-4 text-2xl font-medium tracking-tight">Add a new site</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Each site has its own plan and is fully separate from your other sites — its own
        template, theme, content, calendar, and clients. Pick the plan you want for this
        new site.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.tier}
            className={`rounded-lg border p-5 ${p.highlight ? "border-[#B8896B] bg-white" : "border-[#E7E5E4] bg-white"}`}
          >
            {p.highlight && (
              <span className="mb-3 inline-block rounded-full bg-[#B8896B]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#B8896B]">
                Most popular
              </span>
            )}
            <p className="text-sm font-semibold text-[#525252]">{p.name}</p>
            <p className="font-display mt-1 text-3xl font-medium">
              {p.price}
              <span className="text-sm font-normal text-[#737373]">/mo</span>
            </p>
            <ul className="mt-4 flex flex-col gap-1.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-[#525252]">
                  <Check size={12} className="mt-0.5 shrink-0 text-[#B8896B]" />
                  {f}
                </li>
              ))}
            </ul>
            <AddSiteCheckoutButton
              tier={p.tier}
              className={`mt-5 w-full rounded-md py-2 text-center text-xs font-medium transition-opacity hover:opacity-85 disabled:opacity-50 ${
                p.highlight
                  ? "bg-[#0A0A0A] text-white"
                  : "border border-[#E7E5E4] text-[#0A0A0A] hover:bg-[#F5F5F4]"
              }`}
            >
              Add a {p.name} site
            </AddSiteCheckoutButton>
          </div>
        ))}
      </div>

      <p className="mt-6 text-[11px] text-[#A3A3A3]">
        14-day free trial · cancel any individual site any time without affecting your
        others.
      </p>
    </div>
  );
}
