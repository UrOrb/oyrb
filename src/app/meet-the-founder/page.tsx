import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

const META_TITLE = "Meet the Founder | OYRB";
const META_DESCRIPTION =
  "Meet AlaniaRenee, the nail tech turned tech founder building OYRB — a booking platform for beauty professionals. Own Your Brand.";

export const metadata = {
  title: { absolute: META_TITLE },
  description: META_DESCRIPTION,
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
  },
};

const FOUNDER_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "AlaniaRenee",
  jobTitle: "Founder & CEO",
  worksFor: {
    "@type": "Organization",
    name: "OYRB LLC",
    url: "https://oyrb.space",
  },
  url: "https://oyrb.space/meet-the-founder",
};

const PALETTE = {
  cream: "#FAF4EE",
  blush: "#F6E4DB",
  peach: "#EED3C4",
  powder: "#EAE0D4",
  sage: "#D9E2D4",
  ink: "#2E221B",
  mute: "#8A7A6E",
  line: "rgba(46,34,27,0.14)",
  accent: "#B4684E",
};

const FEATURES = [
  {
    num: "01",
    heading: "A beautifully branded site,",
    em: "in under ten minutes.",
    body: "Publish a booking site that actually looks like your work — not a stock template three salons down the block.",
  },
  {
    num: "02",
    heading: "150 templates.",
    em: "5 layouts. 30 themes.",
    body: "Professionally designed for how beauty pros present their craft. Built to be customized — made to be yours.",
  },
  {
    num: "03",
    heading: "Deposits, reminders, payments —",
    em: "all built in.",
    body: "Intake forms, SMS reminders, deposits, and Stripe payments. No third-party bolt-ons. No surprise fees.",
  },
  {
    num: "04",
    heading: "A dashboard that feels",
    em: "calm, not chaotic.",
    body: "Run your whole business — bookings, revenue, clients, waitlist, site — from one quietly considered screen.",
  },
];

