import Link from "next/link";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { ArrowRight, Check } from "lucide-react";

const TEMPLATES = [
  {
    name: "Minimal",
    description: "Stark, editorial. Lots of whitespace, serif display type.",
    bg: "#F5F5F4",
    accent: "#0A0A0A",
  },
  {
    name: "Studio",
    description: "Warm, organic. Soft neutrals and rounded forms.",
    bg: "#EDE8E3",
    accent: "#B8896B",
  },
  {
    name: "Editorial",
    description: "Magazine-style. Photography-forward, bold type pairings.",
    bg: "#1A1A1A",
    accent: "#D4A5A5",
  },
];

const FEATURES = [
  {
    heading: "A booking site that looks like your brand",
    body: "Choose from three designer templates built for beauty professionals. Your clients will notice the difference.",
  },
  {
    heading: "Online payments, deposits included",
    body: "Collect deposits at booking time, charge the balance after the service. Powered by Stripe — funds land in your account directly.",
  },
  {
    heading: "From signup to published in under 10 minutes",
    body: "Answer a few questions, pick a template, add your services. No designer. No developer. No waiting.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Nav />

      {/* Hero */}
      <section className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-36 md:pb-40 md:pt-48">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-4 text-sm font-medium text-[#B8896B]">
              For hair stylists, lash techs, estheticians &amp; more
            </p>
            <h1 className="font-display text-5xl font-medium leading-[1.1] tracking-[-0.02em] md:text-7xl">
              A booking site as polished as your work.
            </h1>
            <p className="mt-6 max-w-md text-base text-[#525252] md:text-lg">
              GlamStack gives beauty professionals a stunning booking site and
              the tools to run their business — without the learning curve.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80"
              >
                Start for free <ArrowRight size={14} />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 rounded-md border border-[#E7E5E4] px-6 py-3 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#F5F5F4]"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="aspect-[4/5] w-full rounded-lg bg-[#EDE8E3]" />
            <div className="absolute -bottom-6 -left-6 h-32 w-44 rounded-md border border-[#E7E5E4] bg-[#F5F5F4] p-4">
              <p className="text-xs text-[#737373]">New booking</p>
              <p className="mt-1 text-sm font-medium">Cut &amp; Color</p>
              <p className="mt-0.5 text-xs text-[#B8896B]">Today, 2:00 PM</p>
            </div>
          </div>
        </div>
      </section>

      {/* Templates preview */}
      <section className="border-t border-[#E7E5E4] bg-[#FFFFFF] py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <p className="text-sm font-medium text-[#B8896B]">Templates</p>
          <h2 className="font-display mt-3 text-3xl font-medium tracking-[-0.02em] md:text-5xl">
            Three distinct aesthetics.
            <br />
            All built for beauty.
          </h2>
          <p className="mt-4 max-w-md text-[#525252]">
            Pick the template that fits your brand. Customize and switch anytime.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TEMPLATES.map((t) => (
              <div
                key={t.name}
                className="overflow-hidden rounded-lg border border-[#E7E5E4]"
              >
                <div
                  className="aspect-[3/4] w-full"
                  style={{ backgroundColor: t.bg }}
                >
                  <div className="flex h-full items-end p-6">
                    <span
                      className="font-display text-2xl font-medium"
                      style={{ color: t.accent }}
                    >
                      {t.name}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-[#737373]">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <p className="text-sm font-medium text-[#B8896B]">Why GlamStack</p>
          <h2 className="font-display mt-3 text-3xl font-medium tracking-[-0.02em] md:text-5xl">
            Built for the way you work.
          </h2>

          <div className="mt-16 grid overflow-hidden rounded-lg bg-[#E7E5E4] gap-px md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.heading} className="bg-[#FAFAF9] p-8">
                <h3 className="font-display text-xl font-medium leading-snug">
                  {f.heading}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#525252]">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-[#E7E5E4] bg-[#FFFFFF] py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <p className="text-sm font-medium text-[#B8896B]">Pricing</p>
          <h2 className="font-display mt-3 text-3xl font-medium tracking-[-0.02em] md:text-5xl">
            Simple, transparent pricing.
          </h2>
          <p className="mt-4 text-[#525252]">No hidden fees. Cancel anytime.</p>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                name: "Starter",
                price: "$24",
                features: ["1 staff calendar", "1 template", "Stripe payments", "Email confirmations"],
                highlight: false,
              },
              {
                name: "Studio",
                price: "$49",
                features: ["Up to 3 staff", "All templates", "Deposits", "Intake forms", "SMS reminders"],
                highlight: true,
              },
              {
                name: "Scale",
                price: "$89",
                features: ["Unlimited staff", "Custom domain", "Multi-location", "Priority support"],
                highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`rounded-lg border p-6 ${tier.highlight ? "border-[#B8896B] bg-white" : "border-[#E7E5E4]"}`}
              >
                {tier.highlight && (
                  <span className="mb-4 inline-block rounded-full bg-[#B8896B]/10 px-3 py-1 text-xs font-medium text-[#B8896B]">
                    Most popular
                  </span>
                )}
                <p className="text-sm font-medium text-[#525252]">{tier.name}</p>
                <p className="font-display mt-1 text-4xl font-medium">
                  {tier.price}
                  <span className="text-base font-normal text-[#737373]">/mo</span>
                </p>
                <ul className="mt-6 flex flex-col gap-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#525252]">
                      <Check size={14} className="shrink-0 text-[#B8896B]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-6 block rounded-md py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-80 ${tier.highlight ? "bg-[#0A0A0A] text-white" : "border border-[#E7E5E4] text-[#0A0A0A] hover:bg-[#F5F5F4]"}`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link href="/pricing" className="text-sm text-[#B8896B] hover:underline">
              See full pricing details
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6 text-center">
          <h2 className="font-display text-4xl font-medium tracking-[-0.02em] md:text-6xl">
            Ready to elevate your booking experience?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[#525252]">
            Join beauty professionals who use GlamStack to run their business
            and impress their clients.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80"
            >
              Start for free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
