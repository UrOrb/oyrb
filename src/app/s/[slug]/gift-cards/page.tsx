import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { GiftCardForm } from "./form";
import { clientPaymentsEnabled } from "@/lib/client-payments";
import { connectReady } from "@/lib/stripe-connect";

export const metadata = {
  title: "Gift cards — OYRB",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export default async function GiftCardsPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: biz } = await supabase
    .from("businesses")
    .select(
      "id, business_name, slug, is_published, contact_email, owner_id, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_onboarding_complete",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!biz) notFound();

  const paymentsOn = clientPaymentsEnabled();
  // Three states matter here:
  //   paymentsOn=false                   → kill-switch message (Phase 0)
  //   paymentsOn=true,  proConnectReady  → form (happy path)
  //   paymentsOn=true,  !proConnectReady → "this pro hasn't set this up"
  const proConnectReady = connectReady({
    stripe_connect_account_id: biz.stripe_connect_account_id,
    stripe_connect_charges_enabled: biz.stripe_connect_charges_enabled,
    stripe_connect_onboarding_complete: biz.stripe_connect_onboarding_complete,
  });

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 px-4">
      <div className="mx-auto max-w-md">
        <Link
          href={`/s/${slug}`}
          className="mb-6 inline-block text-xs text-[#737373] underline hover:text-[#0A0A0A]"
        >
          ← Back to {biz.business_name}
        </Link>
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
            Gift cards
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium">
            Give a treatment at {biz.business_name}
          </h1>
          <p className="mt-2 text-sm text-[#737373]">
            Send a gift card via email. The recipient gets a code to redeem
            during booking.
          </p>
        </div>

        {!paymentsOn ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">
              Coming soon
            </p>
            <h2 className="mt-2 font-display text-xl font-medium text-amber-950">
              Gift cards are paused
            </h2>
            <p className="mt-3 text-sm text-amber-900">
              We&apos;re upgrading how online payments are handled at{" "}
              <strong>{biz.business_name}</strong>. Gift cards will return
              once the new system is live. In the meantime, please contact
              the salon directly.
            </p>
          </div>
        ) : !proConnectReady ? (
          <div className="rounded-2xl border border-[#E7C9A8] bg-[#FBF4EC] p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7C5A3F]">
              Not available online
            </p>
            <h2 className="mt-2 font-display text-xl font-medium text-[#5A3F2A]">
              {biz.business_name} hasn&apos;t set up online gift cards yet
            </h2>
            <p className="mt-3 text-sm text-[#7C5A3F]">
              Reach out to the salon directly — they may be able to sell
              you a gift card in person or by phone.
            </p>
          </div>
        ) : (
          <>
            <GiftCardForm slug={slug} businessName={biz.business_name} />

            <p className="mt-6 text-center text-[11px] text-[#A3A3A3]">
              Payment is secure via Stripe. Gift cards don&apos;t expire but
              are redeemable at <strong>{biz.business_name}</strong> only.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
