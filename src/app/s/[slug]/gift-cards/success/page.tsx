import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { formatCents } from "@/lib/types";

export const metadata = {
  title: "Gift card purchased — OYRB",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

// Stripe redirects here on successful gift-card payment. We check the DB
// for the row first (webhook fast path) then fall back to retrieving the
// session from Stripe so a race with webhook doesn't leave the buyer
// staring at "processing" for ages.
export default async function GiftCardSuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { session_id } = await searchParams;

  if (!session_id) {
    return <NotFoundView />;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("gift_cards")
    .select("code, amount_cents, recipient_email, recipient_name, purchased_at")
    .eq("stripe_session_id", session_id)
    .maybeSingle();

  let code = data?.code ?? null;
  let amountCents = data?.amount_cents ?? null;
  let isPaid = !!data;

  if (!isPaid) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") {
        isPaid = true;
        amountCents = session.amount_total ?? null;
      }
    } catch (err) {
      console.error("Gift card session retrieve failed:", err);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-md rounded-2xl border border-[#E7E5E4] bg-white p-10 text-center shadow-sm">
        {isPaid ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <span aria-hidden className="text-3xl">✓</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Gift card purchased
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium">
              You&apos;re all set.
            </h1>
            {amountCents ? (
              <p className="mt-3 text-sm text-[#525252]">
                Payment of <strong>{formatCents(amountCents)}</strong> received.
              </p>
            ) : null}
            {code ? (
              <p className="mt-4 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] px-4 py-3 text-center font-mono text-sm">
                Code: <strong>{code}</strong>
              </p>
            ) : (
              <p className="mt-2 text-xs text-[#A3A3A3]">
                Your gift card code is being generated — check your email in
                a few seconds.
              </p>
            )}
            <p className="mt-4 text-xs text-[#A3A3A3]">
              A receipt has been emailed to you. Keep the code safe — use it
              when booking at checkout.
            </p>
            <Link
              href={`/s/${slug}`}
              className="mt-6 inline-block rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Back to site
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-medium">
              Still processing…
            </h1>
            <p className="mt-3 text-sm text-[#737373]">
              Your payment is being verified. Refresh in a few seconds or
              check your email — the gift card code will land there once
              Stripe confirms.
            </p>
            <Link
              href={`/s/${slug}`}
              className="mt-6 inline-block text-xs text-[#A3A3A3] underline"
            >
              Back to site
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium">Session not found</h1>
        <p className="mt-3 text-sm text-[#737373]">
          If your card was charged, check your email — your gift card will
          arrive there.
        </p>
      </div>
    </div>
  );
}
