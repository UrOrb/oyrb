import { Suspense } from "react";
import { BookingConfirmedClient } from "./client";

export const dynamic = "force-dynamic";

export default async function BookingConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sessionId = sp.session_id ?? "";

  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-[#737373]">Confirming…</div>}>
      <BookingConfirmedClient slug={slug} sessionId={sessionId} />
    </Suspense>
  );
}
