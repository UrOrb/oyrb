import Link from "next/link";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { searchPublicListings, getRecentListings } from "@/lib/directory";
import type { PublicListing } from "@/lib/directory";
import { AvatarCarousel } from "@/components/directory/avatar-carousel";

export const metadata = {
  title: "Find beauty pros — OYRB",
  description:
    "Discover beauty pros on OYRB, in your city or anywhere. Every listing is opt-in — no emails or phone numbers are shown publicly.",
};

// Revalidate often so delistings propagate within minutes. Kept lean:
// search results are public, no per-visitor personalization.
export const revalidate = 60;

// Browse-by-field chips. Stays small + minimal per the brief — the
// avatar carousel is the star of the page.
const FIELDS: { label: string; value: string }[] = [
  { label: "Hair",         value: "hair" },
  { label: "Nails",        value: "nails" },
  { label: "Lashes",       value: "lashes" },
  { label: "Brows",        value: "brows" },
  { label: "MUA",          value: "makeup" },
  { label: "Esthetician",  value: "skincare" },
  { label: "Barber",       value: "barber" },
  { label: "Medical Spa",  value: "medical-spa" },
];

type Props = {
  searchParams: Promise<{ city?: string; specialty?: string; field?: string }>;
};

function shuffle<T>(arr: T[]): T[] {
  // Stable-random rotation for the hero carousel — reruns every ISR cycle
  // so different pros surface first across requests.
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default async function FindPage({ searchParams }: Props) {
  const params = await searchParams;
  const city = (params.city ?? "").trim();
  const specialty = (params.specialty ?? params.field ?? "").trim();
  const hasFilters = !!city || !!specialty;

  // Pull everything we need in parallel.
  const [allListings, recentListings] = await Promise.all([
    searchPublicListings({ city, specialty, limit: 100 }),
    getRecentListings(8),
  ]);

  // Hero carousel = shuffled slice so different pros rotate in the
  // lead slot across ISR cycles. Only pros with avatars enabled show
  // here — AvatarCard handles an initials fallback if avatarUrl is null.
  const carouselPool = hasFilters ? allListings : allListings;
  const heroSet = shuffle(carouselPool).slice(0, 30);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF8]">
      <Nav />

      {/* ── Hero ── Homepage-inspired aesthetic: centered kicker + big
            Fraunces heading + muted subhead. Same color palette as the
            marketing homepage. Simpler, since the focus below is the
            carousel of real pros. */}
      <section className="border-b border-[#E7E5E4] bg-white px-6 pb-6 pt-16 text-center md:pt-20">
        <p className="text-xs font-medium uppercase tracking-widest text-[#B8896B]">
          OYRB Directory
        </p>
        <h1 className="font-display mt-3 text-4xl font-medium tracking-[-0.02em] text-[#0A0A0A] md:text-6xl">
          Find your beauty pro.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm text-[#525252] md:text-base">
          Discover beauty pros on OYRB, in your city or anywhere. Every pro
          chose exactly what appears here — no emails, no phone numbers, no
          tracking.
        </p>

        {/* Avatar carousel — hero moment */}
        <div className="mx-auto mt-10 max-w-[1200px]">
          <AvatarCarousel listings={heroSet} />
        </div>
      </section>

      {/* ── Search + filters ── */}
      <section className="border-b border-[#E7E5E4] bg-white px-6 py-8">
        <form method="GET" className="mx-auto flex max-w-3xl flex-wrap items-stretch gap-2">
          <input
            type="text"
            name="city"
            defaultValue={city}
            placeholder="Search by city or name"
            aria-label="Search by city or name"
            className="flex-1 min-w-0 rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-sm placeholder:text-[#A3A3A3]"
          />
          {/* Hidden honeypot — bots tend to fill every field; real users
              leave this alone. Submissions with a non-empty honeypot are
              silently ignored in the route handler. */}
          <input
            type="text"
            name="hp"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
          <button
            type="submit"
            className="rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-medium text-white hover:opacity-85"
          >
            Search
          </button>
        </form>

        <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-1.5">
          <Link
            href="/find"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              !specialty
                ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                : "border-[#E7E5E4] bg-white text-[#525252] hover:bg-[#F5F5F4]"
            }`}
          >
            All
          </Link>
          {FIELDS.map((f) => {
            const active = specialty === f.value;
            const search = new URLSearchParams();
            search.set("specialty", f.value);
            if (city) search.set("city", city);
            return (
              <Link
                key={f.value}
                href={`/find?${search.toString()}`}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                    : "border-[#E7E5E4] bg-white text-[#525252] hover:bg-[#F5F5F4]"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Results grid ── */}
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12">
        {allListings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#E7E5E4] bg-white p-10 text-center">
            <p className="font-display text-xl text-[#0A0A0A]">
              No pros match those filters yet — try broadening your search.
            </p>
            <p className="mt-2 text-sm text-[#737373]">
              Or{" "}
              <Link href="/find" className="underline">
                browse all
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-baseline justify-between gap-3">
              <p className="text-xs text-[#737373]">
                {allListings.length} pro{allListings.length === 1 ? "" : "s"} listed
              </p>
              {hasFilters && (
                <Link href="/find" className="text-xs text-[#B8896B] hover:underline">
                  Clear filters
                </Link>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allListings.map((l) => (
                <ListingCard key={l.slug} listing={l} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Recently joined ── secondary */}
      {recentListings.length > 0 && (
        <section className="border-t border-[#E7E5E4] bg-white px-6 py-10">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-medium tracking-[-0.02em] text-[#0A0A0A]">
                Recently joined
              </h2>
              <Link href="/dashboard/directory" className="text-xs text-[#B8896B] hover:underline">
                Join the directory →
              </Link>
            </div>
            <AvatarCarousel listings={recentListings} autoScroll={false} />
          </div>
        </section>
      )}

      {/* ── Privacy footer notice ── */}
      <div className="border-t border-[#E7E5E4] bg-[#F5F5F4] px-6 py-5 text-center text-[11px] text-[#737373]">
        <p>
          The OYRB directory is listing-only. We don&apos;t track visitors, we
          don&apos;t set marketing cookies, and we never ask for your email. Each
          listed pro chose exactly what info appears here.{" "}
          <Link href="/privacy" className="underline">
            Privacy policy
          </Link>
          .
        </p>
      </div>

      <Footer />
    </div>
  );
}

function ListingCard({ listing }: { listing: PublicListing }) {
  const name = listing.businessName ?? "Beauty Pro";
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <Link
      href={`/find/${listing.slug}`}
      className="group flex flex-col gap-3 rounded-lg border border-[#E7E5E4] bg-white p-5 transition-colors hover:border-[#B8896B]"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white bg-[#F5EDE4]">
          {listing.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-medium text-[#B8896B]">
              {initial}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-medium text-[#0A0A0A] group-hover:underline">
            {name}
          </p>
          {listing.profession && (
            <p className="mt-0.5 text-xs text-[#737373]">{listing.profession}</p>
          )}
          {listing.city && (
            <p className="mt-0.5 text-xs text-[#737373]">
              {listing.city}
              {listing.state && `, ${listing.state}`}
            </p>
          )}
        </div>
        {listing.priceRange && (
          <span className="rounded-full border border-[#E7E5E4] bg-[#F5F5F4] px-2 py-0.5 text-[10px] font-semibold text-[#525252]">
            {listing.priceRange}
          </span>
        )}
      </div>
      {listing.specialties && listing.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {listing.specialties.slice(0, 4).map((s) => (
            <span
              key={s}
              className="rounded-full border border-[#E7E5E4] px-2 py-0.5 text-[10px] text-[#525252]"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {listing.bio && (
        <p className="line-clamp-2 text-xs leading-relaxed text-[#525252]">{listing.bio}</p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 text-[11px]">
        <span className="text-[#B8896B]">View listing →</span>
        {listing.acceptingClients === true && (
          <span className="font-medium text-green-700">Accepting new clients</span>
        )}
      </div>
    </Link>
  );
}
