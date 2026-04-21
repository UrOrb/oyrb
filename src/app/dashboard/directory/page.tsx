import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DIRECTORY_AGREEMENT_VERSION,
  DIRECTORY_AGREEMENT_TEXT,
  getMyListing,
} from "@/lib/directory";
import { AgreementForm } from "./agreement-form";
import { VisibilityForm } from "./visibility-form";
import { LiveControls } from "./live-controls";

export const metadata = { title: "Directory listing" };

type Props = { searchParams: Promise<{ start?: string }> };

export default async function DirectoryDashboardPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { start } = await searchParams;
  const listing = await getMyListing(user.id);
  const agreementAccepted =
    listing?.agreement_version === DIRECTORY_AGREEMENT_VERSION;

  // Stage 1 — Intro: shown first-time visitors who haven't signed an
  // agreement (or whose version is stale). They click "Get Started" to
  // continue to the agreement (?start=1).
  const showIntro = !agreementAccepted && start !== "1";

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Public directory
      </h1>
      <p className="mt-1 text-sm text-[#737373]">
        Help clients find you at <code className="text-[#0A0A0A]">oyrb.space/find</code>.
        Every field is opt-in — nothing is public until you flip it on.
      </p>

      {/* Stage 1 — Get Started intro */}
      {showIntro && (
        <div className="mt-8 rounded-lg border border-[#E7E5E4] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
            Step 1 of 5
          </p>
          <h2 className="mt-2 font-display text-xl font-medium">
            Get discovered by new clients.
          </h2>
          <p className="mt-2 text-sm text-[#525252]">
            List your profile on the public OYRB directory. Clients browse at{" "}
            <code className="text-[#0A0A0A]">oyrb.space/find</code>, filter by
            city + specialty, and book straight from your card.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-[#525252]">
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5 text-[#B8896B]">✓</span>
              Everything is opt-in — your listing shows nothing until you flip
              each toggle on.
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5 text-[#B8896B]">✓</span>
              No personal email, phone, or home address is ever displayed.
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5 text-[#B8896B]">✓</span>
              One-click delist; your page disappears from /find within 5 minutes.
            </li>
          </ul>
          <div className="mt-5 flex items-center gap-3">
            <Link
              href="/dashboard/settings"
              className="inline-flex rounded-md border border-[#E7E5E4] bg-white px-4 py-1.5 text-xs font-medium text-[#525252] hover:bg-[#F5F5F4]"
            >
              Not now
            </Link>
            <Link
              href="/dashboard/directory?start=1"
              className="inline-flex rounded-md bg-[#0A0A0A] px-4 py-1.5 text-xs font-medium text-white hover:opacity-85"
            >
              Get Started →
            </Link>
          </div>
        </div>
      )}

      {/* Stage 2 — Agreement (3 required checkboxes) */}
      {!agreementAccepted && !showIntro && (
        <div className="mt-8 rounded-lg border border-[#E7E5E4] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
            Step 2 of 5
          </p>
          <h2 className="mt-2 text-base font-semibold">Quick agreement</h2>
          <p className="mt-2 text-sm text-[#525252]">
            Plain language, no fine print. Tick all three to continue.
          </p>
          <details className="mt-4 rounded-md bg-[#FAFAF9] p-3 text-xs text-[#525252]">
            <summary className="cursor-pointer font-medium text-[#0A0A0A]">
              Full directory protections (for reference)
            </summary>
            <ul className="mt-3 space-y-1.5">
              {DIRECTORY_AGREEMENT_TEXT.map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-0.5 text-[#B8896B]">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </details>
          <AgreementForm version={DIRECTORY_AGREEMENT_VERSION} />
        </div>
      )}

      {/* Stage 2 — Accepted but not yet live, OR live (same form, just a
          different CTA label) */}
      {agreementAccepted && (
        <>
          {listing?.is_listed && (
            <LiveControls
              slug={listing.slug}
              reportCount={listing.report_count}
              isHiddenPendingReview={listing.is_hidden_pending_review}
            />
          )}
          <div className="mt-8 rounded-lg border border-[#E7E5E4] bg-white p-6">
            {!listing?.is_listed && (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
                Step 3 of 5 — Visibility · Step 4 — Preview · Step 5 — Publish
              </p>
            )}
            <h2 className="mt-2 text-base font-semibold">
              {listing?.is_listed ? "Edit your listing" : "Set up your listing"}
            </h2>
            <p className="mt-1 text-xs text-[#737373]">
              Pick a preset below or toggle each field individually. Every toggle
              starts OFF except your business name. A live preview updates as
              you change toggles — review it, then hit <strong>Save &amp; Publish</strong>.
            </p>
            <div className="mt-5">
              <VisibilityForm
                initial={{
                  show_avatar: !!listing?.show_avatar,
                  show_profession: !!listing?.show_profession,
                  show_city: !!listing?.show_city,
                  show_specialty_tags: !!listing?.show_specialty_tags,
                  show_bio: !!listing?.show_bio,
                  show_booking_link: !!listing?.show_booking_link,
                  show_instagram: !!listing?.show_instagram,
                  show_tiktok: !!listing?.show_tiktok,
                  show_full_site_link: !!listing?.show_full_site_link,
                  show_gallery: !!listing?.show_gallery,
                  show_accepting_clients: !!listing?.show_accepting_clients,
                  show_price_range: !!listing?.show_price_range,
                  allow_search_engine_indexing:
                    !!listing?.allow_search_engine_indexing,
                  profession: listing?.profession ?? "",
                  city: listing?.city ?? "",
                  state: listing?.state ?? "",
                  specialties: listing?.specialties ?? [],
                  bio: listing?.bio ?? "",
                  instagram_handle: listing?.instagram_handle ?? "",
                  tiktok_handle: listing?.tiktok_handle ?? "",
                  accepting_clients:
                    listing?.accepting_clients === null
                      ? true
                      : !!listing?.accepting_clients,
                  price_range:
                    (listing?.price_range as "$" | "$$" | "$$$" | null) ?? null,
                }}
                currentlyListed={!!listing?.is_listed}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
