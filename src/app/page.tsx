import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Star } from "lucide-react";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { ScrollFeatures } from "@/components/marketing/scroll-features";
import { ServiceCategories } from "@/components/marketing/service-categories";
import { FeaturedCategory } from "@/components/marketing/featured-category";
import { CheckoutButton } from "@/components/marketing/checkout-button";
import { TEMPLATE_THEMES } from "@/lib/template-themes";

export const metadata = {
  title: { absolute: "Own Your Brand" },
};

// ─── Hero floating images ────────────────────────────────────────────────────
const HERO_IMAGES = [
  { id: "1508214751196-bcfd4ca60f91", alt: "Beauty professional styling hair", size: "large" },
  { id: "1519014816548-bf5fe059798b",    alt: "Nail technician detailing nails",   size: "small" },
  { id: "1540555700478-4be289fbecef", alt: "Lash artist at work",               size: "small" },
];

// ─── Testimonials ────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "I went from texting clients back and forth to having everything automated. My rebooking rate went up 40% in the first month.",
    name: "Destiny M.",
    role: "Hair Stylist, Atlanta",
    img: "1519699047748-de8e457a634e",
  },
  {
    quote: "My clients always compliment my booking page. They think I hired a designer. OYRB did that in 10 minutes.",
    name: "Jasmine R.",
    role: "Nail Tech, Houston",
    img: "1531746020798-e6953c6e8e04",
  },
  {
    quote: "Deposits changed my life. No more no-shows. I actually get paid for my time now.",
    name: "Aaliyah K.",
    role: "Lash Artist, Chicago",
    img: "1542838132-92c53300491e",
  },
];

