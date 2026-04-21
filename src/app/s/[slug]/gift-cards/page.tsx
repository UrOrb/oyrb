import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { GiftCardForm } from "./form";

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
    .select("id, business_name, slug, is_published, contact_email, owner_id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!biz) notFound();

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

        <GiftCardForm slug={slug} businessName={biz.business_name} />

        <p className="mt-6 text-center text-[11px] text-[#A3A3A3]">
          Payment is secure via Stripe. Gift cards don&apos;t expire but are
          redeemable at <strong>{biz.business_name}</strong> only.
        </p>
      </div>
    </div>
  );
}
