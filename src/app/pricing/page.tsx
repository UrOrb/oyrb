import Link from "next/link";
import { Check } from "lucide-react";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

export const metadata = {
  title: "Pricing",
};

const TIERS = [
  {
    name: "Starter",
    price: "$24",
    description: "For solo pros just getting started.",
    features: [
      "1 staff calendar",
      "1 template",
      "Online booking page",
      "Stripe payments",
      "Email confirmations",
      "Email booking reminders",
      "Basic analytics",
    ],
    highlight: false,
  },
  {
    name: "Studio",
    price: "$49",
    description: "For established pros and small teams.",
    badge: "No-Show Protection",
    features: [
      "Everything in Starter",
      "✦ SMS booking reminders (24h before)",
      "✦ Waitlist management",
      "✦ Last-minute slot SMS alerts",
      "✦ Deposit collection",
      "Up to 3 staff calendars",
      "All designer templates",
      "Intake forms",
      "Google Calendar sync",
      "Marketing email campaigns",
      "Priority email support",
    ],
    highlight: true,
  },
  {
    name: "Scale",
    price: "$89",
    description: "For multi-stylist shops and suite operators.",
    features: [
      "Everything in Studio",
      "✦ Unlimited SMS reminders",
      "Unlimited staff calendars",
      "Custom domain",
      "White-label emails",
      "Priority phone support",
      "Early access to new features",
    ],
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col">
      <Nav />

      <main className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-36 md:pb-40 md:pt-48">
        <div className="text-center">
          <p className="text-sm font-medium text-[#B8896B]">Pricing</p>
          <h1 className="font-display mt-3 text-4xl font-medium tracking-[-0.02em] md:text-6xl">
            Simple, transparent pricing.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[#525252]">
            We never take a cut of your bookings or tips. Pay one flat monthly
            rate and keep 100% of what your clients pay you.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-[#A3A3A3]">
            The price you see is exactly what you&apos;re billed each month. No surcharges, no per-booking fees — just applicable sales tax in states where required.
          </p>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-lg border p-8 ${
                tier.highlight ? "border-[#B8896B] bg-white" : "border-[#E7E5E4]"
              }`}
            >
              {tier.highlight && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#B8896B]/10 px-3 py-1 text-xs font-medium text-[#B8896B]">
                    Most popular
                  </span>
                  {"badge" in tier && tier.badge && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                      ✦ {tier.badge}
                    </span>
                  )}
                </div>
              )}
              <p className="font-medium">{tier.name}</p>
              <p className="font-display mt-2 text-5xl font-medium">
                {tier.price}
                <span className="text-lg font-normal text-[#737373]">/mo</span>
              </p>
              <p className="mt-2 text-sm text-[#737373]">{tier.description}</p>

              <ul className="mt-8 flex flex-col gap-3 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#525252]">
                    <Check size={14} className="mt-0.5 shrink-0 text-[#B8896B]" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`mt-8 block rounded-md py-3 text-center text-sm font-medium transition-opacity hover:opacity-80 ${
                  tier.highlight
                    ? "bg-[#0A0A0A] text-white"
                    : "border border-[#E7E5E4] text-[#0A0A0A] hover:bg-[#F5F5F4]"
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-lg border border-[#E7E5E4] p-8">
          <h2 className="font-display text-2xl font-medium">
            Frequently asked questions
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              {
                q: "Can I change or cancel my plan later?",
                a: "Yes, upgrade, downgrade, or cancel anytime from your dashboard. Cancellation takes effect at the end of your current billing cycle — no partial refunds, but you keep full access through the period you already paid for.",
              },
              {
                q: "Does OYRB take a cut of my bookings or tips?",
                a: "No. You pay a flat monthly fee, that's it. We don't touch client payments — they flow directly to your Stripe account. No per-booking fees, no tip cuts, no marketplace commission.",
              },
              {
                q: "Are there any extra fees or surcharges?",
                a: "No. The price you see on this page is exactly what you pay — no per-booking fees, no surcharges, no cut of your client bookings or tips. Any applicable sales tax is shown transparently at checkout.",
              },
              {
                q: "What payment methods do clients use?",
                a: "All major credit and debit cards via Stripe. Apple Pay and Google Pay are supported on compatible devices.",
              },
              {
                q: "Is there a free trial?",
                a: "We offer a 14-day free trial on all plans. Card required at signup, but no charge until day 15 — cancel anytime before then and you pay nothing.",
              },
              {
                q: "Do you charge sales tax?",
                a: "Sales tax may apply depending on your state — displayed transparently at checkout before you subscribe.",
              },
            ].map((item) => (
              <div key={item.q}>
                <p className="font-medium">{item.q}</p>
                <p className="mt-1 text-sm text-[#737373]">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
