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

export default async function DirectoryDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listing = await getMyListing(user.id);
  const agreementAccepted =
    listing?.agreement_version === DIRECTORY_AGREEMENT_VERSION;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Public directory
      </h1>
      <p className="mt-1 text-sm text-[#737373]">
        Help clients find you at <code className="text-[#0A0A0A]">oyrb.space/find</code>.
        Every field is opt-in — nothing is public until you flip it on.
      </p>

      {/* Stage 1 — Not accepted yet OR accepted an older agreement version */}
      {!agreementAccepted && (
        <div className="mt-8 rounded-lg border border-[#E7E5E4] bg-white p-6">
          <h2 className="text-base font-semibold">Before you go public</h2>
          <p className="mt-2 text-sm text-[#525252]">
            We need you to read + confirm these protections before you can be
            added to the directory. Plain language, no fine print.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-[#0A0A0A]">
            {DIRECTORY_AGREEMENT_TEXT.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 text-[#B8896B]">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
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
            <h2 className="text-base font-semibold">
              {listing?.is_listed ? "Edit your listing" : "Set up your listing"}
            </h2>
            <p className="mt-1 text-xs text-[#737373]">
              Pick a preset below or toggle each field individually. Nothing is
              saved until you hit Save, and nothing goes live until you hit
              Publish.
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
