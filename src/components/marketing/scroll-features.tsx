"use client";

import Image from "next/image";

const FEATURES = [
  {
    id: "booking",
    number: "01",
    label: "Booking",
    heading: "Your schedule, running itself.",
    body: "Clients book directly from your site — any time, any device. Set your hours, block time off, add buffers between appointments. No more back-and-forth texts.",
    image: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/feature-01-1776535251.jpg",
    alt: "Close-up of eyelashes with extensions applied",
  },
  {
    id: "site",
    number: "02",
    label: "Your Site",
    heading: "A booking site that actually looks like your brand.",
    body: "Choose from three editor-designed templates built for beauty pros. Go live in under 10 minutes — no designer, no developer needed.",
    image: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/feature-02-1776535534.jpg",
    alt: "Barber giving a fresh fade haircut",
  },
  {
    id: "payments",
    number: "03",
    label: "Payments",
    heading: "Collect deposits. Get paid instantly.",
    body: "Require deposits at booking to protect your time. All major cards, Apple Pay, Google Pay — funds land in your bank directly. We never touch your money.",
    image: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/feature-03-1776535927.jpg",
    alt: "Payment at salon counter",
  },
  {
    id: "clients",
    number: "04",
    label: "Clients",
    heading: "Every client. Every detail. One place.",
    body: "Automatic booking history, spend totals, notes, and contact info for every client. Know who's coming in before they walk through the door.",
    image: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/feature-04-1776535708.jpg",
    alt: "Woman relaxing at spa with face mask",
  },
];

function resolveSrc(val: string) {
  return val.startsWith("http")
    ? val
    : `https://images.unsplash.com/photo-${val}?auto=format&fit=crop&w=800&q=80`;
}

export function ScrollFeatures() {
  return (
    <section className="border-t border-[#E7E5E4] bg-[#FFFFFF]">
      <div className="mx-auto max-w-[1200px] px-6">
        {/* Section header */}
        <div className="pb-10 pt-24 text-center md:pb-16 md:text-left">
          <p className="text-sm font-medium text-[#B8896B]">How it works</p>
          <h2 className="font-display mt-3 text-3xl font-medium tracking-[-0.02em] md:text-5xl">
            One system that runs your business.
          </h2>
        </div>

        {/* Each feature is its own side-by-side block */}
        <div className="flex flex-col gap-24 pb-24 md:gap-32">
          {FEATURES.map((f, i) => {
            const imageFirst = i % 2 === 0; // alternate sides on desktop
            return (
              <article
                key={f.id}
                className="grid items-center gap-8 md:grid-cols-2 md:gap-16"
              >
                {/* Image */}
                <div
                  className={`relative aspect-[4/5] w-full overflow-hidden rounded-2xl md:aspect-square ${
                    imageFirst ? "md:order-1" : "md:order-2"
                  }`}
                >
                  <Image
                    src={resolveSrc(f.image)}
                    alt={f.alt}
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 600px"
                    priority={i === 0}
                  />
                  {/* Number + label badge */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 backdrop-blur-sm md:bottom-6 md:left-6">
                    <span className="text-xs font-medium text-[#B8896B]">
                      {f.number}
                    </span>
                    <span className="text-xs font-medium text-[#0A0A0A]">
                      {f.label}
                    </span>
                  </div>
                </div>

                {/* Text */}
                <div
                  className={`${imageFirst ? "md:order-2" : "md:order-1"}`}
                >
                  <p className="text-sm font-medium text-[#B8896B]">
                    {f.number} — {f.label}
                  </p>
                  <h3 className="font-display mt-3 text-2xl font-medium leading-tight tracking-[-0.02em] md:text-4xl">
                    {f.heading}
                  </h3>
                  <p className="mt-4 leading-relaxed text-[#525252] md:text-lg">
                    {f.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
