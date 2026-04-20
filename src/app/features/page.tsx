import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

type Section = {
  label: string;
  heading: string;
  body: string;
  visual: string;
  image?: string;
  tier?: string;
};

const SECTIONS: Section[] = [
  {
    label: "Templates",
    heading: "A site that actually looks like your brand.",
    body: "100 professionally designed templates across 5 layouts and 20 themes — built specifically for beauty professionals. Customize your colors, fonts, and content. Switch templates anytime without losing your data.",
    visual: "#EDE8E3",
    image: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/features-page-01-1776552359.jpg",
  },
  {
    label: "Booking",
    heading: "Bookings that work around your schedule.",
    body: "Set your hours, block off time, add buffer between appointments. Clients book directly from your site through a 3-step confirmation flow that prevents chargebacks. You get notified. No back-and-forth, no double-bookings.",
    visual: "#F5F5F4",
    image: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/features-page-02-1776553098.jpg",
  },
  {
    label: "No-Show Protection",
    heading: "Kill no-shows with SMS + Waitlist.",
    body: "Studio and Scale tiers get automated 24-hour SMS reminders (on top of email) plus a Waitlist system — when a client cancels last-minute, waitlisters are instantly texted. One recovered appointment a month more than covers the subscription.",
    visual: "#FFE5D1",
    image: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/features-page-03-1776553745.jpg",
    tier: "Studio / Scale",
  },
  {
    label: "Payments",
    heading: "Collect deposits. Get paid. Move on.",
    body: "Studio tier adds deposit collection at booking time to protect your time. Clients pay via Stripe — all major cards, Apple Pay, Google Pay. Funds land in your bank directly. No per-booking fees, no middlemen.",
    visual: "#1A1A1A",
    image: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/features-page-04-1776556011.jpg",
    tier: "Studio / Scale",
  },
  {
    label: "Marketing",
    heading: "Bring past clients back.",
    body: "Send email campaigns to your client list with one click. Win-back segments (30 / 60 / 90 days) automatically target clients who haven't booked recently. Ship announcements, discount codes, and new service launches — all from your dashboard.",
    visual: "#D4E5D4",
    image: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/features-page-05-1776556577.jpg",
  },
  {
    label: "Dashboard",
    heading: "Everything you need, nothing you don't.",
    body: "See your upcoming bookings, revenue, and client history at a glance. Manage services, update your site, handle your schedule, and view your waitlist — all from one clean dashboard.",
    visual: "#E7E5E4",
    image: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/features-page-06-1776557051.jpg",
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
            OYRB is built around how beauty professionals actually work —
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
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-medium text-[#B8896B]">{section.label}</p>
                    {section.tier && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                        ✦ {section.tier}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display mt-3 text-3xl font-medium leading-tight tracking-[-0.02em] md:text-4xl">
                    {section.heading}
                  </h2>
                  <p className="mt-4 text-[#525252] leading-relaxed">{section.body}</p>
                </div>
                <div
                  className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg ${i % 2 === 1 ? "md:order-1" : ""}`}
                  style={{ backgroundColor: section.visual }}
                >
                  {section.image && (
                    <Image
                      src={section.image}
                      alt={section.heading}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                  )}
                </div>
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
