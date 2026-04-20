import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { getPublicListingBySlug } from "@/lib/directory";
import { ReportListingButton } from "./report-button";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const listing = await getPublicListingBySlug(slug);
  if (!listing) return { title: "Listing not found — OYRB" };
  const title = `${listing.businessName ?? "Beauty Pro"} — OYRB Directory`;
  return {
    title,
    description: listing.bio ?? `Find ${listing.businessName ?? "beauty pros"} on OYRB.`,
    // Critical: noindex unless the pro explicitly opted in to indexing.
    robots: listing.allowIndexing ? undefined : { index: false, follow: false },
  };
}

export default async function PublicListingPage({ params }: Props) {
  const { slug } = await params;
  const listing = await getPublicListingBySlug(slug);
  if (!listing) notFound();

  // JSON-LD LocalBusiness schema — only emitted for fully-indexable listings.
  const jsonLd =
    listing.allowIndexing && listing.businessName
      ? {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: listing.businessName,
          ...(listing.city && {
            address: {
              "@type": "PostalAddress",
              addressLocality: listing.city,
              ...(listing.state && { addressRegion: listing.state }),
            },
          }),
          ...(listing.bookingUrl && { url: listing.bookingUrl }),
          ...(listing.specialties && { knowsAbout: listing.specialties }),
          ...(listing.priceRange && { priceRange: listing.priceRange }),
        }
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF8]">
      <Nav />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="mb-6">
          <Link href="/find" className="text-xs text-[#B8896B] hover:underline">
            ← Back to directory
          </Link>
        </div>

        <div className="rounded-lg border border-[#E7E5E4] bg-white p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              {listing.avatarUrl && (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white bg-[#F5EDE4] shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={listing.avatarUrl}
                    alt={listing.businessName ?? "Profile photo"}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-[#0A0A0A]">
                  {listing.businessName ?? "Beauty Pro"}
                </h1>
                {listing.profession && (
                  <p className="mt-1 text-sm text-[#0A0A0A]">{listing.profession}</p>
                )}
                {listing.city && (
                  <p className="mt-0.5 text-xs text-[#737373]">
                    {listing.city}
                    {listing.state && `, ${listing.state}`}
                  </p>
                )}
              </div>
            </div>
            {listing.priceRange && (
              <span className="rounded-full border border-[#E7E5E4] bg-[#F5F5F4] px-2 py-0.5 text-[11px] font-semibold text-[#525252]">
                {listing.priceRange}
              </span>
            )}
          </div>

          {/* Badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            {listing.acceptingClients === true && (
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-medium text-green-700">
                Accepting new clients
              </span>
            )}
            {listing.acceptingClients === false && (
              <span className="rounded-full bg-[#F5F5F4] px-2.5 py-0.5 text-[11px] font-medium text-[#737373]">
                Not currently accepting new clients
              </span>
            )}
          </div>

          {/* Specialties */}
          {listing.specialties && listing.specialties.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
                Specialties
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {listing.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-[#E7E5E4] px-2.5 py-0.5 text-xs text-[#525252]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {listing.bio && (
            <p className="mt-6 text-sm leading-relaxed text-[#0A0A0A]">{listing.bio}</p>
          )}

          {/* CTA row */}
          <div className="mt-8 flex flex-wrap gap-2">
            {listing.bookingUrl && (
              <Link
                href={listing.bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:opacity-85"
              >
                Book a session →
              </Link>
            )}
            {listing.fullSiteUrl && listing.fullSiteUrl !== listing.bookingUrl && (
              <Link
                href={listing.fullSiteUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#F5F5F4]"
              >
                Visit full site →
              </Link>
            )}
            {listing.instagramHandle && (
              <a
                href={`https://instagram.com/${listing.instagramHandle}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#F5F5F4]"
              >
                @{listing.instagramHandle} on IG
              </a>
            )}
            {listing.tiktokHandle && (
              <a
                href={`https://tiktok.com/@${listing.tiktokHandle}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#F5F5F4]"
              >
                @{listing.tiktokHandle} on TikTok
              </a>
            )}
          </div>

          {/* Gallery — rendered only when the pro enabled it. Here we show
              placeholders; a real gallery would pull from the business's
              public storage bucket. Kept minimal to avoid shipping PII. */}
          {listing.gallery && listing.gallery.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {listing.gallery.slice(0, 4).map((url, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-md bg-[#F5F5F4]"
                  style={{
                    backgroundImage: `url(${url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  aria-label="Gallery preview"
                />
              ))}
            </div>
          )}

          {/* Report */}
          <div className="mt-8 border-t border-[#E7E5E4] pt-4">
            <ReportListingButton listingUserIdSlug={listing.slug} />
          </div>
        </div>
      </main>

      <Footer />

      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </div>
  );
}
