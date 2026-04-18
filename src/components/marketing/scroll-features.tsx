"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

const FEATURES = [
  {
    id: "booking",
    number: "01",
    label: "Booking",
    heading: "Your schedule, running itself.",
    body: "Clients book directly from your site — any time, any device. Set your hours, block time off, add buffers between appointments. No more back-and-forth texts.",
    image: "1522337360426-a1af4b2b9f90",
    alt: "Beauty professional reviewing her booking calendar",
  },
  {
    id: "site",
    number: "02",
    label: "Your Site",
    heading: "A booking site that actually looks like your brand.",
    body: "Choose from three editor-designed templates built for beauty pros. Go live in under 10 minutes — no designer, no developer needed.",
    image: "1560066984-138daab7b9dd",
    alt: "Nail technician showcasing beautifully styled nails",
  },
  {
    id: "payments",
    number: "03",
    label: "Payments",
    heading: "Collect deposits. Get paid instantly.",
    body: "Require deposits at booking to protect your time. All major cards, Apple Pay, Google Pay — funds land in your bank directly. We never touch your money.",
    image: "1522338242992-e1d3aeac3b4a",
    alt: "Beauty professional completing a client transaction",
  },
  {
    id: "clients",
    number: "04",
    label: "Clients",
    heading: "Every client. Every detail. One place.",
    body: "Automatic booking history, spend totals, notes, and contact info for every client. Know who's coming in before they walk through the door.",
    image: "1594744803329-f9d9e2a0fc63",
    alt: "Diverse beauty clients enjoying salon services",
  },
];

export function ScrollFeatures() {
  const [active, setActive] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = sectionRefs.current.map((ref, i) => {
      if (!ref) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(i);
        },
        { threshold: 0.5 }
      );
      observer.observe(ref);
      return observer;
    });

    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  return (
    <section className="border-t border-[#E7E5E4] bg-[#FFFFFF] py-24 md:py-0">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="pb-16 pt-24 text-center md:text-left">
          <p className="text-sm font-medium text-[#B8896B]">How it works</p>
          <h2 className="font-display mt-3 text-3xl font-medium tracking-[-0.02em] md:text-5xl">
            One system that runs your business.
          </h2>
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-16">
          {/* Sticky image — desktop */}
          <div className="hidden md:block">
            <div className="sticky top-24 pb-24">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl">
                {FEATURES.map((f, i) => (
                  <div
                    key={f.id}
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      active === i ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <Image
                      src={`https://images.unsplash.com/photo-${f.image}?auto=format&fit=crop&w=800&q=80`}
                      alt={f.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1200px) 50vw, 600px"
                    />
                  </div>
                ))}

                {/* Feature number overlay */}
                <div className="absolute bottom-6 left-6 flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 backdrop-blur-sm">
                  <span className="text-xs font-medium text-[#B8896B]">
                    {FEATURES[active].number}
                  </span>
                  <span className="text-xs font-medium text-[#0A0A0A]">
                    {FEATURES[active].label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrolling text */}
          <div className="flex flex-col">
            {FEATURES.map((f, i) => (
              <div
                key={f.id}
                ref={(el) => { sectionRefs.current[i] = el; }}
                className="py-16 md:py-24"
              >
                {/* Mobile image */}
                <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-xl md:hidden">
                  <Image
                    src={`https://images.unsplash.com/photo-${f.image}?auto=format&fit=crop&w=800&q=80`}
                    alt={f.alt}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                </div>

                <div
                  className={`transition-opacity duration-300 ${
                    active === i ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <p className="text-sm font-medium text-[#B8896B]">
                    {f.number} — {f.label}
                  </p>
                  <h3 className="font-display mt-3 text-2xl font-medium leading-tight tracking-[-0.02em] md:text-3xl">
                    {f.heading}
                  </h3>
                  <p className="mt-4 leading-relaxed text-[#525252]">{f.body}</p>
                </div>

                {i < FEATURES.length - 1 && (
                  <div className="mt-16 hidden h-px bg-[#E7E5E4] md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
