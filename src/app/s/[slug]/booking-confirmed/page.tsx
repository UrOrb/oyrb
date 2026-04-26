import { Suspense } from "react";
import { BookingConfirmedClient } from "./client";

export const dynamic = "force-dynamic";

export default async function BookingConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string; acct?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sessionId = sp.session_id ?? "";
  // Connect: deposit-checkout puts the pro's acct_… on the success URL so
  // /confirm can retrieve the session from the right Stripe account.
  const acct = typeof sp.acct === "string" && sp.acct.startsWith("acct_") ? sp.acct : "";

  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-[#737373]">Confirming…</div>}>
      <BookingConfirmedClient slug={slug} sessionId={sessionId} connectedAccountId={acct} />
    </Suspense>
  );
}
