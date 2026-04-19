"use client";

import Image from "next/image";

// Each category can use a full URL (uploaded to Supabase Storage) or an Unsplash ID
const unsplashUrl = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=500&q=80`;

const CATEGORIES = [
  {
    id: "hair",
    label: "Hair",
    src: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/hair-1776531705.jpg",
  },
  {
    id: "brows",
    label: "Brows",
    src: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/brows-1776532399.jpg",
  },
  {
    id: "nails",
    label: "Nails",
    src: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/nails-1776531946.jpg",
  },
  {
    id: "lashes",
    label: "Lashes",
    src: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/lashes-1776532085.jpg",
  },
  {
    id: "cuts",
    label: "Cuts",
    src: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/cuts-1776532624.jpg",
  },
  {
    id: "skin",
    label: "Skin",
    src: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/skin-1776532829.jpg",
  },
  {
    id: "makeup",
    label: "MUA",
    src: "https://hytwjzhgxybxobihqshd.supabase.co/storage/v1/object/public/photos/marketing/mua-1776532917.jpg",
  },
];

// Duplicate the list so the CSS keyframe loop never shows empty space.
const CAROUSEL_ITEMS = [...CATEGORIES, ...CATEGORIES, ...CATEGORIES];

export function ServiceCategories() {
  return (
    <section className="border-t border-[#E7E5E4] bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <p className="text-sm font-medium text-[#B8896B]">Built for every beauty professional</p>
        <h2 className="font-display mt-3 text-3xl font-medium tracking-[-0.02em] md:text-5xl">
          Powering appointments across
          <br className="hidden md:block" /> every specialty.
        </h2>
      </div>

      {/* Auto-scrolling carousel with edge fades */}
      <div
        className="relative mt-12 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <div className="flex w-max animate-oyrb-marquee gap-6 py-4">
          {CAROUSEL_ITEMS.map((cat, i) => (
            <div
              key={`${cat.id}-${i}`}
              className="flex w-44 flex-shrink-0 flex-col items-center gap-3 md:w-56"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
                <Image
                  src={cat.src}
                  alt={cat.label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 176px, 224px"
                />
              </div>
              <p className="font-display text-lg font-medium text-[#0A0A0A] md:text-xl">
                {cat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Keyframes are defined here so this component is self-contained.
          Named with an oyrb- prefix to avoid any global clash. */}
      <style jsx>{`
        @keyframes oyrb-marquee {
          from {
            transform: translateX(0);
          }
          to {
            /* Move by one copy of the list (CAROUSEL_ITEMS is 3x CATEGORIES,
               so one copy = 1/3 of the total width). */
            transform: translateX(calc(-100% / 3));
          }
        }
        :global(.animate-oyrb-marquee) {
          animation: oyrb-marquee 40s linear infinite;
        }
        :global(.animate-oyrb-marquee:hover) {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.animate-oyrb-marquee) {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
