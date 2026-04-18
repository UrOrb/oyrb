"use client";

import { useState } from "react";
import Image from "next/image";

const CATEGORIES = [
  {
    id: "hair",
    label: "Hair",
    images: [
      { id: "1522337360426-a1af4b2b9f90", alt: "Black woman with stunning natural hair in salon", aspect: "tall" },
      { id: "1519699047748-de8e457a634e", alt: "Braiding close-up on dark hair", aspect: "square" },
      { id: "1560399465-a34fcba35f01", alt: "Professional styling tools and products", aspect: "square" },
    ],
  },
  {
    id: "nails",
    label: "Nails",
    images: [
      { id: "1604654892610-58a48e1e2b68", alt: "Detailed nail art on brown skin", aspect: "tall" },
      { id: "1560066984-138daab7b9dd", alt: "Latina nail technician at work", aspect: "square" },
      { id: "1604654892610-58a48e1e2b68", alt: "Colorful nail polish collection", aspect: "square" },
    ],
  },
  {
    id: "lashes",
    label: "Lashes",
    images: [
      { id: "1603217040831-61fa3e3e1cd8", alt: "Close-up of lash extension application", aspect: "tall" },
      { id: "1531746020798-e6953c6e8e04", alt: "Client relaxing during lash appointment", aspect: "square" },
      { id: "1586457133-7be3f27da7a2", alt: "Beautiful lash extension result", aspect: "square" },
    ],
  },
  {
    id: "brows",
    label: "Brows",
    images: [
      { id: "1622115166-bbc5c7aff475", alt: "Brow mapping on diverse client", aspect: "tall" },
      { id: "1594744803329-f9d9e2a0fc63", alt: "Microblading close-up on darker skin tone", aspect: "square" },
      { id: "1596178065579-4ca8d41bc8a1", alt: "Brow tinting tools and products", aspect: "square" },
    ],
  },
  {
    id: "skin",
    label: "Skin",
    images: [
      { id: "1542838132-92c53300491e", alt: "Esthetician giving facial to Black woman", aspect: "tall" },
      { id: "1523264653568-d3c4b01e2e74", alt: "Glowing skin close-up on dark complexion", aspect: "square" },
      { id: "1609207811348-a1a19a9c3e8a", alt: "Skincare products arranged on clean surface", aspect: "square" },
    ],
  },
  {
    id: "mua",
    label: "MUA",
    images: [
      { id: "1512910728885-b8b5e76e1ad9", alt: "Makeup artist working on diverse client", aspect: "tall" },
      { id: "1595476589549-f6a1e0cee8d5", alt: "Bold makeup look on brown skin", aspect: "square" },
      { id: "1522337360426-a1af4b2b9f90", alt: "Professional makeup brush collection", aspect: "square" },
    ],
  },
];

export function ServiceCategories() {
  const [active, setActive] = useState(0);
  const cat = CATEGORIES[active];

  return (
    <section className="border-t border-[#E7E5E4] py-24 md:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <p className="text-sm font-medium text-[#B8896B]">Built for every beauty professional</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="font-display text-3xl font-medium tracking-[-0.02em] md:text-5xl">
            Powering appointments across
            <br className="hidden md:block" /> every specialty.
          </h2>
        </div>

        {/* Category tabs */}
        <div className="mt-10 flex flex-wrap gap-2">
          {CATEGORIES.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setActive(i)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                active === i
                  ? "bg-[#0A0A0A] text-white"
                  : "border border-[#E7E5E4] text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Image grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {/* Tall left image */}
          <div className="relative row-span-2 overflow-hidden rounded-xl">
            <div className="relative h-full min-h-[320px] md:min-h-[480px]">
              <Image
                key={`${cat.id}-0`}
                src={`https://images.unsplash.com/photo-${cat.images[0].id}?auto=format&fit=crop&w=600&q=80`}
                alt={cat.images[0].alt}
                fill
                className="object-cover transition-opacity duration-500"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
          </div>

          {/* Two square images stacked right */}
          <div className="relative aspect-square overflow-hidden rounded-xl md:col-start-2">
            <Image
              key={`${cat.id}-1`}
              src={`https://images.unsplash.com/photo-${cat.images[1].id}?auto=format&fit=crop&w=600&q=80`}
              alt={cat.images[1].alt}
              fill
              className="object-cover transition-opacity duration-500"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </div>
          <div className="relative aspect-square overflow-hidden rounded-xl md:col-start-2">
            <Image
              key={`${cat.id}-2`}
              src={`https://images.unsplash.com/photo-${cat.images[2].id}?auto=format&fit=crop&w=600&q=80`}
              alt={cat.images[2].alt}
              fill
              className="object-cover transition-opacity duration-500"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </div>

          {/* Third column — large on desktop */}
          <div className="relative col-span-2 aspect-video overflow-hidden rounded-xl md:col-span-1 md:row-span-2 md:aspect-auto">
            <Image
              key={`${cat.id}-wide`}
              src={`https://images.unsplash.com/photo-${cat.images[0].id}?auto=format&fit=crop&w=800&q=80&crop=right`}
              alt={cat.images[0].alt}
              fill
              className="object-cover transition-opacity duration-500"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            {/* Category label overlay */}
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/40 to-transparent p-6">
              <span className="font-display text-2xl font-medium text-white">
                {cat.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