export default function AboutPage() {
  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: PALETTE.cream,
        color: PALETTE.ink,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <Nav />

      {/* grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(46,34,27,0.05) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
          mixBlendMode: "multiply",
          opacity: 0.55,
        }}
      />

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden px-6 pb-24 pt-40 md:pb-32 md:pt-56"
        style={{
          background: `linear-gradient(180deg, ${PALETTE.blush} 0%, ${PALETTE.cream} 100%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute -right-28 -top-28 h-[560px] w-[560px] rounded-full"
          style={{
            background: `radial-gradient(circle, ${PALETTE.peach} 0%, transparent 70%)`,
            opacity: 0.6,
          }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full"
          style={{
            background: `radial-gradient(circle, ${PALETTE.sage} 0%, transparent 70%)`,
            opacity: 0.5,
          }}
        />

        <div className="relative mx-auto max-w-[1200px]">
          <div
            className="mb-7 inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em]"
            style={{ color: PALETTE.accent, fontFamily: '"Space Mono", monospace' }}
          >
            <span
              className="inline-block h-px w-7"
              style={{ background: PALETTE.accent }}
            />
            Our story · 2026
          </div>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(FOUNDER_JSONLD) }}
          />
          <h1
            className="max-w-4xl text-5xl leading-[0.95] tracking-[-0.03em] md:text-7xl lg:text-[104px]"
            style={{ fontFamily: '"Fraunces", serif', fontWeight: 400 }}
          >
            Meet the{" "}
            <em
              className="italic"
              style={{ color: PALETTE.accent, fontWeight: 400 }}
            >
              Founder.
            </em>
          </h1>

          <p
            className="mt-8 max-w-2xl text-xl italic leading-snug md:text-2xl"
            style={{
              fontFamily: '"Fraunces", serif',
              fontWeight: 300,
              color: PALETTE.mute,
            }}
          >
            OYRB — Own Your Brand. A booking platform that respects
            the craft as much as the craft respects the client.
          </p>

          <div
            className="mt-14 flex flex-wrap gap-10 border-t pt-6"
            style={{ borderColor: PALETTE.line, maxWidth: 720 }}
          >
            {[
              { lbl: "Founded", val: "Georgia, 2026" },
              { lbl: "For", val: "Every beauty specialty" },
              { lbl: "Built by", val: "Ex salon owner / nail artist" },
            ].map((m) => (
              <div key={m.lbl} className="flex flex-col gap-1">
                <span
                  className="text-[10px] uppercase tracking-[0.25em]"
                  style={{ color: PALETTE.mute, fontFamily: '"Space Mono", monospace' }}
                >
                  {m.lbl}
                </span>
                <span
                  className="text-lg italic"
                  style={{ fontFamily: '"Fraunces", serif' }}
                >
                  {m.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORY ── */}
      <section
        className="px-6 py-24 md:py-32"
        style={{
          background: `linear-gradient(180deg, ${PALETTE.blush} 0%, ${PALETTE.cream} 40%)`,
        }}
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-12 md:grid-cols-[240px_1fr] md:gap-20">
            <div
              className="self-start border-t pt-3.5 text-[11px] uppercase tracking-[0.25em]"
              style={{
                borderColor: PALETTE.ink,
                color: PALETTE.mute,
                fontFamily: '"Space Mono", monospace',
              }}
            >
              § 01 — The story
            </div>
            <div>
              <h2
                className="mb-10 text-4xl leading-none tracking-[-0.02em] md:text-6xl"
                style={{ fontFamily: '"Fraunces", serif', fontWeight: 400 }}
              >
                I was a nail artist for{" "}
                <em
                  className="italic"
                  style={{ color: PALETTE.accent, fontWeight: 400 }}
                >
                  twelve years.
                </em>{" "}
                I also owned salons.
              </h2>
              <p
                className="mb-8 max-w-xl text-xl italic leading-relaxed"
                style={{ fontFamily: '"Fraunces", serif', fontWeight: 400 }}
              >
                For most of those years, I worked in salons that taught me
                one quiet rule: do less for your clients.
              </p>
              <p
                className="mb-5 max-w-xl text-[17px] italic leading-[1.7]"
                style={{ color: PALETTE.ink }}
              >
                &ldquo;Don&apos;t prime the nail that well — you want them to
                come back.&rdquo;
              </p>
              <p
                className="mb-5 max-w-xl text-[17px] italic leading-[1.7]"
                style={{ color: PALETTE.ink }}
              >
                &ldquo;Don&apos;t do that much cuticle work — save something
                for next time.&rdquo;
              </p>
              <p
                className="mb-5 max-w-xl text-[17px] italic leading-[1.7]"
                style={{ color: PALETTE.ink }}
              >
                &ldquo;Don&apos;t make it last two months — you won&apos;t
                have returning clients.&rdquo;
              </p>
              <p
                className="mb-5 max-w-xl text-[17px] leading-[1.7]"
                style={{ color: PALETTE.ink }}
              >
                Every version of the same sentence. Every version meaning the
                same thing — keep her just broken enough to need you again.
              </p>
              <p
                className="mb-5 max-w-xl text-[17px] leading-[1.7]"
                style={{ color: PALETTE.ink }}
              >
                I refused. I always refused.
              </p>
              <p
                className="mb-5 max-w-xl text-[17px] leading-[1.7]"
                style={{ color: PALETTE.ink }}
              >
                If a client paid me $100 or more, her set was lasting. Two
                months minimum. Not because I was soft — because I&apos;d been
                the customer too. I knew what it felt like to spend money I
                couldn&apos;t really afford on someone who didn&apos;t make it
                worth it.
              </p>
              <p
                className="mb-5 max-w-xl text-[17px] leading-[1.7]"
                style={{ color: PALETTE.ink }}
              >
                I was told I&apos;d lose clients that way. I didn&apos;t.
                They came back through every low I had. They came back because
                they stopped seeing me as a vendor and started seeing me as a
                person who wouldn&apos;t waste them.
              </p>
              <p
                className="mb-5 max-w-xl text-[17px] leading-[1.7]"
                style={{ color: PALETTE.ink }}
              >
                When I started owning salons, I saw the other side of it —
                the bills, the booking apps, the tech that promised to make
                things easier and somehow always cost more than it saved. I
                tried every booking platform on the market. The ones that
                took a percentage of every appointment. The ones that charged
                extra for reminders, deposits, and a custom domain. The
                &ldquo;professional&rdquo; templates that looked identical to
                every other salon three doors down.
              </p>
              <p
                className="mb-5 max-w-xl text-[17px] leading-[1.7]"
                style={{ color: PALETTE.ink }}
              >
                The same ethic I&apos;d refused in the chair was alive and
                well — just dressed up as software now.
              </p>
              <p
                className="mb-5 max-w-xl text-[17px] leading-[1.7]"
                style={{ color: PALETTE.ink }}
              >
                So I stepped away from both the chair and the salons to build
                something better.
              </p>
              <p className="max-w-xl text-[17px] leading-[1.7]">
                <strong>I built OYRB.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT WE DO ── */}
      <section
        className="px-6 py-24"
        style={{ backgroundColor: PALETTE.powder }}
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-12 md:grid-cols-[240px_1fr] md:gap-20">
            <div
              className="self-start border-t pt-3.5 text-[11px] uppercase tracking-[0.25em]"
              style={{
                borderColor: PALETTE.ink,
                color: PALETTE.mute,
                fontFamily: '"Space Mono", monospace',
              }}
            >
              § 02 — What we do
            </div>
            <div>
              <h2
                className="text-4xl leading-none tracking-[-0.02em] md:text-6xl"
                style={{ fontFamily: '"Fraunces", serif', fontWeight: 400 }}
              >
                A booking platform built{" "}
                <em
                  className="italic"
                  style={{ color: PALETTE.accent, fontWeight: 400 }}
                >
                  for every specialty.
                </em>
              </h2>
              <p
                className="mt-7 max-w-xl text-[17px] leading-[1.7]"
                style={{ color: PALETTE.ink }}
              >
                OYRB is designed for beauty professionals across every
                specialty — hair, nails, lashes, brows, skin, makeup, barbering,
                and full-service studios serving men, women, and every client
                in between.
              </p>
            </div>
          </div>

          <div
            className="mt-16 grid grid-cols-1 gap-px border md:grid-cols-2"
            style={{ borderColor: PALETTE.line, background: PALETTE.line }}
          >
            {FEATURES.map((f) => (
              <div
                key={f.num}
                className="flex flex-col gap-2.5 p-9"
                style={{ backgroundColor: PALETTE.powder }}
              >
                <span
                  className="text-[11px] uppercase tracking-[0.25em]"
                  style={{
                    color: PALETTE.accent,
                    fontFamily: '"Space Mono", monospace',
                  }}
                >
                  {f.num}
                </span>
                <h3
                  className="text-[26px] leading-[1.15] tracking-[-0.01em]"
                  style={{ fontFamily: '"Fraunces", serif', fontWeight: 400 }}
                >
                  {f.heading}{" "}
                  <em
                    className="italic"
                    style={{ color: PALETTE.mute, fontWeight: 400 }}
                  >
                    {f.em}
                  </em>
                </h3>
                <p
                  className="text-[15px] leading-[1.55]"
                  style={{ color: PALETTE.mute }}
                >
                  {f.body}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-12 flex flex-wrap items-baseline justify-between gap-5 border-t pt-8"
            style={{ borderColor: PALETTE.line }}
          >
            <p
              className="max-w-[560px] text-xl italic leading-snug"
              style={{ fontFamily: '"Fraunces", serif' }}
            >
              One flat monthly fee. You keep 100% of your bookings, tips, and
              payments.{" "}
              <em style={{ color: PALETTE.accent }}>
                No platform cuts from us.
              </em>
            </p>
            <span
              className="text-[11px] uppercase tracking-[0.25em]"
              style={{
                color: PALETTE.mute,
                fontFamily: '"Space Mono", monospace',
              }}
            >
              No surprises.
            </span>
          </div>
        </div>
      </section>

      {/* ── FOUNDER NOTE ── */}
      <section
        className="relative overflow-hidden px-6 py-32 md:py-36"
        style={{
          background: `linear-gradient(180deg, ${PALETTE.cream} 0%, ${PALETTE.blush} 60%, ${PALETTE.peach} 100%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute -right-48 top-[10%] h-[620px] w-[620px] rounded-full blur-[20px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-[1200px]">
          <div className="grid items-start gap-16 md:grid-cols-[440px_1fr] md:gap-20">
            <div className="relative">
              <Image
                src="/aura-hero.jpeg"
                alt="OYRB brand portrait"
                width={440}
                height={550}
                className="block h-auto w-full rounded-lg object-cover"
                style={{
                  aspectRatio: "4/5",
                  objectPosition: "center 25%",
                  filter: "saturate(0.92) contrast(0.98)",
                  boxShadow: "0 30px 60px rgba(46,34,27,0.18)",
                }}
                priority
              />
              <div
                className="absolute -bottom-5 -left-5 px-5 py-3.5 text-[10px] uppercase tracking-[0.25em]"
                style={{
                  backgroundColor: PALETTE.cream,
                  border: `1px solid ${PALETTE.line}`,
                  color: PALETTE.ink,
                  fontFamily: '"Space Mono", monospace',
                  boxShadow: "0 8px 20px rgba(46,34,27,0.08)",
                }}
              >
                Founder
                <b
                  className="mt-1 block text-[22px] normal-case not-italic tracking-normal"
                  style={{
                    fontFamily: '"Fraunces", serif',
                    fontStyle: "italic",
                    fontWeight: 400,
                  }}
                >
                  Halania
                </b>
                Georgia · est. 2026
              </div>
              <div
                className="absolute -right-6 -top-7 flex h-28 w-28 -rotate-[8deg] items-center justify-center rounded-full text-center text-base italic leading-tight md:-right-8 md:-top-7 md:h-32 md:w-32"
                style={{
                  backgroundColor: PALETTE.accent,
                  color: PALETTE.cream,
                  fontFamily: '"Fraunces", serif',
                  boxShadow: "0 10px 24px rgba(180,104,78,0.25)",
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-1.5 rounded-full border border-dashed"
                  style={{ borderColor: "rgba(250,244,238,0.5)" }}
                />
                <span className="px-3">
                  Own<br />Your<br />Reality
                </span>
              </div>
            </div>

            <div>
              <span
                className="mb-7 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.25em]"
                style={{
                  color: PALETTE.accent,
                  fontFamily: '"Space Mono", monospace',
                }}
              >
                <span
                  className="inline-block h-px w-6"
                  style={{ background: PALETTE.accent }}
                />
                § 03 — A note from the founder
              </span>
              <h2
                className="mb-9 text-4xl italic leading-[1.1] tracking-[-0.02em] md:text-[56px]"
                style={{ fontFamily: '"Fraunces", serif', fontWeight: 400 }}
              >
                &ldquo;I built this because the beauty industry should{" "}
                <em style={{ color: PALETTE.accent, fontStyle: "italic" }}>
                  own the tools it uses
                </em>{" "}
                — not rent them from companies that don&apos;t know a retwist
                from a gel overlay.&rdquo;
              </h2>

              <div
                className="space-y-5"
                style={{
                  fontFamily: '"Fraunces", serif',
                  fontWeight: 300,
                  fontSize: 19,
                  lineHeight: 1.7,
                }}
              >
                <p className="max-w-xl">
                  My name is Halania. I&apos;m the founder of OYRB. I spent
                  twelve years as a nail artist and salon owner in Georgia
                  before stepping away to build the platform our industry
                  deserved.
                </p>
                <p className="max-w-xl">
                  I built it because I believe every beauty pro deserves
                  software that{" "}
                  <em style={{ color: PALETTE.accent, fontStyle: "italic" }}>
                    respects the craft
                  </em>{" "}
                  as much as the craft respects the client. Because I lived
                  both sides — the chair and the business — and I watched too
                  many talented friends and salon owners give hundreds of
                  dollars a month to apps that took more than they gave back.
                </p>
                <p className="max-w-xl">
                  And if you&apos;ve been reading this thinking{" "}
                  <em style={{ fontStyle: "italic" }}>
                    &ldquo;I want this for myself, but I don&apos;t know if
                    I&apos;m ready&rdquo;
                  </em>{" "}
                  — I need you to hear something.{" "}
                  <strong>
                    You are not behind. You are exactly on time.
                  </strong>
                </p>
                <p className="max-w-xl">
                  Every founder I admire was once where you are now. Every
                  booked-out beauty pro started with one client. The
                  difference between the ones who make it and the ones who
                  don&apos;t isn&apos;t talent — it&apos;s consistency, and
                  the willingness to keep going on the days that feel heavy.
                </p>
                <p className="max-w-xl">
                  I built OYRB for the day you&apos;re ready. Whether
                  that&apos;s today, next month, or after you&apos;ve been
                  thinking about it for a year. The tools will be here when
                  you are.
                </p>
                <p className="max-w-xl">
                  If you ever need anything — setup help, a feature request, or
                  just to say hi — you can reach me directly. This is still a
                  small operation and I read every message.
                </p>
                <p className="max-w-xl italic">Thank you for being here.</p>
              </div>

              <div className="mt-11 flex flex-col gap-1.5">
                <span
                  className="text-[38px] italic leading-none"
                  style={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}
                >
                  — Halania
                </span>
                <span
                  className="text-[11px] uppercase tracking-[0.25em]"
                  style={{
                    color: PALETTE.mute,
                    fontFamily: '"Space Mono", monospace',
                  }}
                >
                  Founder · OYRB
                </span>
                <a
                  href="mailto:support@oyrb.space"
                  className="mt-2.5 w-fit text-base italic"
                  style={{
                    color: PALETTE.accent,
                    borderBottom: `1px solid ${PALETTE.accent}`,
                    fontFamily: '"Fraunces", serif',
                  }}
                >
                  support@oyrb.space
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLIENTS ── */}
      <section
        className="px-6 py-24"
        style={{ backgroundColor: PALETTE.sage }}
      >
        <div className="mx-auto max-w-[780px] text-center">
          <span
            className="mb-7 inline-block border-t pt-3.5 text-[11px] uppercase tracking-[0.25em]"
            style={{
              borderColor: PALETTE.ink,
              color: PALETTE.mute,
              fontFamily: '"Space Mono", monospace',
            }}
          >
            § 04 — For the clients
          </span>
          <h2
            className="mb-7 text-3xl leading-[1.05] tracking-[-0.02em] md:text-5xl"
            style={{ fontFamily: '"Fraunces", serif', fontWeight: 400 }}
          >
            If you&apos;re booking a service with a pro on OYRB —{" "}
            <em style={{ color: PALETTE.accent, fontStyle: "italic" }}>
              welcome.
            </em>
          </h2>
          <p
            className="mb-5 text-[17px] leading-[1.7]"
            style={{ color: PALETTE.ink }}
          >
            The experience is meant to feel as elevated as the service
            you&apos;re paying for. Browse, pick your time, pay your deposit,
            and show up. Clean, fast, mobile-first, built for real life.
          </p>
          <p
            className="mt-7 text-xl italic"
            style={{
              fontFamily: '"Fraunces", serif',
              color: PALETTE.ink,
            }}
          >
            Every OYRB site is run by an independent beauty professional who
            owns their brand, their pricing, their policies, and their time.
            When you book, you&apos;re supporting their business directly.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="px-6 py-32 text-center md:py-36"
        style={{ backgroundColor: PALETTE.cream }}
      >
        <div className="mx-auto max-w-[1200px]">
          <h2
            className="mb-12 text-5xl leading-none tracking-[-0.03em] md:text-7xl lg:text-[96px]"
            style={{ fontFamily: '"Fraunces", serif', fontWeight: 400 }}
          >
            Ready to{" "}
            <em style={{ color: PALETTE.accent, fontStyle: "italic" }}>
              own your brand?
            </em>
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-[15px] font-medium transition-transform hover:-translate-y-0.5"
              style={{
                backgroundColor: PALETTE.ink,
                color: PALETTE.cream,
              }}
            >
              Start your site <ArrowRight size={14} />
            </Link>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2.5 rounded-full border px-9 py-4 text-[15px] font-medium transition-transform hover:-translate-y-0.5"
              style={{
                borderColor: PALETTE.ink,
                color: PALETTE.ink,
                backgroundColor: "transparent",
              }}
            >
              Browse templates
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
