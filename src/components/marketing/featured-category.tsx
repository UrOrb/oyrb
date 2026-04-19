"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Search, Sparkles, X, Star } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { FeaturedBusiness } from "@/app/api/featured/route";

const SERVICE_LABELS: Record<string, string> = {
  hair: "Hair styling",
  nails: "Nail artist",
  lashes: "Lash & brow",
  barber: "Barber",
  skincare: "Esthetician",
  makeup: "Makeup artist",
};

// Deterministic pseudo-random rating 4.2–5.0 per business ID, stable across reloads.
// Weighted toward the high end since this is a "featured" list.
function ratingFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  const frac = Math.abs(h) % 800; // 0–799
  const r = 4.2 + frac / 1000; // 4.200–4.999
  return Math.round(r * 10) / 10;
}

function reviewCountFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 37 + id.charCodeAt(i)) & 0xffffffff;
  }
  return 18 + (Math.abs(h) % 140); // 18–157
}

const TIER_LABELS: Record<string, string> = {
  scale: "Scale",
  studio: "Studio",
  starter: "Starter",
};

// Rotating gradient accents for cards (no photos needed yet)
const CARD_GRADIENTS = [
  "from-[#D9B5A4] to-[#B8896B]",
  "from-[#C9A35B] to-[#8B6914]",
  "from-[#C6FF3D] to-[#7DB012]",
  "from-[#A8C4D0] to-[#5A8FA0]",
  "from-[#D4A8C4] to-[#9A5A8A]",
  "from-[#C4D4A8] to-[#7A9A5A]",
];

function gradientForIndex(i: number) {
  return CARD_GRADIENTS[i % CARD_GRADIENTS.length];
}

function BusinessCard({
  biz,
  index,
}: {
  biz: FeaturedBusiness;
  index: number;
}) {
  const initials = biz.business_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const href = biz.is_fake ? "/signup" : `/s/${biz.slug}`;
  const locationLabel = [biz.city, biz.state].filter(Boolean).join(", ");
  const serviceLabel =
    (biz.service_category && SERVICE_LABELS[biz.service_category]) ??
    biz.service_category ??
    "Beauty services";
  const rating = ratingFor(biz.id);
  const reviewCount = reviewCountFor(biz.id);

  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 rounded-xl border border-[#E7E5E4] bg-white p-5 text-center transition-all hover:-translate-y-0.5 hover:border-[#B8896B] hover:shadow-md"
    >
      {/* Circle avatar — whole circle enlarges on hover */}
      <div className="relative mb-1 transition-transform duration-300 ease-out group-hover:scale-125">
        <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white shadow-md ring-2 ring-[#E7E5E4]">
          {biz.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={biz.avatar_url}
              alt={biz.business_name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className={`flex h-full items-center justify-center bg-gradient-to-br ${gradientForIndex(index)}`}>
              <span className="font-display text-lg font-semibold text-white/95">{initials}</span>
            </div>
          )}
        </div>

        {/* Featured star badge */}
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#B8896B] shadow-sm">
          <Sparkles size={11} className="text-white" />
        </span>
      </div>

      {/* Business name */}
      <p className="mt-1 truncate w-full text-sm font-semibold text-[#0A0A0A]">
        {biz.business_name}
      </p>

      {/* Service + location */}
      <p className="text-xs text-[#737373]">{serviceLabel}</p>
      {locationLabel && (
        <p className="flex items-center justify-center gap-1 text-xs text-[#737373]">
          <MapPin size={10} className="shrink-0" /> {locationLabel}
        </p>
      )}

      {/* Star rating */}
      <div className="mt-1 flex items-center gap-1">
        <div className="flex">
          {[...Array(5)].map((_, i) => {
            const filled = i < Math.floor(rating);
            const half = i === Math.floor(rating) && rating % 1 !== 0;
            return (
              <Star
                key={i}
                size={12}
                className={filled || half ? "text-[#B8896B]" : "text-[#E7E5E4]"}
                fill={filled ? "#B8896B" : half ? "url(#halfstar)" : "none"}
                strokeWidth={1.5}
              />
            );
          })}
        </div>
        <span className="text-xs font-medium text-[#525252]">{rating.toFixed(1)}</span>
        <span className="text-[10px] text-[#A3A3A3]">({reviewCount})</span>
      </div>
    </Link>
  );
}

function LocationLabel({
  level,
  city,
  state,
}: {
  level: "city" | "state" | "nationwide";
  city: string | null;
  state: string | null;
}) {
  if (level === "city" && city)
    return (
      <span>
        Featured pros near <strong>{city}</strong>
      </span>
    );
  if (level === "state" && state)
    return (
      <span>
        Featured pros across <strong>{state}</strong>
      </span>
    );
  return <span>Featured pros nationwide</span>;
}

function ManualLocationForm({
  onSubmit,
}: {
  onSubmit: (city: string, state: string) => void;
}) {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (city.trim() || state.trim()) {
          onSubmit(city.trim(), state.trim());
        }
      }}
    >
      <input
        type="text"
        placeholder="City (e.g. Atlanta)"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="flex-1 rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#B8896B] focus:outline-none"
      />
      <input
        type="text"
        placeholder="State (e.g. Georgia)"
        value={state}
        onChange={(e) => setState(e.target.value)}
        className="flex-1 rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#B8896B] focus:outline-none"
      />
      <button
        type="submit"
        className="flex items-center justify-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
      >
        <Search size={13} /> Search
      </button>
    </form>
  );
}

