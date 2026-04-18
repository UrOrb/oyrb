import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

const SECTIONS = [
  {
    label: "Templates",
    heading: "A site that actually looks like your brand.",
    body: "Three professionally designed templates built for beauty professionals. Minimal, Studio, and Editorial — each with a distinct aesthetic. Customize your colors, fonts, and content. Switch templates anytime without losing your data.",
    visual: "#EDE8E3",
  },
  {
    label: "Booking",
    heading: "Bookings that work around your schedule.",
    body: "Set your hours, block off time, add buffer between appointments. Clients book directly from your site. You get notified. No back-and-forth, no double-bookings.",
    visual: "#F5F5F4",
  },
  {
    label: "Payments",
    heading: "Collect deposits. Get paid. Move on.",
    body: "Require deposits at booking time to protect your time. Clients pay via Stripe — all major cards, Apple Pay, Google Pay. Funds land in your bank account directly. No middlemen.",
    visual: "#1A1A1A",
  },
  {
    label: "Dashboard",
    heading: "Everything you need, nothing you don't.",
    body: "See your upcoming bookings, revenue, and client history at a glance. Manage your services, update your site, and handle your schedule — all from one clean dashboard.",
    visual: "#E7E5E4",
  },
];

export default function FeaturesPage() {
  return (
    <div className="flex flex-col">
      <Nav />

      <main>
        <div className="mx-auto max-w-[1200px] px-6 pb-16 pt-36 md:pt-48 text-center">
          <p className="text-sm font-medium text-[#B8896B]">Features</p>
          <h1 className="font-display mt-3 text-4xl font-medium tracking-[-0.02em] md:text-6xl">
            Everything a beauty professional needs.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[#525252]">
            GlamStack is built around how beauty professionals actually work —
            not how a generic SaaS tool thinks you work.
          </p>
        </div>

        {SECTIONS.map((section, i) => (
          <section
            key={section.label}
            className={`border-t border-[#E7E5E4] py-24 md:py-32 ${i % 2 === 1 ? "bg-[#FFFFFF]" : ""}`}
          >
            <div className="mx-auto max-w-[1200px] px-6">
              <div
                className={`grid items-center gap-16 md:grid-cols-2 ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className={i % 2 === 1 ? "md:order-2" : ""}>
                  <p className="text-sm font-medium text-[#B8896B]">{section.label}</p>
                  <h2 className="font-display mt-3 text-3xl font-medium leading-tight tracking-[-0.02em] md:text-4xl">
                    {section.heading}
                  </h2>
                  <p className="mt-4 text-[#525252] leading-relaxed">{section.body}</p>
                </div>
                <div
                  className={`aspect-[4/3] w-full rounded-lg ${i % 2 === 1 ? "md:order-1" : ""}`}
                  style={{ backgroundColor: section.visual }}
                />
              </div>
            </div>
          </section>
        ))}

        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-[1200px] px-6 text-center">
            <h2 className="font-display text-4xl font-medium tracking-[-0.02em] md:text-5xl">
              Ready to see it for yourself?
            </h2>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80"
              >
                Start for free <ArrowRight size={14} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-md border border-[#E7E5E4] px-6 py-3 text-sm font-medium text-[#0A0A0A] hover:bg-[#F5F5F4] transition-colors"
              >
                View pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