// ─── Pricing tiers ───────────────────────────────────────────────────────────
// Source of truth lives in src/lib/plans.ts — copy below stays in sync with
// it. "Sites included" / cap surface explicitly so the homepage advertises
// the same numbers as the pricing page.
const TIERS = [
  {
    tier: "starter" as const,
    name: "Starter",
    price: "$24",
    sites: "1 site included",
    features: ["1 staff calendar", "1 template", "Stripe payments", "Email confirmations", "Email booking reminders"],
    highlight: false,
  },
  {
    tier: "studio" as const,
    name: "Studio",
    price: "$49",
    sites: "2 sites included · add up to 1 more for $20/mo",
    features: ["Up to 3 staff", "All templates", "Deposits", "Intake forms", "SMS reminders (24h before)", "Waitlist + last-min slot alerts", "Everything in Starter"],
    highlight: true,
  },
  {
    tier: "scale" as const,
    name: "Scale",
    price: "$89",
    sites: "3 sites included · add up to 2 more for $20/mo each",
    features: ["Unlimited staff", "Custom domain", "Multi-location booking", "Unlimited SMS reminders", "Priority support", "Everything in Studio"],
    highlight: false,
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Nav />

      {/* ── Hero ── */}
      <section className="overflow-hidden pt-20 md:pt-0">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid min-h-[90vh] items-center gap-12 md:grid-cols-2">

            {/* Left: copy */}
            <div className="py-16 md:py-0">
              <p className="mb-5 text-sm font-medium text-[#B8896B]">
                For hair stylists, lash techs, nail techs &amp; more
              </p>
              <h1 className="font-display text-5xl font-medium leading-[1.1] tracking-[-0.02em] md:text-6xl lg:text-7xl">
                Build your site.
                <br />
                Run your business.
                <br />
                Own your brand.
              </h1>
              <p className="mt-6 max-w-md text-base text-[#525252] md:text-lg">
                OYRB gives beauty professionals a stunning booking site and every
                tool to run their business — without the learning curve.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80"
                >
                  Start for free <ArrowRight size={14} />
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#E7E5E4] px-6 py-3 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#F5F5F4]"
                >
                  See how it works
                </Link>
              </div>
              <p className="mt-6 text-xs text-[#A3A3A3]">
                14-day free trial · Card required, no charge until day 15
              </p>
            </div>

            {/* Right: floating image composition */}
            <div className="relative hidden h-[600px] md:flex md:items-center md:justify-center lg:h-[700px]">

              {/* Main large image */}
              <div className="absolute right-0 top-8 h-[420px] w-[300px] overflow-hidden rounded-2xl shadow-xl lg:h-[500px] lg:w-[340px]">
                <Image
                  src="https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/hero-1-1776526722.jpg"
                  alt="Beauty professional at work"
                  fill
                  className="object-cover"
                  priority
                  sizes="340px"
                />
              </div>

              {/* Second image — left, lower */}
              <div className="absolute left-0 bottom-12 h-[260px] w-[200px] overflow-hidden rounded-2xl shadow-lg lg:h-[300px] lg:w-[230px]">
                <Image
                  src="https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/hero-1-1776525604.jpg"
                  alt="Beauty professional at work"
                  fill
                  className="object-cover"
                  sizes="230px"
                />
              </div>

              {/* Third image — left, upper */}
              <div className="absolute left-16 top-10 h-[180px] w-[160px] overflow-hidden rounded-2xl shadow-md lg:h-[210px] lg:w-[190px]">
                <Image
                  src="https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/hero-3-1776527115.jpg"
                  alt="Beauty professional at work"
                  fill
                  className="object-cover"
                  sizes="190px"
                />
              </div>

              {/* Floating booking notification bubble */}
              <div className="absolute bottom-32 right-4 w-52 rounded-2xl border border-[#E7E5E4] bg-white/95 p-3.5 shadow-lg backdrop-blur-sm lg:right-8 lg:w-56">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B8896B]/15">
                    <span className="text-sm">✓</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#0A0A0A]">New booking confirmed</p>
                    <p className="mt-0.5 text-xs text-[#737373]">Cut &amp; Color · Today 2:00 PM</p>
                    <p className="mt-1 text-xs font-medium text-[#B8896B]">+$85 deposit received</p>
                  </div>
                </div>
              </div>

              {/* Floating "live" indicator */}
              <div className="absolute left-4 top-[45%] flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-xs font-medium text-[#525252]">Your site is live</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stat strip ── */}
      <div className="border-y border-[#E7E5E4] bg-[#FAFAF9] py-10">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { stat: "10 min", label: "Average setup time" },
              { stat: "40%", label: "More repeat bookings" },
              { stat: "$0", label: "Per-booking fees" },
              { stat: "80", label: "Designer templates" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="font-display text-3xl font-medium tracking-tight text-[#0A0A0A] md:text-4xl">
                  {item.stat}
                </p>
                <p className="mt-1 text-xs text-[#737373] md:text-sm">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Template Gallery Preview ── */}
      <section className="border-t border-[#E7E5E4] py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#B8896B]">Template gallery</p>
              <h2 className="font-display mt-3 text-3xl font-medium tracking-[-0.02em] md:text-5xl">
                29 themes. 5 layouts.<br className="hidden md:block" /> Your signature style.
              </h2>
              <p className="mt-4 max-w-lg text-[#525252]">
                From soft &amp; feminine to bold editorial to streetwear-inspired. 145 total combinations — pick a palette, pick a layout, launch in minutes.
              </p>
            </div>
          </div>

          {/* 4 featured themes — palette dots only, responsive */}
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {["aura", "sage", "y2k", "bold"].map((id) => {
              const t = TEMPLATE_THEMES[id];
              if (!t) return null;
              return (
                <Link
                  key={t.id}
                  href={`/templates/preview/bold/${t.id}`}
                  className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-[#E7E5E4] p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ backgroundColor: t.bg }}
                >
                  {/* Theme name in display font */}
                  <div>
                    <p
                      className="text-3xl"
                      style={{
                        fontFamily: t.displayFont,
                        fontWeight: t.displayWeight,
                        color: t.ink,
                        letterSpacing: `${t.displayTracking}em`,
                      }}
                    >
                      {t.name}
                    </p>
                    <p
                      className="mt-1 text-xs uppercase tracking-widest"
                      style={{ color: t.muted }}
                    >
                      {t.category}
                    </p>
                  </div>

                  {/* Vibe description */}
                  <p className="text-sm leading-relaxed" style={{ color: t.muted }}>
                    {t.vibe}
                  </p>

                  {/* Color palette dots */}
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    {[t.bg, t.surface, t.ink, t.accent, t.accent2].map((color, i) => (
                      <div
                        key={i}
                        className="h-4 w-4 rounded-full border shadow-sm"
                        style={{
                          backgroundColor: color,
                          borderColor: color === t.bg ? t.border : "rgba(255,255,255,0.3)",
                        }}
                        title={color}
                      />
                    ))}
                  </div>

                  {/* Hover preview indicator */}
                  <div
                    className="absolute right-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-semibold opacity-0 shadow backdrop-blur-sm transition-opacity group-hover:opacity-100"
                    style={{ backgroundColor: t.surface, color: t.ink }}
                  >
                    Preview →
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Browse templates CTA — centered, responsive */}
          <div className="mt-10 flex justify-center md:mt-12">
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80"
            >
              Browse all 145 templates <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Scroll features ── */}
      <ScrollFeatures />

      {/* ── Service categories ── */}
      <ServiceCategories />

      {/* ── Featured in your area ── */}
      <FeaturedCategory />

      {/* ── Testimonials ── */}
      <section className="border-t border-[#E7E5E4] bg-[#FFFFFF] py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <p className="text-sm font-medium text-[#B8896B]">What pros are saying</p>
          <h2 className="font-display mt-3 text-3xl font-medium tracking-[-0.02em] md:text-5xl">
            Your success is our priority.
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="flex flex-col gap-4 rounded-xl border border-[#E7E5E4] p-6">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="#B8896B" className="text-[#B8896B]" />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-[#525252]">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[#E7E5E4]">
                    <Image
                      src={`https://images.unsplash.com/photo-${t.img}?auto=format&fit=crop&w=80&q=80`}
                      alt={t.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-[#737373]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="border-t border-[#E7E5E4] py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <p className="text-sm font-medium text-[#B8896B]">Pricing</p>
          <h2 className="font-display mt-3 text-3xl font-medium tracking-[-0.02em] md:text-5xl">
            Simple, transparent pricing.
          </h2>
          <p className="mt-4 text-[#525252]">One flat monthly price. We never take a cut of your bookings or tips — you keep 100% of what your clients pay you. Cancel anytime.</p>
          <p className="mt-1 text-xs text-[#A3A3A3]">The price you see is exactly what you&apos;re billed each month (plus applicable sales tax in states where required).</p>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.tier}
                className={`rounded-xl border p-6 ${t.highlight ? "border-[#B8896B] bg-white" : "border-[#E7E5E4]"}`}
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
                <p className="mt-2 text-xs text-[#525252]">{t.sites}</p>
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

          <div className="mt-6 text-center">
            <Link href="/pricing" className="text-sm text-[#B8896B] hover:underline">
              See full pricing details
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-[#E7E5E4] bg-[#0A0A0A] py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="font-display text-4xl font-medium tracking-[-0.02em] text-white md:text-5xl">
                Ready to own your brand?
              </h2>
              <p className="mt-4 text-[#A3A3A3]">
                14 days free. Card required, no charge until day 15. Your site live in under 10 minutes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-medium text-[#0A0A0A] transition-opacity hover:opacity-90"
                >
                  Start for free <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* 3 portrait thumbnails */}
            <div className="flex justify-end gap-3">
              {[
                "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/cta-1-1776537062.jpg",
                "1531746020798-e6953c6e8e04",
                "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/cta-3-1776536345.jpg",
              ].map((id, i) => (
                <div
                  key={id}
                  className={`relative overflow-hidden rounded-xl ${
                    i === 1 ? "h-48 w-32 md:h-56 md:w-36" : "h-40 w-28 md:h-48 md:w-32"
                  }`}
                  style={{ marginTop: i === 1 ? "-16px" : "0" }}
                >
                  <Image
                    src={id.startsWith("http") ? id : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=300&q=80`}
                    alt="Beauty professional"
                    fill
                    className="object-cover"
                    sizes="144px"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