function SkeletonCards() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2 rounded-xl border border-[#E7E5E4] bg-white p-5 text-center"
        >
          <div className="h-20 w-20 animate-pulse rounded-full bg-[#F5F5F4]" />
          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-[#F5F5F4]" />
          <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#F5F5F4]" />
          <div className="h-2.5 w-2/3 animate-pulse rounded bg-[#F5F5F4]" />
        </div>
      ))}
    </>
  );
}

export function FeaturedCategory() {
  const { city, state, loading: geoLoading, error: geoError, manualMode, setManualLocation } =
    useGeolocation();

  const [results, setResults] = useState<FeaturedBusiness[]>([]);
  const [level, setLevel] = useState<"city" | "state" | "nationwide" | null>(null);
  const [fetching, setFetching] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // Fetch featured businesses whenever location resolves.
  // Even without a city/state, fetch nationwide so the section always populates.
  useEffect(() => {
    if (geoLoading) return;

    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (state) params.set("state", state);

    setFetching(true);
    fetch(`/api/featured?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results ?? []);
        setLevel(data.level ?? "nationwide");
      })
      .catch(() => {
        setResults([]);
      })
      .finally(() => setFetching(false));
  }, [city, state, geoLoading]);

  // Show manual form if geolocation fails
  useEffect(() => {
    if (manualMode) setShowManual(true);
  }, [manualMode]);

  const isLoading = geoLoading || fetching;
  const hasResults = results.length > 0;

  return (
    <section className="border-t border-[#E7E5E4] bg-[#FAFAF9] py-24 md:py-32">
      <div className="mx-auto max-w-[1200px] px-6">

        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-[#B8896B]">
              <Sparkles size={13} /> Featured in your area
            </p>
            <h2 className="font-display mt-3 text-3xl font-medium tracking-[-0.02em] md:text-5xl">
              {!isLoading && level && city ? (
                <LocationLabel level={level} city={city} state={state} />
              ) : (
                "Discover local beauty pros."
              )}
            </h2>
            <p className="mt-3 max-w-lg text-sm text-[#737373]">
              New businesses are featured for their first 30 days — book early and support local.
            </p>
          </div>

          {/* Change location button */}
          <button
            onClick={() => setShowManual((v) => !v)}
            className="mt-4 flex items-center gap-1.5 self-start rounded-md border border-[#E7E5E4] px-4 py-2 text-sm font-medium text-[#525252] transition-colors hover:bg-[#F5F5F4] md:mt-0 md:self-auto"
          >
            <MapPin size={13} />
            {showManual ? (
              <>
                Cancel <X size={12} />
              </>
            ) : (
              `Change location`
            )}
          </button>
        </div>

        {/* Manual location form */}
        {showManual && (
          <div className="mt-6">
            <ManualLocationForm
              onSubmit={(c, s) => {
                setManualLocation(c, s);
                setShowManual(false);
              }}
            />
          </div>
        )}

        {/* Location permission prompt */}
        {geoError && !showManual && (
          <p className="mt-4 text-sm text-[#737373]">
            {geoError}{" "}
            <button
              onClick={() => setShowManual(true)}
              className="font-medium text-[#B8896B] underline-offset-2 hover:underline"
            >
              Enter your city manually
            </button>
          </p>
        )}

        {/* Grid */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {isLoading ? (
            <SkeletonCards />
          ) : hasResults ? (
            results.slice(0, 5).map((biz, i) => (
              <BusinessCard key={biz.id} biz={biz} index={i} />
            ))
          ) : (
            <div className="col-span-2 rounded-xl border border-dashed border-[#E7E5E4] p-10 text-center md:col-span-4">
              <p className="text-sm text-[#737373]">
                No featured businesses in this area yet.
              </p>
              <p className="mt-1 text-xs text-[#A3A3A3]">
                New sign-ups are automatically featured for 30 days —{" "}
                <Link href="/signup" className="font-medium text-[#B8896B] hover:underline">
                  be the first in your city
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
