import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { PricingCards } from "./pricing-cards";

export const metadata = {
  title: "Pricing",
};

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
            We never take a cut of your bookings or tips. Pay one flat fee and
            keep 100% of what your clients pay you.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-[#A3A3A3]">
            The price you see is exactly what you&apos;re billed each cycle. No
            surcharges, no per-booking fees — just applicable sales tax in
            states where required.
          </p>
        </div>

        <PricingCards />

        <div className="mt-16 rounded-lg border border-[#E7E5E4] p-8">
          <h2 className="font-display text-2xl font-medium">
            Frequently asked questions
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              {
                q: "What does \"sites included\" mean?",
                a: "Each plan comes with 1–3 fully separate booking sites — different brand, template, calendar, and clients per site. Need more? Studio and Scale let you add additional sites for $20/mo (or $200/yr) up to your plan's cap.",
              },
              {
                q: "Annual vs monthly — what's the difference?",
                a: "Annual costs the same as 10 months of monthly — so you get 2 months free. Same features, same plan, just billed once a year. Add-on sites also get the same discount on the annual cycle.",
              },
              {
                q: "Can I change or cancel my plan later?",
                a: "Yes, upgrade, downgrade, or cancel anytime from your dashboard. Cancellation takes effect at the end of your current billing cycle — no partial refunds, but you keep full access through the period you already paid for.",
              },
              {
                q: "Does OYRB take a cut of my bookings or tips?",
                a: "No. You pay a flat fee, that's it. We don't touch client payments — they flow directly to your Stripe account.",
              },
              {
                q: "What payment methods do clients use?",
                a: "All major credit and debit cards via Stripe. Apple Pay and Google Pay are supported on compatible devices.",
              },
              {
                q: "Is there a free trial?",
                a: "Yes — 14 days on all plans. Card required at signup, but no charge until day 15. Cancel anytime before then and you pay nothing.",
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
